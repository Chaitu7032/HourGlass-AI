"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { getExecutionProfile, saveExecutionProfile } from "@/lib/firebase/execution-profile";
import { computeIntelligenceReport } from "@/lib/execution/intelligence-engine";
import type { ExecutionProfile } from "@/types/execution-profile";
import type { IntelligenceReport } from "@/lib/execution/intelligence-engine";

const EXECUTION_PROFILE_KEY = "hourglass:execution_profile:local";
const EXECUTION_PROFILE_SYNC_KEY = "hourglass:execution_profile:pending_sync";

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

function getPendingSyncProfile(): ExecutionProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EXECUTION_PROFILE_SYNC_KEY);
    return raw ? (JSON.parse(raw) as ExecutionProfile) : null;
  } catch {
    return null;
  }
}

function setPendingSyncProfile(profile: ExecutionProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXECUTION_PROFILE_SYNC_KEY, JSON.stringify(profile));
  } catch {
    // Best-effort cache only
  }
}

function clearPendingSyncProfile() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(EXECUTION_PROFILE_SYNC_KEY);
  } catch {
    // Best-effort cache only
  }
}

export function useExecutionProfile() {
  const { user } = useAuth();
  const userId = user?.uid;

  const flushPendingSync = useCallback(async (): Promise<void> => {
    if (!userId) return;

    const pendingProfile = getPendingSyncProfile();
    if (!pendingProfile) return;

    try {
      await saveExecutionProfile(userId, pendingProfile);
      clearPendingSyncProfile();
      setLocalProfile(pendingProfile);
    } catch {
      // Keep the pending sync queued for a later retry.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    void flushPendingSync();

    const handleOnline = () => {
      void flushPendingSync();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [flushPendingSync, userId]);

  const loadProfile = useCallback(async (): Promise<ExecutionProfile | null> => {
    if (!userId) return null;

    const pendingProfile = getPendingSyncProfile();
    if (pendingProfile) {
      setLocalProfile(pendingProfile);
      void flushPendingSync();
      return pendingProfile;
    }

    try {
      const profile = await getExecutionProfile(userId);
      setLocalProfile(profile);
      return profile;
    } catch {
      return getLocalProfile();
    }
  }, [flushPendingSync, userId]);

  const updateProfile = useCallback(
    async (profile: ExecutionProfile): Promise<void> => {
      if (!userId) throw new Error("Not authenticated");

      // Commit locally first so navigation can continue immediately and
      // downstream pages can render from durable local state.
      setLocalProfile(profile);
      setPendingSyncProfile(profile);

      // Firestore persistence is still attempted, but it does not block the
      // UI when the browser blocks firebase requests.
      void flushPendingSync();
    },
    [flushPendingSync, userId]
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

  const executionProfile = getLocalProfile();

  const report = useMemo(() => {
    if (!executionProfile || executionProfile.workingDays.length === 0) {
      return null;
    }
    return computeIntelligenceReport(
      executionProfile,
      tasks,
      executionProfile.calendarConnected,
      0
    );
  }, [executionProfile, tasks]);

  const userId = user?.uid;

  const refresh = async () => {
    if (!userId) return;

    const pendingProfile = getPendingSyncProfile();
    if (pendingProfile) {
      setLocalProfile(pendingProfile);
      return;
    }

    try {
      const profile = await getExecutionProfile(userId);
      setLocalProfile(profile);
    } catch {
      // Silent fail. Cached value remains.
    }
  };

  return {
    report,
    executionProfile,
    refresh,
  };
}
