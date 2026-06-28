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
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import { completeUserOnboarding, ensureUserProfile } from "@/lib/firebase/user-profile";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import type { UserProfile } from "@/types";

// ─── Auth State Machine ────────────────────────────────────────────────────
export type AuthStatus =
  | "Initializing"      // Firebase SDK is bootstrapping
  | "Unauthenticated"   // No signed-in user
  | "Authenticated"     // User signed in, profile being loaded
  | "ProfileIncomplete" // Signed in, onboarding not yet complete
  | "Ready"             // Signed in + onboarding complete
  | "ExpiredSession"    // Token stale / network failure
  | "SigningOut";        // Sign-out in progress

const PROFILE_CACHE_PREFIX = "hourglass:profile:";
const PROFILE_BOOTSTRAP_TIMEOUT_MS = 3000;
const TOKEN_REFRESH_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

// ─── Context Interface ─────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authStatus: AuthStatus;
  /** @deprecated Use authStatus instead */
  loading: boolean;
  /** @deprecated Use authStatus instead */
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

// ─── Cookie Sync ───────────────────────────────────────────────────────────
async function syncSessionCookie(user: User | null) {
  try {
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
  } catch {
    // Session cookie sync is non-critical
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
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
    // Best-effort cache only
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
    // Best-effort cleanup
  }
}

function resetWorkspaceState() {
  useHourglassStore.getState().reset();
}

function deriveAuthStatus(
  firebaseConfigured: boolean,
  user: User | null,
  profile: UserProfile | null,
  profileStatus: "idle" | "loading" | "ready" | "error",
  initialized: boolean,
  signingOut: boolean,
): AuthStatus {
  if (!firebaseConfigured || !initialized) return "Initializing";
  if (signingOut) return "SigningOut";
  if (!user) return "Unauthenticated";
  if (profileStatus === "loading") return "Authenticated";
  if (profileStatus === "error") return "ExpiredSession";
  if (profile && !profile.onboardingComplete) return "ProfileIncomplete";
  if (profile && profile.onboardingComplete) return "Ready";
  return "Authenticated";
}

// ─── Provider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const firebaseConfigured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [initialized, setInitialized] = useState(!firebaseConfigured);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(
    firebaseConfigured ? null : "Firebase is not configured. Add your public Firebase environment variables."
  );
  const tokenRefreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserRef = useRef<User | null>(null);

  // Derived auth status from state machine
  const authStatus = deriveAuthStatus(
    firebaseConfigured,
    user,
    profile,
    profileStatus,
    initialized,
    signingOut,
  );

  // ─── Token Refresh Helper ────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    if (!currentUserRef.current) return;
    try {
      await currentUserRef.current.getIdToken(/* forceRefresh */ true);
      await syncSessionCookie(currentUserRef.current);
    } catch {
      // If token refresh fails, mark session as expired
      setProfileStatus("error");
    }
  }, []);

  // ─── Session Lifecycle Listeners ────────────────────────────────────
  useEffect(() => {
    if (!firebaseConfigured) return;

    // Refresh token when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshToken();
      }
    };

    // Refresh token when network comes back online
    const handleOnline = () => {
      void refreshToken();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    // Proactive token refresh every 14 minutes
    tokenRefreshTimer.current = setInterval(() => {
      void refreshToken();
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      if (tokenRefreshTimer.current) {
        clearInterval(tokenRefreshTimer.current);
      }
    };
  }, [firebaseConfigured, refreshToken]);

  // ─── Firebase Auth Listener ──────────────────────────────────────────
  useEffect(() => {
    if (!firebaseConfigured) return;

    const auth = getFirebaseAuth();
    if (!auth) return;

    void setPersistence(auth, browserLocalPersistence).catch(() => undefined);

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setLoading(true);
      setError(null);
      const previousUserId = currentUserRef.current?.uid ?? null;
      currentUserRef.current = nextUser;

      if (previousUserId && previousUserId !== nextUser?.uid) {
        clearProfileCache(previousUserId);
        resetWorkspaceState();
      }

      try {
        setUser(nextUser);

        if (!nextUser) {
          clearProfileCache();
          setProfile(null);
          setProfileStatus("idle");
          resetWorkspaceState();
          setLoading(false);
          setInitialized(true);
          return;
        }

        const cachedProfile = readCachedProfile(nextUser);
        const fallbackProfile = cachedProfile ?? buildFallbackProfile(nextUser);
        setProfile(fallbackProfile);
        setProfileStatus(cachedProfile ? "ready" : "loading");

        // Sync session cookie without blocking
        void syncSessionCookie(nextUser);

        if (cachedProfile) {
          // Background profile refresh without blocking UI
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

        // No cache — do a timed bootstrap
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
        const fallbackProfile = nextUser
          ? readCachedProfile(nextUser) ?? buildFallbackProfile(nextUser)
          : null;
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

  // ─── Actions ─────────────────────────────────────────────────────────
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
    const nextProfile = await ensureUserProfile(credential.user).catch(
      () => buildFallbackProfile(credential.user)
    );
    setProfile(nextProfile as UserProfile);
    setProfileStatus("ready");
    cacheProfile(nextProfile as UserProfile);
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
    setSigningOut(true);
    setError(null);
    try {
      await signOut(auth);
      clearProfileCache(user?.uid);
      setProfile(null);
      setProfileStatus("idle");
      resetWorkspaceState();
      await syncSessionCookie(null);
    } finally {
      setSigningOut(false);
    }
  };

  /**
   * Called after the basic onboarding step (name/goal/timezone).
   * Does NOT navigate — the calling page controls routing to avoid
   * premature redirects before the execution profile step.
   */
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

    // Optimistic update
    setProfile(nextProfile);
    cacheProfile(nextProfile);
    setProfileStatus("ready");

    // Persist to Firestore (non-blocking — UI already updated)
    try {
      await completeUserOnboarding(user.uid, { displayName, primaryGoal, timezone });
      await refreshProfile();
    } catch (writeError) {
      setError(getReadableError(writeError));
      setProfileStatus("error");
      throw writeError;
    }

    if (user.displayName !== displayName) {
      void updateProfile(user, { displayName }).catch(() => undefined);
    }

    // NOTE: No router.replace here — the onboarding page controls routing
    // so the user can complete the execution profile step first.
  };

  const value: AuthContextValue = {
    user,
    profile,
    authStatus,
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
