"use client";

import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";

function getProvider(user: User): UserProfile["authProvider"] {
  const providerId = user.providerData[0]?.providerId;
  if (providerId === "google.com") return "google";
  if (providerId === "password") return "password";
  return undefined;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const userRef = doc(db, COLLECTIONS.users, user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const profile: UserProfile = {
      id: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "Hourglass User",
      photoURL: user.photoURL ?? undefined,
      authProvider: getProvider(user),
      commitmentScore: 0,
      onboardingComplete: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      primaryGoal: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return profile;
  }

  const data = snapshot.data() as Partial<UserProfile>;
  const profile: UserProfile = {
    id: user.uid,
    email: data.email ?? user.email ?? "",
    displayName: data.displayName ?? user.displayName ?? "Hourglass User",
    photoURL: data.photoURL ?? user.photoURL ?? undefined,
    authProvider: data.authProvider ?? getProvider(user),
    commitmentScore: data.commitmentScore ?? 0,
    onboardingComplete: data.onboardingComplete ?? false,
    timezone: data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    primaryGoal: data.primaryGoal ?? "",
    createdAt:
      typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };

  // Only write back to Firestore if there are fields to merge (e.g. missing displayName, email, etc.)
  const needsUpdate =
    (data.email ?? undefined) !== (user.email ?? undefined) ||
    (data.displayName ?? undefined) !== (user.displayName ?? undefined) ||
    (data.photoURL ?? undefined) !== (user.photoURL ?? undefined) ||
    (data.authProvider ?? undefined) !== (getProvider(user) ?? undefined);

  if (needsUpdate) {
    try {
      await updateDoc(userRef, {
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL ?? null,
        authProvider: profile.authProvider ?? null,
        timezone: profile.timezone ?? null,
        updatedAt: serverTimestamp(),
      });
    } catch {
      await setDoc(
        userRef,
        {
          ...profile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  return profile;
}

export async function completeUserOnboarding(
  userId: string,
  updates: Pick<UserProfile, "displayName" | "primaryGoal" | "timezone">
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await setDoc(
    doc(db, COLLECTIONS.users, userId),
    {
      displayName: updates.displayName,
      primaryGoal: updates.primaryGoal,
      timezone: updates.timezone,
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
