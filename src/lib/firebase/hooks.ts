"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirebaseDb } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type {
  AgentLogEntry,
  BehaviorPattern,
  CalendarBlock,
  CommitmentScore,
  OrchestrationResult,
  RescuePlan,
  RiskAssessment,
  Task,
} from "@/types";

type LoadingState = "idle" | "loading" | "error" | "success";

interface FirestoreResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: LoadingState;
  refetch: () => Promise<void>;
}

function defer(fn: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(fn);
    return;
  }

  Promise.resolve().then(fn);
}

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
      defer(() => {
        setData(null);
        setLoading(false);
        setStatus("idle");
        setError(null);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setError("Firebase not configured");
        setStatus("error");
        setLoading(false);
      });
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
    if (!db) {
      setData(null);
      setError("Firebase not configured");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, path, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() } as unknown as T);
      }
      setStatus("success");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [path, docId]);

  return useMemo(() => ({ data, loading, error, status, refetch }), [data, error, loading, refetch, status]);
}

export function useUserCollection<T extends DocumentData>(
  subcollection: string,
  constraints?: QueryConstraint[]
) {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedConstraints = useMemo(() => constraints ?? [], [constraints]);
  const constraintsKey = useMemo(() => JSON.stringify(normalizedConstraints), [normalizedConstraints]);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setItems([]);
        setLoading(false);
        setError(null);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setItems([]);
        setError("Firebase not configured");
        setLoading(false);
      });
      return;
    }

    const colRef = collection(db, COLLECTIONS.users, user.uid, subcollection);
    const q = normalizedConstraints.length ? query(colRef, ...normalizedConstraints) : query(colRef);

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
  }, [user, subcollection, constraintsKey, normalizedConstraints]);

  return { items, loading, error };
}

export function useUserTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setTasks([]);
        setLoading(false);
        setError(null);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setTasks([]);
        setError("Firebase not configured");
        setLoading(false);
      });
      return;
    }

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
      return createUserTask(user.uid, task);
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

export async function createUserTask(
  userId: string,
  task: Omit<Task, "id" | "createdAt" | "updatedAt">
) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTIONS.users, userId, COLLECTIONS.tasks), {
    ...task,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, ...task, createdAt: now, updatedAt: now } as Task;
}

export function useLatestOrchestration() {
  const { user } = useAuth();
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setResult(null);
        setLoading(false);
        setError(null);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setResult(null);
        setLoading(false);
      });
      return;
    }

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

export function useRiskAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setAssessments([]);
        setLoading(false);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setAssessments([]);
        setLoading(false);
      });
      return;
    }

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

export function useRescuePlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<RescuePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setPlans([]);
        setLoading(false);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setPlans([]);
        setLoading(false);
      });
      return;
    }

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

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setEvents([]);
        setLoading(false);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setEvents([]);
        setLoading(false);
      });
      return;
    }

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

export function useAgentLogs(limitCount = 50) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setLogs([]);
        setLoading(false);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setLogs([]);
        setLoading(false);
      });
      return;
    }

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

export function useCommitmentScore() {
  const { user } = useAuth();
  const [score, setScore] = useState<CommitmentScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setScore(null);
        setLoading(false);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setScore(null);
        setLoading(false);
      });
      return;
    }

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.analytics);
    const q = query(colRef, orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setScore({ id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as CommitmentScore);
      } else {
        setScore(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { score, loading };
}

export function useBehaviorPatterns() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<BehaviorPattern | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      defer(() => {
        setPatterns(null);
        setLoading(false);
      });
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      defer(() => {
        setPatterns(null);
        setLoading(false);
      });
      return;
    }

    const colRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.behaviorPatterns);
    const q = query(colRef, orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPatterns({ id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as BehaviorPattern);
      } else {
        setPatterns(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { patterns, loading };
}
