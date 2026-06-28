"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
  Target,
  Brain,
  Shield,
  Flame,
  Smile,
  Zap,
  Hourglass,
  RefreshCw,
} from "lucide-react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, buildPlannerSuggestion } from "@/lib/agents/planner-core";
import { createUserTask } from "@/lib/firebase/hooks";
import { getFirebaseDb } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { cn, generateId } from "@/lib/utils";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import type { OrchestrationResult, Task, TaskCategory, TaskPriority } from "@/types";

type Motivation = {
  value: string;
  label: string;
  icon: typeof Smile;
};

type PipelineLogger = ReturnType<typeof createPipelineLogger>;

const SAVE_TIMEOUT_MS = 15_000;
const PRELOAD_TIMEOUT_MS = 7_500;
const PLANNING_TIMEOUT_MS = 12_000;
const PREFETCH_TIMEOUT_MS = 4_000;

const motivations: Motivation[] = [
  { value: "need_a_nudge", label: "Need a nudge", icon: Smile },
  { value: "steady_momentum", label: "Steady momentum", icon: Sparkles },
  { value: "highly_motivated", label: "Highly motivated", icon: Flame },
  { value: "all_in_energy", label: "All-in energy", icon: Zap },
];

const commitTypes: Array<{
  title: string;
  category: TaskCategory;
  description: string;
}> = [
  { title: "Hackathon", category: "hackathon", description: "Build fast, ship something real." },
  { title: "Google Interview", category: "interview", description: "Prep for a high-stakes loop." },
  { title: "University Project", category: "project", description: "Keep coursework on track." },
  { title: "Startup", category: "startup", description: "Push product execution forward." },
  { title: "Personal Goal", category: "personal", description: "Protect a goal that matters to you." },
  { title: "Custom", category: "other", description: "Define your own commitment." },
];

const effortOptions = [
  { label: "2 Hours", value: 2 },
  { label: "8 Hours", value: 8 },
  { label: "20 Hours", value: 20 },
  { label: "50 Hours", value: 50 },
  { label: "100+ Hours", value: 100 },
];

const planningStages = [
  "Analyzing Goal...",
  "Planning Milestones...",
  "Calculating Risks...",
  "Scheduling Tasks...",
  "Running Future Simulation...",
  "Preparing Dashboard...",
  "Execution Strategy Ready",
];

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createPipelineLogger(runId: string) {
  return (step: string, event: string, details: Record<string, unknown> = {}) => {
    console.info("[commitment-save]", {
      runId,
      step,
      event,
      at: new Date().toISOString(),
      ...details,
    });
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFirestoreError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("unavailable") ||
    message.includes("network") ||
    message.includes("deadline exceeded") ||
    message.includes("failed to get document")
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function persistTaskWithRetry(
  userId: string,
  taskDraft: Omit<Task, "createdAt" | "updatedAt">,
  logger: PipelineLogger
) {
  const attempts = 3;
  const db = getFirebaseDb();
  const taskDocRef = db
    ? doc(db, COLLECTIONS.users, userId, COLLECTIONS.tasks, taskDraft.id)
    : null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      logger("firestore_write", "attempt_started", { attempt, taskId: taskDraft.id });
      logger("firestore_write", "create_task_dispatched", { attempt, taskId: taskDraft.id });
      const persistedTask = await withTimeout(createUserTask(userId, taskDraft), SAVE_TIMEOUT_MS, "Firestore write");
      logger("firestore_write", "create_task_resolved", { attempt, taskId: persistedTask.id });
      logger("firestore_write", "succeeded", { attempt, taskId: persistedTask.id });
      return persistedTask;
    } catch (error) {
      const timeoutMessage = error instanceof Error ? error.message : String(error);
      logger("firestore_write", "attempt_failed", {
        attempt,
        taskId: taskDraft.id,
        error: timeoutMessage,
      });

      if (timeoutMessage.includes("timed out") && taskDocRef) {
        logger("firestore_write", "timeout_verification_started", { attempt, taskId: taskDraft.id });
        try {
          const snapshot = await getDoc(taskDocRef);
          if (snapshot.exists()) {
            const confirmedAt = new Date().toISOString();
            logger("firestore_write", "timeout_verification_confirmed", { attempt, taskId: taskDraft.id });
            return {
              ...taskDraft,
              createdAt: confirmedAt,
              updatedAt: confirmedAt,
            } as Task;
          }
          logger("firestore_write", "timeout_verification_missing", { attempt, taskId: taskDraft.id });
        } catch (verificationError) {
          logger("firestore_write", "timeout_verification_failed", {
            attempt,
            taskId: taskDraft.id,
            error: verificationError instanceof Error ? verificationError.message : String(verificationError),
          });
        }
      }

      if (attempt === attempts || !isRetryableFirestoreError(error)) {
        throw error;
      }

      await sleep(800 * attempt);
    }
  }

  throw new Error("Unable to save commitment.");
}

