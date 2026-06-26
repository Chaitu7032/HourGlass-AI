"use client";

import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import { completeUserOnboarding, ensureUserProfile } from "@/lib/firebase/user-profile";
import type { UserProfile } from "@/types";

const PROFILE_CACHE_PREFIX = "hourglass:profile:";
const PROFILE_BOOTSTRAP_TIMEOUT_MS = 1500;

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  profileStatus: "idle" | "loading" | "ready" | "error";
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (payload: { name: string; email: string; password: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  finishOnboarding: (payload: {
    displayName: string;
    primaryGoal: string;
    timezone: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncSessionCookie(user: User | null) {
  if (!user) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }

  const token = await user.getIdToken();
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

function getReadableError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong while authenticating.";
}

function getProfileCacheKey(uid: string) {
  return `${PROFILE_CACHE_PREFIX}${uid}`;
}

function buildFallbackProfile(user: User): UserProfile {
  const now = new Date().toISOString();
  return {
    id: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "Hourglass User",
    photoURL: user.photoURL ?? undefined,
    authProvider: user.providerData[0]?.providerId === "google.com" ? "google" : "password",
    commitmentScore: 0,
    onboardingComplete: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    primaryGoal: "",
    createdAt: now,
    updatedAt: now,
  };
}

function readCachedProfile(user: User): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getProfileCacheKey(user.uid));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      ...buildFallbackProfile(user),
      ...parsed,
      id: user.uid,
      email: parsed.email ?? user.email ?? "",
      displayName: parsed.displayName ?? user.displayName ?? "Hourglass User",
      photoURL: parsed.photoURL ?? user.photoURL ?? undefined,
    };
  } catch {
    return null;
  }
}

function cacheProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getProfileCacheKey(profile.id), JSON.stringify(profile));
  } catch {
    // Best-effort cache only.
  }
}

function clearProfileCache(uid?: string | null) {
  if (typeof window === "undefined") return;

  try {
    if (uid) {
      window.localStorage.removeItem(getProfileCacheKey(uid));
      return;
    }

    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(PROFILE_CACHE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Best-effort cache cleanup only.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const firebaseConfigured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [initialized, setInitialized] = useState(!firebaseConfigured);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(
    firebaseConfigured ? null : "Firebase is not configured. Add your public Firebase environment variables."
  );

  useEffect(() => {
    if (!firebaseConfigured) return;

    const auth = getFirebaseAuth();
    if (!auth) return;

    void setPersistence(auth, browserLocalPersistence).catch(() => undefined);

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setLoading(true);
      setError(null);

      try {
        setUser(nextUser);

        if (!nextUser) {
          clearProfileCache();
          setProfile(null);
          setProfileStatus("idle");
          setLoading(false);
          setInitialized(true);
          return;
        }

        const cachedProfile = readCachedProfile(nextUser);
        const fallbackProfile = cachedProfile ?? buildFallbackProfile(nextUser);
        setProfile(fallbackProfile);
        setProfileStatus(cachedProfile ? "ready" : "loading");

        if (cachedProfile) {
          void syncSessionCookie(nextUser).catch(() => {
            // Session cookie failure is non-critical; auth state is still valid.
          });

          void ensureUserProfile(nextUser)
            .then((nextProfile) => {
              setProfile(nextProfile);
              cacheProfile(nextProfile);
              setProfileStatus("ready");
            })
            .catch((profileError) => {
              setError(getReadableError(profileError));
            });

          setLoading(false);
          setInitialized(true);
          return;
        }

        void syncSessionCookie(nextUser).catch(() => {
          // Session cookie failure is non-critical; auth state is still valid.
        });

        try {
          const nextProfile = await new Promise<UserProfile>((resolve, reject) => {
            const timer = window.setTimeout(
              () => reject(new Error("Profile bootstrap timed out.")),
              PROFILE_BOOTSTRAP_TIMEOUT_MS
            );

            void ensureUserProfile(nextUser)
              .then((profileData) => {
                window.clearTimeout(timer);
                resolve(profileData);
              })
              .catch((profileError) => {
                window.clearTimeout(timer);
                reject(profileError);
              });
          });
          setProfile(nextProfile);
          cacheProfile(nextProfile);
          setProfileStatus("ready");
        } catch (profileError) {
          setProfile(fallbackProfile);
          cacheProfile(fallbackProfile);
          setProfileStatus("error");
          setError(getReadableError(profileError));
        }
      } catch (nextError) {
        const fallbackProfile = nextUser ? readCachedProfile(nextUser) ?? buildFallbackProfile(nextUser) : null;
        setProfile(fallbackProfile);
        if (fallbackProfile) {
          cacheProfile(fallbackProfile);
          setProfileStatus("error");
        } else {
          setProfileStatus("idle");
        }
        setError(getReadableError(nextError));
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    });

    return unsubscribe;
  }, [firebaseConfigured]);

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const nextProfile = await ensureUserProfile(user);
      setProfile(nextProfile);
      setProfileStatus("ready");
      cacheProfile(nextProfile);
    } catch (refreshError) {
      const fallbackProfile = readCachedProfile(user) ?? profile ?? buildFallbackProfile(user);
      setProfile(fallbackProfile);
      cacheProfile(fallbackProfile);
      setProfileStatus("error");
      setError(getReadableError(refreshError));
    }
  };

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    setError(null);
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const signInWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    setError(null);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    setError(null);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });

    const nextProfile = (await ensureUserProfile(credential.user).catch(() => buildFallbackProfile(credential.user))) as UserProfile;
    setProfile(nextProfile);
    setProfileStatus("ready");
    cacheProfile(nextProfile);
    router.refresh();
  };

  const sendPasswordReset = async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    setError(null);
    await sendPasswordResetEmail(auth, email);
  };

  const signOutUser = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    setError(null);
    await signOut(auth);
    clearProfileCache(user?.uid);
    setProfile(null);
    setProfileStatus("idle");
    router.push("/auth");
  };

  const finishOnboarding = async ({
    displayName,
    primaryGoal,
    timezone,
  }: {
    displayName: string;
    primaryGoal: string;
    timezone: string;
  }) => {
    if (!user) throw new Error("You must be signed in to complete onboarding.");

    const nextProfile: UserProfile = {
      ...(profile ?? buildFallbackProfile(user)),
      displayName,
      primaryGoal,
      timezone,
      onboardingComplete: true,
      updatedAt: new Date().toISOString(),
    };

    setProfile(nextProfile);
    cacheProfile(nextProfile);
    setProfileStatus("ready");

    void completeUserOnboarding(user.uid, { displayName, primaryGoal, timezone }).catch((writeError) => {
      setError(getReadableError(writeError));
      setProfileStatus("error");
    });

    if (user.displayName !== displayName) {
      void updateProfile(user, { displayName }).catch(() => undefined);
    }

    router.replace("/dashboard");
  };

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    initialized,
    profileStatus,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOutUser,
    refreshProfile,
    finishOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
