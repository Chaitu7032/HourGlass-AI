"use client";

import { useMemo, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { getExecutionProfile, saveExecutionProfile } from "@/lib/firebase/execution-profile";
import { computeIntelligenceReport } from "@/lib/execution/intelligence-engine";
import type { ExecutionProfile } from "@/types/execution-profile";
import type { IntelligenceReport } from "@/lib/execution/intelligence-engine";

const EXECUTION_PROFILE_KEY = "hourglass:execution_profile:local";

function getLocalProfile(): ExecutionProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EXECUTION_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalProfile(profile: ExecutionProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXECUTION_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Best-effort
  }
}

export function useExecutionProfile() {
  const { user } = useAuth();
  const userId = user?.uid;

  const loadProfile = useCallback(async (): Promise<ExecutionProfile | null> => {
    if (!userId) return null;

    try {
      const profile = await getExecutionProfile(userId);
      setLocalProfile(profile);
      return profile;
    } catch {
      return getLocalProfile();
    }
  }, [userId]);

  const updateProfile = useCallback(
    async (profile: ExecutionProfile): Promise<void> => {
      if (!userId) throw new Error("Not authenticated");

      await saveExecutionProfile(userId, profile);
      setLocalProfile(profile);
    },
    [userId]
  );

  return {
    loadProfile,
    updateProfile,
    getLocalProfile,
  };
}

export function useIntelligence(): {
  report: IntelligenceReport | null;
  executionProfile: ExecutionProfile | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const { tasks } = useHourglassStore();

  const executionProfile = useMemo(() => {
    return getLocalProfile();
  }, []);

  const report = useMemo(() => {
    if (!executionProfile || executionProfile.workingDays.length === 0) {
      return null;
    }
    return computeIntelligenceReport(
      executionProfile,
      tasks,
      executionProfile.calendarConnected,
      0 // No historical data tracked yet
    );
  }, [executionProfile, tasks]);

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const profile = await getExecutionProfile(user.uid);
      setLocalProfile(profile);
    } catch {
      // Silent fail
    }
  }, [user?.uid]);

  return {
    report,
    executionProfile,
    refresh,
  };
}