async function preloadWorkspace(userId: string, logger: PipelineLogger) {
  const db = getFirebaseDb();
  if (!db) {
    logger("dashboard_preload", "skipped", { reason: "firebase_not_configured" });
    return;
  }

  logger("dashboard_preload", "started", { userId });
  await Promise.all([
    getDoc(doc(db, COLLECTIONS.users, userId)),
    getDocs(query(collection(db, COLLECTIONS.users, userId, COLLECTIONS.tasks), orderBy("createdAt", "desc"))),
    getDocs(query(collection(db, COLLECTIONS.users, userId, COLLECTIONS.plans), orderBy("timestamp", "desc"), limit(5))),
    getDocs(query(collection(db, COLLECTIONS.users, userId, COLLECTIONS.riskAssessments), orderBy("assessedAt", "desc"), limit(20))),
    getDocs(query(collection(db, COLLECTIONS.users, userId, COLLECTIONS.calendarEvents), orderBy("start", "desc"), limit(25))),
    getDocs(query(collection(db, COLLECTIONS.users, userId, COLLECTIONS.analytics), limit(5))),
  ]);
  logger("dashboard_preload", "succeeded", { userId });
}

async function runPlanningInBackground({
  tasks,
  userId,
  logger,
  router,
}: {
  tasks: Task[];
  userId: string;
  logger: PipelineLogger;
  router: ReturnType<typeof useRouter>;
}) {
  const store = useHourglassStore.getState();
  store.setWorkspaceHydrated(true);
  store.setIsOrchestrating(true);
  store.clearOrchestrationProgress();
  logger("ai_planning", "started", { taskCount: tasks.length });

  try {
    const planningPromise = fetch("/api/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks,
        userId,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Planning failed with status ${response.status}`);
      }

      return (await response.json()) as OrchestrationResult;
    });

    const result = await withTimeout(planningPromise, PLANNING_TIMEOUT_MS, "AI planning");
    logger("ai_planning", "succeeded", {
      agentLogCount: result.agentLogs.length,
      riskAssessmentCount: result.riskAssessments.length,
    });

    for (const log of result.agentLogs) {
      useHourglassStore.getState().appendOrchestrationLog(log);
    }

    useHourglassStore.getState().setOrchestration(result);

    try {
      await withTimeout(Promise.resolve(router.prefetch("/dashboard")), PREFETCH_TIMEOUT_MS, "dashboard prefetch after planning");
      logger("dashboard_preload", "prefetch_refreshed", {});
    } catch (prefetchError) {
      logger("dashboard_preload", "prefetch_refresh_failed", {
        error: prefetchError instanceof Error ? prefetchError.message : String(prefetchError),
      });
    }
  } catch (planningError) {
    logger("ai_planning", "failed", {
      error: planningError instanceof Error ? planningError.message : String(planningError),
    });
  } finally {
    useHourglassStore.getState().setIsOrchestrating(false);
    logger("ai_planning", "finished");
  }
}

export default function NewCommitmentPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { setTasks } = useHourglassStore();

  const isMountedRef = useRef(true);
  const navigationStartedRef = useRef(false);

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<TaskCategory>("hackathon");
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return formatDateInput(date);
  });
  const [priority, setPriority] = useState<TaskPriority>("high");
  const [effort, setEffort] = useState(8);
  const [motivation, setMotivation] = useState("highly_motivated");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [planningStage, setPlanningStage] = useState(0);
  const [savedTask, setSavedTask] = useState<Task | null>(null);
  const [savedTaskSet, setSavedTaskSet] = useState<Task[] | null>(null);

  const selectedTemplate = commitTypes.find((type) => type.category === selectedType) ?? commitTypes[0];

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    Promise.resolve(router.prefetch("/dashboard")).catch((prefetchError) => {
      console.warn("[commitment-save]", {
        step: "dashboard_preload",
        event: "initial_prefetch_failed",
        error: prefetchError instanceof Error ? prefetchError.message : String(prefetchError),
      });
    });
  }, [router]);

  const suggestion = useMemo(
    () =>
      buildPlannerSuggestion({
        title: customTitle.trim() || selectedTemplate.title,
        description: description.trim() || selectedTemplate.description,
        deadline: new Date(`${deadlineDate}T23:59:59`).toISOString(),
        estimatedHours: effort,
        priority,
        category: selectedType,
        complexity: Math.min(10, Math.max(1, Math.round(effort / 8) + (priority === "critical" ? 2 : 0))),
      }),
    [customTitle, deadlineDate, description, effort, priority, selectedTemplate.description, selectedTemplate.title, selectedType]
  );

  useEffect(() => {
    if (!planning) return;

    const timer = window.setInterval(() => {
      setPlanningStage((current) => Math.min(planningStages.length - 1, current + 1));
    }, 740);

    return () => window.clearInterval(timer);
  }, [planning]);

  const retryPlanning = async () => {
    if (!savedTaskSet || !user) return;

    const runId = generateId();
    const logger = createPipelineLogger(runId);
    logger("ai_planning", "retry_requested", { taskCount: savedTaskSet.length });

    if (isMountedRef.current) {
      setPlanning(true);
      setPlanningError(null);
      setPlanningStage(0);
    }

    try {
      await runPlanningInBackground({
        tasks: savedTaskSet,
        userId: user.uid,
        logger,
        router,
      });
    } catch (retryError) {
      logger("ai_planning", "retry_failed", {
        error: retryError instanceof Error ? retryError.message : String(retryError),
      });
      if (isMountedRef.current) {
        setPlanningError(retryError instanceof Error ? retryError.message : "Planning retry failed.");
      }
    } finally {
      if (isMountedRef.current) {
        setPlanning(false);
      }
    }
  };

  const handleFinish = async () => {
    if (isSaving || planning) return;

    const runId = generateId();
    const logger = createPipelineLogger(runId);

    logger("validation", "started", {
      selectedType,
      effort,
      priority,
      hasCustomTitle: Boolean(customTitle.trim()),
      online: typeof navigator === "undefined" ? "unknown" : navigator.onLine,
    });

    setError(null);
    setPlanningError(null);
    setIsSaving(true);
    setPlanning(false);
    setPlanningStage(0);
    setSavedTask(null);
    setSavedTaskSet(null);
    navigationStartedRef.current = false;

    let optimisticTask: Task | null = null;

    try {
      if (!user) {
        throw new Error("You must be signed in to create a commitment.");
      }

      const title = customTitle.trim() || selectedTemplate.title;
      if (!title) {
        throw new Error("Commitment title is required.");
      }

      logger("validation", "succeeded", { title });

      const taskId = generateId();
      const createdAt = new Date().toISOString();
      const taskDraft = {
        id: taskId,
        title,
        description: description.trim() || selectedTemplate.description,
        deadline: new Date(`${deadlineDate}T23:59:59`).toISOString(),
        estimatedHours: effort,
        completedHours: 0,
        priority,
        category: selectedType,
        complexity: suggestion.complexity,
      } satisfies Omit<Task, "createdAt" | "updatedAt">;

      optimisticTask = {
        ...taskDraft,
        createdAt,
        updatedAt: createdAt,
      };

      const previousTasks = useHourglassStore.getState().tasks;
      const nextTasks = [optimisticTask, ...previousTasks.filter((task) => task.id !== taskId)];

      logger("optimistic_update", "started", { previousTaskCount: previousTasks.length });
      setTasks(nextTasks);
      logger("optimistic_update", "succeeded", { nextTaskCount: nextTasks.length });

      if (!optimisticTask) {
        throw new Error("Unable to construct the commitment draft.");
      }

      logger("firestore_write", "await_started", { taskId: taskDraft.id });
      const confirmedTask = await persistTaskWithRetry(user.uid, taskDraft, logger);
      logger("firestore_write", "await_finished", { taskId: confirmedTask.id });
      const committedTasks = [confirmedTask, ...previousTasks.filter((task) => task.id !== confirmedTask.id)];
      setSavedTask(confirmedTask);
      setSavedTaskSet(committedTasks);
      setTasks(committedTasks);

      logger("router_navigation", "started", { destination: "/dashboard" });
      navigationStartedRef.current = true;
      logger("background_tasks", "queued", { taskCount: committedTasks.length });

      void (async () => {
        try {
          await withTimeout(preloadWorkspace(user.uid, logger), PRELOAD_TIMEOUT_MS, "Dashboard preload");
        } catch (preloadError) {
          logger("dashboard_preload", "failed", {
            error: preloadError instanceof Error ? preloadError.message : String(preloadError),
          });
        }
      })();

      void runPlanningInBackground({
        tasks: committedTasks,
        userId: user.uid,
        logger,
        router,
      }).catch((planningError) => {
        logger("ai_planning", "unhandled_failure", {
          error: planningError instanceof Error ? planningError.message : String(planningError),
        });
        if (isMountedRef.current) {
          setPlanningError("Planning is continuing in the background with limited visibility.");
        }
      });

      router.replace("/dashboard");
      logger("router_navigation", "dispatched", { destination: "/dashboard" });

      if (isMountedRef.current) {
        setPlanning(false);
      }
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to create commitment.";
      logger("pipeline", "failed", { error: message, navigated: navigationStartedRef.current });

      if (optimisticTask) {
        setTasks(useHourglassStore.getState().tasks.filter((task) => task.id !== optimisticTask?.id));
      }

      if (isMountedRef.current && !navigationStartedRef.current) {
        setError(message);
        setPlanning(false);
      }
    } finally {
      logger("pipeline", "finished", { navigated: navigationStartedRef.current });
      if (isMountedRef.current) {
        setIsSaving(false);
        setPlanning(false);
      }
    }
  };

  const motivationLabel = motivations.find((item) => item.value === motivation)?.label ?? "Motivation";

  return (
    <AuthGate>
      <div className="relative min-h-screen overflow-hidden bg-[#05060d] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-12%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-sky-500/12 blur-[140px]" />
          <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-violet-500/10 blur-[160px]" />
          <div className="absolute bottom-[-18%] left-[18%] h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-[180px]" />
        </div>

        <main className="relative mx-auto max-w-7xl px-6 py-8 md:px-8 lg:px-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/35">First commitment</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Build your first execution anchor</h1>
              <p className="mt-2 text-sm text-white/50">
                {profile?.displayName ? `${profile.displayName.split(/\s+/)[0]}` : "You"} are setting the commitment that will shape Mission Control.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 md:flex">
              <Sparkles className="h-4 w-4 text-sky-300" />
              Planner-assisted onboarding
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/55">
                  <Target className="h-4 w-4 text-sky-300" />
                  Step {step} of 6
                </div>
                <div className="text-xs text-white/40">Commitments persist first, then Mission Control loads immediately</div>
              </div>

              <div className="mb-6 flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <div
                    key={value}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-all",
                      value <= step ? "bg-gradient-to-r from-sky-400 to-cyan-400" : "bg-white/10"
                    )}
                  />
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold">What are you committing to?</h2>
                    <p className="mt-1 text-sm text-white/50">Start with a template or define your own commitment.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {commitTypes.map((type) => {
                      const active = type.category === selectedType;
                      return (
                        <button
                          key={type.title}
                          type="button"
                          onClick={() => {
                            setSelectedType(type.category);
                            if (type.category !== "other" && !customTitle.trim()) {
                              setCustomTitle(type.title);
                            }
                          }}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
                            active
                              ? "border-sky-400/30 bg-sky-400/10 shadow-lg shadow-sky-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          )}
                        >
                          <p className="text-sm font-medium">{type.title}</p>
                          <p className="mt-1 text-xs leading-5 text-white/45">{type.description}</p>
                        </button>
                      );
                    })}
                  </div>
                  <label className="block space-y-2">
                    <span className="text-sm text-white/60">Commitment title</span>
                    <Input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder={selectedTemplate.title} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-white/60">Description</span>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="What needs to happen? What does success look like?"
                    />
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold">When is the deadline?</h2>
                    <p className="mt-1 text-sm text-white/50">Choose a date so Hourglass can plan around it.</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <label className="block space-y-2">
                      <span className="text-sm text-white/60">Deadline</span>
                      <Input type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} />
                    </label>
                    <div className="mt-4 flex items-center gap-3 text-sm text-white/55">
                      <CalendarDays className="h-4 w-4 text-sky-300" />
                      Timeline will be built around this date.
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold">Priority</h2>
                    <p className="mt-1 text-sm text-white/50">Tell Hourglass how aggressively to protect this commitment.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PRIORITY_OPTIONS.map((option) => {
                      const active = option.value === priority;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPriority(option.value)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
                            active
                              ? "border-orange-400/30 bg-orange-400/10 shadow-lg shadow-orange-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          )}
                        >
                          <p className="text-sm font-medium">{option.label}</p>
                          <p className="mt-1 text-xs leading-5 text-white/45">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold">Estimated effort</h2>
                    <p className="mt-1 text-sm text-white/50">Choose the scale so planning feels realistic.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {effortOptions.map((option) => {
                      const active = option.value === effort;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setEffort(option.value)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
                            active
                              ? "border-emerald-400/30 bg-emerald-400/10 shadow-lg shadow-emerald-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          )}
                        >
                          <p className="text-sm font-medium">{option.label}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3 text-sm text-white/55">
                      <Clock3 className="h-4 w-4 text-emerald-300" />
                      Suggested estimate: {suggestion.estimatedHours} hours
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold">Motivation</h2>
                    <p className="mt-1 text-sm text-white/50">Pick the emotional energy behind this commitment.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {motivations.map((item) => {
                      const active = item.value === motivation;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setMotivation(item.value)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
                            active
                              ? "border-fuchsia-400/30 bg-fuchsia-400/10 shadow-lg shadow-fuchsia-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          )}
                        >
                          <p className="text-2xl">{item.value}</p>
                          <p className="mt-2 text-sm font-medium text-white">{item.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold">Review commitment</h2>
                    <p className="mt-1 text-sm text-white/50">Double-check the summary before Hourglass takes over planning.</p>
                  </div>
                  <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-2">
                    {[
                      ["Commitment", customTitle.trim() || selectedTemplate.title],
                      ["Deadline", new Date(`${deadlineDate}T23:59:59`).toLocaleDateString()],
                      ["Priority", PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? priority],
                      ["Estimated Work", `${effort} hours`],
                      ["Motivation", motivationLabel],
                      ["Category", CATEGORY_OPTIONS.find((option) => option.value === selectedType)?.label ?? "Other"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">{label}</p>
                        <p className="mt-2 text-sm font-medium text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              {planningError && (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                  {planningError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((current) => Math.max(1, current - 1))}
                  disabled={step === 1 || isSaving || planning}
                  className="border-white/15 bg-white/5"
                >
                  Back
                </Button>

                {step < 6 ? (
                  <Button type="button" onClick={() => setStep((current) => Math.min(6, current + 1))} disabled={isSaving || planning}>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleFinish} disabled={isSaving || planning}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving commitment...
                      </>
                    ) : (
                      <>
                        Finish and Plan
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </section>

            <section className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">AI draft</p>
                    <p className="text-xs text-white/45">Adaptive planning preview based on your answers.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">Commitment</p>
                    <p className="mt-2 text-sm font-medium text-white">{customTitle.trim() || selectedTemplate.title}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">Risk posture</p>
                    <p className="mt-2 text-sm font-medium text-white">{suggestion.executionHealth}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">First step</p>
                    <p className="mt-2 text-sm font-medium text-white">{suggestion.firstStep}</p>
                  </div>
                </div>
              </motion.div>

              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">What happens next</p>
                    <p className="text-xs text-white/45">Save, navigate, then continue planning and enrichment without blocking the user.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2 text-sm text-white/60">
                  {[
                    "Validate your commitment data",
                    "Save to Firestore with an idempotent document id",
                    "Optimistically update local state",
                    "Navigate to Mission Control immediately after persistence",
                    "Continue planning and preload in the background with timeouts",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>

        {(planning || planningError) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 px-6 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/35">AI Planning</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Preparing Mission Control</h2>
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10"
                >
                  <Hourglass className="h-5 w-5 text-sky-300" />
                </motion.div>
              </div>

              <div className="mt-6 space-y-3">
                {planningStages.map((stage, index) => {
                  const active = index <= planningStage;
                  return (
                    <div
                      key={stage}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm transition-all",
                        active ? "border-emerald-400/20 bg-emerald-400/10 text-white" : "border-white/10 bg-white/5 text-white/45"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span>{stage}</span>
                        {active ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
                          style={{ width: active ? "100%" : "12%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                <p className="font-medium text-white">Planning in motion</p>
                <p className="mt-1">The commitment is already saved. Mission Control is available immediately while enrichment continues in the background.</p>
              </div>

              {planningError && (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50">
                  {planningError}
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void retryPlanning()}
                      className="border-white/15 bg-white/5"
                      disabled={!savedTask || !savedTaskSet}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry planning
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
