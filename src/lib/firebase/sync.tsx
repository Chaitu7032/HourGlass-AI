"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { useAuth } from "@/components/auth/auth-provider";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import type {
  Task,
  OrchestrationResult,
  ChatMessage,
  AgentLogEntry,
} from "@/types";

/**
 * SyncProvider — bridges Zustand client state with Firestore persistence.
 * 
 * When a user is authenticated, this provider:
 * 1. Loads tasks from Firestore into Zustand
 * 2. Listens for real-time task updates
 * 3. Saves orchestration results to Firestore
 * 4. Syncs chat messages to Firestore
 * 
 * When no user is authenticated, Zustand operates in local-only mode.
 */
export function useFirestoreSync() {
  const { user, initialized } = useAuth();
  const {
    setTasks,
    setOrchestration,
    setWorkspaceHydrated,
    addChatMessage,
    orchestration,
  } = useHourglassStore();
  const syncActive = useRef(false);

  // Sync tasks from Firestore → Zustand
  useEffect(() => {
    if (!user || !initialized) {
      syncActive.current = false;
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    syncActive.current = true;
    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.tasks);
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!syncActive.current) return;
        const tasks = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            deadline: typeof data.deadline?.toMillis === "function"
              ? new Date(data.deadline.toMillis()).toISOString()
              : data.deadline,
            createdAt: typeof data.createdAt?.toMillis === "function"
              ? new Date(data.createdAt.toMillis()).toISOString()
              : data.createdAt,
            updatedAt: typeof data.updatedAt?.toMillis === "function"
              ? new Date(data.updatedAt.toMillis()).toISOString()
              : data.updatedAt,
          } as Task;
        });
        setTasks(tasks);
        setWorkspaceHydrated(true);
      },
      (err) => {
        console.error("[FirestoreSync] Task listener failed:", err);
        setWorkspaceHydrated(true); // Still mark as hydrated to avoid infinite loading
      }
    );

    return () => {
      syncActive.current = false;
      unsubscribe();
    };
  }, [user, initialized, setTasks, setWorkspaceHydrated]);

  // Sync latest orchestration result from Firestore
  useEffect(() => {
    if (!user || !initialized) return;

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.plans);
    const q = query(colRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          // Check if this is a real orchestration result (has riskAssessments array)
          if (Array.isArray(data.riskAssessments)) {
            setOrchestration({ id: snap.docs[0].id, ...data } as unknown as OrchestrationResult);
          }
        }
      },
      (err) => {
        console.error("[FirestoreSync] Orchestration listener failed:", err);
      }
    );

    return unsubscribe;
  }, [user, initialized, setOrchestration]);

  return null;
}

/**
 * SyncProviderComponent — wraps children with Firestore sync behavior.
 * Must be used inside AuthProvider.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  useFirestoreSync();
  return <>{children}</>;
}

// ── Server-side mutation helpers (for API routes) ───────────────────

export async function saveOrchestrationToFirestore(
  userId: string,
  result: OrchestrationResult
) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _planId, ...data } = result;

  // Save to plans subcollection
  const planRef = await addDoc(
    collection(db, COLLECTIONS.users, userId, COLLECTIONS.plans),
    {
      ...data,
      timestamp: serverTimestamp(),
    }
  );

  // Save risk assessments
  for (const assessment of data.riskAssessments) {
    await addDoc(
      collection(db, COLLECTIONS.users, userId, COLLECTIONS.riskAssessments),
      {
        ...assessment,
        assessedAt: serverTimestamp(),
      }
    );
  }

  // Save rescue plans
  for (const rescuePlan of data.rescuePlans) {
    await addDoc(
      collection(db, COLLECTIONS.users, userId, COLLECTIONS.rescuePlans),
      {
        ...rescuePlan,
        triggeredAt: serverTimestamp(),
      }
    );
  }

  // Save calendar events
  for (const block of data.calendarBlocks) {
    await addDoc(
      collection(db, COLLECTIONS.users, userId, COLLECTIONS.calendarEvents),
      block
    );
  }

  // Save agent logs
  for (const log of data.agentLogs) {
    await addDoc(
      collection(db, COLLECTIONS.users, userId, COLLECTIONS.agentLogs),
      {
        ...log,
        timestamp: serverTimestamp(),
      }
    );
  }

  return planRef.id;
}