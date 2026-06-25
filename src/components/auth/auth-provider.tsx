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

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const firebaseConfigured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [initialized, setInitialized] = useState(!firebaseConfigured);
  const [error, setError] = useState<string | null>(
    firebaseConfigured ? null : "Firebase is not configured. Add your public Firebase environment variables."
  );

  useEffect(() => {
    if (!firebaseConfigured) return;

    const auth = getFirebaseAuth();
    if (!auth) return;

    void setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setLoading(true);
      setError(null);

      try {
        setUser(nextUser);
        await syncSessionCookie(nextUser);

        if (nextUser) {
          const nextProfile = await ensureUserProfile(nextUser);
          setProfile(nextProfile);
        } else {
          setProfile(null);
        }
      } catch (nextError) {
        setProfile(null);
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
    const nextProfile = await ensureUserProfile(user);
    setProfile(nextProfile);
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
    await ensureUserProfile(credential.user);
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

    await completeUserOnboarding(user.uid, { displayName, primaryGoal, timezone });

    if (user.displayName !== displayName) {
      await updateProfile(user, { displayName });
    }

    await refreshProfile();
    router.push("/dashboard");
    router.refresh();
  };

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    initialized,
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
