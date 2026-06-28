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
    return raw ? (JSON.parse(raw) as ExecutionProfile) : null;
  } catch {
    return null;
  }
}

function setLocalProfile(profile: ExecutionProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXECUTION_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Best-effort cache only
  }
}

// ─── useExecutionProfile ──────────────────────────────────────────────────
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

      // 1. Snapshot current local state for rollback
      const previousProfile = getLocalProfile();

      // 2. Optimistic update — write immediately so UI reflects changes
      setLocalProfile(profile);

      try {
        // 3. Persist to Firestore
        await saveExecutionProfile(userId, profile);
      } catch (saveError) {
        // 4. Rollback on failure
        if (previousProfile) {
          setLocalProfile(previousProfile);
        }
        throw saveError; // Re-raise so callers can show error messages
      }
    },
    [userId]
  );

  return {
    loadProfile,
    updateProfile,
    getLocalProfile,
  };
}

// ─── useIntelligence ──────────────────────────────────────────────────────
export function useIntelligence(): {
  report: IntelligenceReport | null;
  executionProfile: ExecutionProfile | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const { tasks } = useHourglassStore();

  const executionProfile = getLocalProfile();

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

  const userId = user?.uid;

  const refresh = async () => {
    if (!userId) return;
    try {
      const profile = await getExecutionProfile(userId);
      setLocalProfile(profile);
    } catch {
      // Silent fail — cached value remains
    }
  };

  return {
    report,
    executionProfile,
    refresh,
  };
}
