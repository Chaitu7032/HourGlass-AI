"use client";

import { useMemo, useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  CalendarDays,
  Clock3,
  Play,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentPipeline } from "@/components/dashboard/agent-pipeline";
import { RiskGridCompact } from "@/components/dashboard/risk-heatmap";
import { CommitmentGauge } from "@/components/dashboard/commitment-gauge";
import { RescueBanner } from "@/components/dashboard/rescue-banner";
import { ExecutiveSummary } from "@/components/dashboard/opportunity-panel";
import { PredictionList } from "@/components/dashboard/prediction-detail";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useAuth } from "@/components/auth/auth-provider";
import { createUserTask } from "@/lib/firebase/hooks";
import { TaskDialog } from "@/components/dashboard/task-dialog";
import type { OrchestrationResult } from "@/types";
import { cn, formatProbability, getRiskLabel } from "@/lib/utils";

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

function MissionMetricCard({
  icon: Icon,
  title,
  value,
  helper,
  why,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  helper: string;
  why: string;
  tone: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">{title}</p>
          <div className={cn("mt-2 truncate text-2xl font-semibold tabular-nums", tone)}>{value}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
          <Icon className="h-4 w-4 text-white/60" />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-white/55">{helper}</p>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55">
        <summary className="cursor-pointer list-none text-white/70">Why?</summary>
        <p className="mt-2 leading-5">{why}</p>
      </details>
    </motion.article>
  );
}

function getDaysUntil(deadline: string) {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));
}

