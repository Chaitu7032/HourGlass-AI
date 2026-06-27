"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb } from "@/lib/firebase/config";
import type { ExecutionProfile } from "@/types/execution-profile";
import { createEmptyExecutionProfile } from "@/types/execution-profile";

const EXECUTION_PROFILE_CACHE_PREFIX = "hourglass:execution_profile:";

function getCacheKey(userId: string) {
  return `${EXECUTION_PROFILE_CACHE_PREFIX}${userId}`;
}

function readCachedProfile(userId: string): ExecutionProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ExecutionProfile;
  } catch {
    return null;
  }
}

function cacheProfile(userId: string, profile: ExecutionProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getCacheKey(userId), JSON.stringify(profile));
  } catch {
    // Best-effort
  }
}

export function clearExecutionProfileCache(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.localStorage.removeItem(getCacheKey(userId));
      return;
    }
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(EXECUTION_PROFILE_CACHE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Best-effort
  }
}

export async function getExecutionProfile(userId: string): Promise<ExecutionProfile> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  // Check cache first
  const cached = readCachedProfile(userId);
  if (cached) return cached;

  const profileRef = doc(db, COLLECTIONS.users, userId);
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    return createEmptyExecutionProfile();
  }

  const data = snapshot.data();
  const executionProfileData = data.executionProfile as Partial<ExecutionProfile> | undefined;

  if (!executionProfileData) {
    return createEmptyExecutionProfile();
  }

  const profile: ExecutionProfile = {
    workingDays: executionProfileData.workingDays ?? [],
    workStartTime: executionProfileData.workStartTime ?? "09:00",
    workEndTime: executionProfileData.workEndTime ?? "18:00",
    breakDuration: executionProfileData.breakDuration ?? "1hour",
    customBreakMinutes: executionProfileData.customBreakMinutes,
    productiveHours: executionProfileData.productiveHours ?? 5,
    deepWorkWindow: executionProfileData.deepWorkWindow ?? "morning",
    customDeepWorkStart: executionProfileData.customDeepWorkStart,
    customDeepWorkEnd: executionProfileData.customDeepWorkEnd,
    energyProfileType: executionProfileData.energyProfileType ?? "morning",
    chronotype: executionProfileData.chronotype ?? "balanced",
    weekendWork: executionProfileData.weekendWork ?? "never",
    bedtime: executionProfileData.bedtime ?? "23:00",
    wakeTime: executionProfileData.wakeTime ?? "07:00",
    interruptionLevel: executionProfileData.interruptionLevel ?? "sometimes",
    workStyle: executionProfileData.workStyle ?? "software_engineer",
    customWorkStyle: executionProfileData.customWorkStyle,
    commitmentStyle: executionProfileData.commitmentStyle ?? "realistically",
    stressTolerance: executionProfileData.stressTolerance ?? 2,
    recoveryHours: executionProfileData.recoveryHours ?? 4,
    notificationPreference: executionProfileData.notificationPreference ?? "ai_decides",
    calendarConnected: executionProfileData.calendarConnected ?? false,
    profileComplete: executionProfileData.profileComplete ?? false,
    lastUpdated: executionProfileData.lastUpdated ?? new Date().toISOString(),
  };

  cacheProfile(userId, profile);
  return profile;
}

export async function saveExecutionProfile(
  userId: string,
  profile: ExecutionProfile
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const completeProfile: ExecutionProfile = {
    ...profile,
    profileComplete: true,
    lastUpdated: new Date().toISOString(),
  };

  const userRef = doc(db, COLLECTIONS.users, userId);
  await setDoc(
    userRef,
    {
      executionProfile: completeProfile,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  cacheProfile(userId, completeProfile);
}

export function computeProfileCompleteness(profile: Partial<ExecutionProfile>): {
  complete: boolean;
  percentage: number;
  missingFields: string[];
} {
  const requiredFields: Array<{ key: keyof ExecutionProfile; label: string }> = [
    { key: "workingDays", label: "Working days" },
    { key: "workStartTime", label: "Work start time" },
    { key: "workEndTime", label: "Work end time" },
    { key: "breakDuration", label: "Break duration" },
    { key: "productiveHours", label: "Productive hours" },
    { key: "deepWorkWindow", label: "Deep work preference" },
    { key: "energyProfileType", label: "Energy profile" },
    { key: "chronotype", label: "Chronotype" },
    { key: "weekendWork", label: "Weekend work" },
    { key: "bedtime", label: "Bedtime" },
    { key: "wakeTime", label: "Wake time" },
    { key: "interruptionLevel", label: "Interruption level" },
    { key: "workStyle", label: "Work style" },
    { key: "commitmentStyle", label: "Commitment style" },
    { key: "stressTolerance", label: "Stress tolerance" },
    { key: "recoveryHours", label: "Recovery hours" },
    { key: "notificationPreference", label: "Notification preference" },
  ];

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = profile[field.key];
    if (field.key === "workingDays") {
      if (!value || (value as string[]).length === 0) {
        missingFields.push(field.label);
      }
    } else if (value === undefined || value === null || value === "") {
      missingFields.push(field.label);
    }
  }

  const filled = requiredFields.length - missingFields.length;
  const percentage = Math.round((filled / requiredFields.length) * 100);

  return {
    complete: missingFields.length === 0,
    percentage,
    missingFields,
  };
}