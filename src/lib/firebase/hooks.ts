"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  addDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type SnapshotOptions,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { useAuth } from "@/components/auth/auth-provider";
import { generateId } from "@/lib/utils";
import type {
  Task,
  Goal,
  OrchestrationResult,
  RiskAssessment,
  RescuePlan,
  CalendarBlock,
  CommitmentScore,
  BehaviorPattern,
  ChatMessage,
  AgentLogEntry,
} from "@/types";

// ── Generic Firestore hook ──────────────────────────────────────────

type LoadingState = "idle" | "loading" | "error" | "success";

interface FirestoreResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: LoadingState;
  refetch: () => Promise<void>;
}

type FirestoreMutateOptions = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
};

// ── User-scoped collection helpers ──────────────────────────────────

function userCol(userId: string, subcollection: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");
  return collection(db, COLLECTIONS.users, userId, subcollection);
}

function userDoc(userId: string, subcollection: string, docId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");
  return doc(db, COLLECTIONS.users, userId, subcollection, docId);
}

// ── Hook: Read a single Firestore document with real-time listener ──

export function useFirestoreDoc<T extends DocumentData>(
  path: string,
  docId: string | null
): FirestoreResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadingState>("loading");

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      setStatus("idle");
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setError("Firebase not configured");
      setStatus("error");
      setLoading(false);
      return;
    }

    const docRef = doc(db, path, docId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as unknown as T);
          setStatus("success");
        } else {
          setData(null);
          setStatus("idle");
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setStatus("error");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [path, docId]);

  const refetch = useCallback(async () => {
    if (!docId) return;
    const db = getFirebaseDb();
    if (!db) return;
    setLoading(true);
    try {
      const docRef = doc(db, path, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() } as unknown as T);
      }
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [path, docId]);

  return useMemo(
    () => ({ data, loading, error, status, refetch }),
    [data, loading, error, status, refetch]
  );
}

// ── Hook: Read a user subcollection ─────────────────────────────────

export function useUserCollection<T extends DocumentData>(
  subcollection: string,
  constraints?: QueryConstraint[]
) {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, subcollection);
    const q = constraints?.length ? query(colRef, ...constraints) : query(colRef);

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
        setItems(results);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, subcollection, JSON.stringify(constraints)]);

  return { items, loading, error };
}

// ── Task Hooks ──────────────────────────────────────────────────────

export function useUserTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.tasks);
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const results = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            deadline: typeof data.deadline?.toMillis === "function" ? new Date(data.deadline.toMillis()).toISOString() : data.deadline,
            createdAt: typeof data.createdAt?.toMillis === "function" ? new Date(data.createdAt.toMillis()).toISOString() : data.createdAt,
            updatedAt: typeof data.updatedAt?.toMillis === "function" ? new Date(data.updatedAt.toMillis()).toISOString() : data.updatedAt,
          } as Task;
        });
        setTasks(results);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      if (!user) throw new Error("Not authenticated");
      const db = getFirebaseDb();
      if (!db) throw new Error("Firebase not configured");

      const now = new Date().toISOString();
      const taskData = {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.tasks),
        taskData
      );

      return { id: docRef.id, ...task, createdAt: now, updatedAt: now } as Task;
    },
    [user]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!user) throw new Error("Not authenticated");
      const db = getFirebaseDb();
      if (!db) throw new Error("Firebase not configured");

      const docRef = doc(db, COLLECTIONS.users, user.uid, COLLECTIONS.tasks, taskId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    [user]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      if (!user) throw new Error("Not authenticated");
      const db = getFirebaseDb();
      if (!db) throw new Error("Firebase not configured");

      await deleteDoc(doc(db, COLLECTIONS.users, user.uid, COLLECTIONS.tasks, taskId));
    },
    [user]
  );

  return { tasks, loading, error, addTask, updateTask, removeTask };
}

// ── Orchestration Result Hook ───────────────────────────────────────

export function useLatestOrchestration() {
  const { user } = useAuth();
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.plans);
    const q = query(colRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setResult({ id: snap.docs[0].id, ...data } as unknown as OrchestrationResult);
        } else {
          setResult(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const saveOrchestration = useCallback(
    async (orchestration: OrchestrationResult) => {
      if (!user) throw new Error("Not authenticated");
      const db = getFirebaseDb();
      if (!db) throw new Error("Firebase not configured");

      const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.plans);
      await addDoc(colRef, {
        ...orchestration,
        timestamp: serverTimestamp(),
      });
    },
    [user]
  );

  return { result, loading, error, saveOrchestration };
}

// ── Risk Assessments Hook ───────────────────────────────────────────

export function useRiskAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAssessments([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.riskAssessments);
    const q = query(colRef, orderBy("assessedAt", "desc"), limit(20));

    const unsubscribe = onSnapshot(q, (snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as RiskAssessment);
      setAssessments(results);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { assessments, loading };
}

// ── Rescue Plans Hook ───────────────────────────────────────────────

export function useRescuePlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<RescuePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlans([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.rescuePlans);
    const q = query(colRef, orderBy("triggeredAt", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, (snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as RescuePlan);
      setPlans(results);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { plans, loading };
}

// ── Calendar Events Hook ────────────────────────────────────────────

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.calendarEvents);
    const q = query(colRef, orderBy("start", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as CalendarBlock);
      setEvents(results);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { events, loading };
}

// ── Agent Logs Hook ─────────────────────────────────────────────────

export function useAgentLogs(limitCount = 50) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.agentLogs);
    const q = query(colRef, orderBy("timestamp", "desc"), limit(limitCount));

    const unsubscribe = onSnapshot(q, (snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as AgentLogEntry);
      setLogs(results.reverse());
      setLoading(false);
    });

    return unsubscribe;
  }, [user, limitCount]);

  return { logs, loading };
}

// ── Commitment Score Hook ───────────────────────────────────────────

export function useCommitmentScore() {
  const { user } = useAuth();
  const [score, setScore] = useState<CommitmentScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setScore(null);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.analytics);
    const q = query(colRef, orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setScore({ id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as CommitmentScore);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { score, loading };
}

// ── Behavior Patterns Hook ──────────────────────────────────────────

export function useBehaviorPatterns() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<BehaviorPattern | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPatterns(null);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.behaviorPatterns);
    const q = query(colRef, orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPatterns({ id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as BehaviorPattern);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { patterns, loading };
}