export default function MissionControlPage() {
  const { user } = useAuth();
  const {
    tasks,
    orchestration,
    isOrchestrating,
    orchestrationProgress,
    workspaceHydrated,
    setOrchestration,
    setIsOrchestrating,
    appendOrchestrationLog,
    clearOrchestrationProgress,
  } = useHourglassStore();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogError, setTaskDialogError] = useState<string | null>(null);
  const [taskDialogSaving, setTaskDialogSaving] = useState(false);

  const sortedRiskAssessments = useMemo(
    () => [...(orchestration?.riskAssessments ?? [])].sort((a, b) => b.failureProbability - a.failureProbability),
    [orchestration?.riskAssessments]
  );
  const highestRisk = sortedRiskAssessments[0] ?? null;
  const latestAgentLog = orchestrationProgress.at(-1) ?? orchestration?.agentLogs.at(-1) ?? null;
  const nextDeepWorkWindow = orchestration?.energyProfile.peakWindows[0] ?? null;
  const totalRequiredHours = tasks.reduce((sum, task) => sum + Math.max(0, task.estimatedHours - task.completedHours), 0);
  const upcomingDeadline = useMemo(() => {
    if (!tasks.length) return null;
    return [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0] ?? null;
  }, [tasks]);
  const totalFreeHours = orchestration?.energyProfile.totalFreeHours ?? 0;
  const productiveHours = orchestration?.energyProfile.productiveHours ?? 0;
  const energyScore = orchestration?.energyProfile.energyScore ?? null;
  const currentCapacityRatio = totalFreeHours > 0 ? Math.round((productiveHours / totalFreeHours) * 100) : null;
  const hasNoTasks = tasks.length === 0;

  const runAnalysis = async (tasksToAnalyze: typeof tasks = tasks) => {
    if (tasksToAnalyze.length === 0) return;
    setIsOrchestrating(true);
    clearOrchestrationProgress();

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasksToAnalyze,
          userId: user?.uid,
        }),
      });

      if (!res.ok) {
        throw new Error("Orchestration failed");
      }

      const result: OrchestrationResult = await res.json();

      for (const log of result.agentLogs) {
        appendOrchestrationLog(log);
        await new Promise((r) => setTimeout(r, 120));
      }

      setOrchestration(result);
    } catch {
      setIsOrchestrating(false);
    } finally {
      setIsOrchestrating(false);
    }
  };

  const handleAddTask = () => {
    setTaskDialogError(null);
    setTaskDialogOpen(true);
  };

  const handleCreateTask = async (values: {
    title: string;
    description: string;
    deadline: string;
    estimatedHours: number;
    priority: "critical" | "high" | "medium" | "low";
    category:
      | "exam"
      | "interview"
      | "hackathon"
      | "assignment"
      | "project"
      | "meeting"
      | "personal"
      | "research"
      | "coding_project"
      | "startup"
      | "open_source"
      | "health"
      | "finance"
      | "learning"
      | "work"
      | "career"
      | "side_project"
      | "other";
    complexity: number;
  }) => {
    setTaskDialogSaving(true);
    setTaskDialogError(null);

    try {
      if (!user) {
        throw new Error("You must be signed in to add a task.");
      }

      const savedTask = await createUserTask(user.uid, {
        title: values.title,
        description: values.description,
        deadline: values.deadline,
        estimatedHours: values.estimatedHours,
        completedHours: 0,
        priority: values.priority,
        category: values.category,
        complexity: values.complexity,
      });

      const currentTasks = useHourglassStore.getState().tasks;
      const nextTasks = [savedTask, ...currentTasks.filter((task) => task.id !== savedTask.id)];
      useHourglassStore.getState().setTasks(nextTasks);
      setTaskDialogOpen(false);

      // Immediately run the agent pipeline against the persisted task set.
      await runAnalysis(nextTasks);
    } catch (error) {
      setTaskDialogError(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setTaskDialogSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
              Mission Control
            </motion.h1>
            <p className="text-sm text-white/40">
              {workspaceHydrated
                ? `${tasks.length} active commitment${tasks.length === 1 ? "" : "s"}`
                : "Loading your workspace..."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add Commitment
            </Button>
            <Button onClick={() => runAnalysis()} disabled={isOrchestrating || hasNoTasks}>
              {isOrchestrating ? (
                <>
                  <Zap className="h-4 w-4 animate-pulse" />
                  Agents Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Planning
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {!workspaceHydrated && (
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        )}

        {workspaceHydrated && orchestration && (
          <div className="mb-6 sm:mb-8 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <MissionMetricCard
              icon={Sparkles}
              title="Today's Priority"
              value={highestRisk?.taskTitle ?? tasks[0]?.title ?? "No priority set"}
              helper={
                highestRisk
                  ? `${getRiskLabel(highestRisk.failureProbability)} risk · ${formatProbability(highestRisk.failureProbability)} failure probability`
                  : "Planner will surface the highest-value commitment once analysis runs."
              }
              why={
                highestRisk
                  ? `The Risk Agent highlighted "${highestRisk.taskTitle}" because it currently has the highest failure probability in the queue.`
                  : "No risk assessment has been generated yet, so there is not enough evidence to rank a priority."
              }
              tone="text-white"
            />
            <MissionMetricCard
              icon={AlertTriangle}
              title="Current Risk"
              value={highestRisk ? formatProbability(highestRisk.failureProbability) : "Not ready"}
              helper={
                highestRisk
                  ? `${orchestration.rescuePlans.length} rescue plan${orchestration.rescuePlans.length === 1 ? "" : "s"} active`
                  : "Run planning to generate explainable risk signals."
              }
              why={
                highestRisk
                  ? "This comes from the Risk Agent and is based on task complexity, deadline proximity, and capacity signals."
                  : "Risk cannot be estimated until the planner and risk agents have enough task data."
              }
              tone={highestRisk && highestRisk.failureProbability >= 0.75 ? "text-red-300" : "text-orange-300"}
            />
            <MissionMetricCard
              icon={Clock3}
              title="Next Deep Work Session"
              value={nextDeepWorkWindow ? `${nextDeepWorkWindow.start} - ${nextDeepWorkWindow.end}` : "Not mapped"}
              helper={
                nextDeepWorkWindow
                  ? `Peak energy score ${nextDeepWorkWindow.score}% · protected focus window`
                  : "The Calendar Agent will place a protected focus block after analysis."
              }
              why={
                nextDeepWorkWindow
                  ? "This window comes from the Energy Agent and Calendar Agent pairing, using the best available focus slot in your day."
                  : "No energy-aware schedule exists yet, so Hourglass has not mapped a deep work slot."
              }
              tone="text-cyan-300"
            />
            <MissionMetricCard
              icon={Brain}
              title="Current Capacity"
              value={totalFreeHours > 0 ? `${formatHours(productiveHours)} / ${formatHours(totalFreeHours)}` : "Not enough data"}
              helper={
                currentCapacityRatio !== null
                  ? `${currentCapacityRatio}% of free time appears executable${energyScore !== null ? ` · energy score ${energyScore}/100` : ""}`
                  : "The Energy Agent needs a generated plan to estimate capacity."
              }
              why={
                orchestration
                  ? `Capacity is derived from the Energy Profile: ${formatHours(orchestration.energyProfile.productiveHours)} productive hours out of ${formatHours(orchestration.energyProfile.totalFreeHours)} free.`
                  : "There is no energy profile yet, so capacity cannot be responsibly estimated."
              }
              tone={currentCapacityRatio !== null && currentCapacityRatio < 40 ? "text-red-300" : "text-emerald-300"}
            />
            <MissionMetricCard
              icon={Activity}
              title="Recent Agent Activity"
              value={latestAgentLog ? latestAgentLog.agent : "Waiting"}
              helper={
                latestAgentLog
                  ? latestAgentLog.message
                  : "Planner, Risk, Calendar, and Memory activity will appear here live."
              }
              why={
                latestAgentLog
                  ? "This is the most recent agent event in the orchestration stream."
                  : "No agent logs have been emitted yet, so Mission Control is still idle."
              }
              tone="text-violet-300"
            />
            <MissionMetricCard
              icon={CalendarDays}
              title="Upcoming Deadline"
              value={upcomingDeadline ? new Date(upcomingDeadline.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "None"}
              helper={
                upcomingDeadline
                  ? `${upcomingDeadline.title} · ${getDaysUntil(upcomingDeadline.deadline)} day(s) left`
                  : "Add a commitment with a deadline to make the timeline actionable."
              }
              why={
                upcomingDeadline
                  ? "This is the nearest deadline in your commitment list, which the Calendar Agent uses to protect the timeline."
                  : "Without a deadline, Hourglass cannot generate a protected timeline or deadline risk."
              }
              tone="text-white"
            />
            <MissionMetricCard
              icon={Zap}
              title="Execution Health"
              value={orchestration.commitmentScore.trend === "declining" ? "Declining" : orchestration.commitmentScore.trend}
              helper={`Commitment score ${Math.round(orchestration.commitmentScore.overall)} / 100 · ${Math.round(orchestration.commitmentScore.reliability)} reliability`}
              why="The commitment score is based on completion rate, planning quality, execution consistency, recovery ability, focus, and reliability."
              tone={
                orchestration.commitmentScore.trend === "declining"
                  ? "text-red-300"
                  : orchestration.commitmentScore.trend === "improving"
                    ? "text-emerald-300"
                    : "text-yellow-300"
              }
            />
          </div>
        )}

        {/* Agent Pipeline */}
        {(isOrchestrating || orchestrationProgress.length > 0) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-6 sm:mb-8 glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <AgentPipeline logs={orchestrationProgress} isRunning={isOrchestrating} />
          </motion.div>
        )}

        {/* Empty state when no tasks */}
        {hasNoTasks && workspaceHydrated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold">No commitments yet</h2>
            <p className="mt-2 max-w-md text-sm text-white/50">
              Create your first commitment and Hourglass will begin building your execution model.
              Commitments sync to Firestore and update Mission Control in real time.
            </p>
            <Button className="mt-6" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add Your First Commitment
            </Button>
          </motion.div>
        )}

        {/* Results */}
        {orchestration ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
            <ExecutiveSummary summary={orchestration.executiveSummary} voiceMessage={orchestration.voiceCoachMessage} />

            <RescueBanner rescuePlans={orchestration.rescuePlans} riskAssessments={orchestration.riskAssessments} />

            <RiskGridCompact assessments={orchestration.riskAssessments} />

            <PredictionList assessments={orchestration.riskAssessments} />

            <div className="grid gap-6 lg:grid-cols-2">
              <CommitmentGauge score={orchestration.commitmentScore} />
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-medium text-white/80">Capacity Analysis</h3>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-400">{formatHours(totalRequiredHours)}</div>
                    <div className="text-[10px] text-white/40">Required</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{formatHours(orchestration.energyProfile.totalFreeHours)}</div>
                    <div className="text-[10px] text-white/40">Available</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">{formatHours(orchestration.energyProfile.productiveHours)}</div>
                    <div className="text-[10px] text-white/40">Productive</div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/50">{orchestration.energyProfile.reasoning}</p>
                <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/55">
                  <summary className="cursor-pointer list-none text-white/80">Why?</summary>
                  <div className="mt-3 space-y-2 leading-5">
                    <p>Required hours come from the current commitment list.</p>
                    <p>Available hours come from the Energy Agent.</p>
                    <p>Productive hours are the energy-adjusted portion of free time, not a guess.</p>
                  </div>
                </details>
              </div>
            </div>
          </motion.div>
        ) : workspaceHydrated && !isOrchestrating && tasks.length > 0 ? (
          /* Ready state - tasks loaded but no analysis yet */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-white/40">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} loaded. Ready to analyze.
            </p>
            <Button className="mt-4" onClick={() => runAnalysis()}>
              <Play className="h-4 w-4" />
              Run Planning
            </Button>
          </motion.div>
        ) : null}
      </div>
      <TaskDialog
        key={taskDialogOpen ? "open" : "closed"}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSubmit={handleCreateTask}
        isSaving={taskDialogSaving}
        error={taskDialogError}
      />

      {/* ── Post-Commitment Workflow Overlay ── */}
      <AnimatePresence>
        {(taskDialogSaving || (taskDialogOpen === false && isOrchestrating && orchestrationProgress.length > 0)) && taskDialogOpen === false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full mx-4"
            >
              <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-8 shadow-2xl shadow-black/50">
                {taskDialogSaving ? (
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="mx-auto h-12 w-12 rounded-full border-2 border-blue-400/30 border-t-blue-400"
                    />
                    <h3 className="mt-4 text-lg font-semibold text-white">Saving commitment...</h3>
                    <p className="mt-2 text-sm text-white/50">Writing to Firestore and preparing analysis</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20"
                      >
                        <Sparkles className="h-6 w-6 text-blue-400" />
                      </motion.div>
                      <h3 className="mt-3 text-lg font-semibold text-white">Analyzing commitment</h3>
                      <p className="mt-1 text-sm text-white/50">Agent pipeline is running...</p>
                    </div>

                    <div className="space-y-2">
                      {[
                        { name: "Planner Agent", emoji: "🎯", done: orchestrationProgress.some(l => l.agent === "planner" && l.status === "complete") },
                        { name: "Risk Agent", emoji: "⚠️", done: orchestrationProgress.some(l => l.agent === "risk" && l.status === "complete") },
                        { name: "Calendar Agent", emoji: "📅", done: orchestrationProgress.some(l => l.agent === "calendar" && l.status === "complete") },
                        { name: "Memory Agent", emoji: "🧠", done: orchestrationProgress.some(l => l.agent === "memory" && l.status === "complete") },
                      ].map((step) => (
                        <div key={step.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <motion.div
                            animate={step.done ? { scale: [1, 1.2, 1] } : {}}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg text-xs",
                              step.done ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"
                            )}
                          >
                            {step.done ? "✓" : step.emoji}
                          </motion.div>
                          <span className={cn("text-sm", step.done ? "text-white/80" : "text-white/40")}>
                            {step.name}
                          </span>
                          {!step.done && (
                            <motion.div
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {orchestration && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center"
                      >
                        <p className="text-sm font-medium text-emerald-400">Mission Control ready</p>
                        <p className="mt-1 text-xs text-emerald-400/70">Risk assessment and timeline updated</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
