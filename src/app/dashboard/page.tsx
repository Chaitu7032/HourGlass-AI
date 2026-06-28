"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  CalendarDays,
  Clock3,
  Plus,
  Sparkles,
  Zap,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useAuth } from "@/components/auth/auth-provider";
import { useExecutionProfile } from "@/lib/execution/use-intelligence";
import { createUserTask } from "@/lib/firebase/hooks";
import { TaskDialog } from "@/components/dashboard/task-dialog";
import { cn, generateId } from "@/lib/utils";
import { computeIntelligenceReport } from "@/lib/execution/intelligence-engine";
import Link from "next/link";
import type { ExecutionProfile } from "@/types/execution-profile";
import type { OrchestrationResult } from "@/types";

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
  icon: React.ComponentType<{ className?: string }>;
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
        <summary className="cursor-pointer list-none text-white/70">Reasoning</summary>
        <p className="mt-2 leading-5">{why}</p>
      </details>
    </motion.article>
  );
}

function getDaysUntil(deadline: string) {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));
}

function ConfidenceBadge({ value }: { value: number }) {
  const label = value >= 70 ? "high" : value >= 40 ? "medium" : "low";
  const color =
    label === "high"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : label === "medium"
        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
        : "bg-red-500/20 text-red-300 border-red-500/30";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", color)}>
      {label} confidence ({value}%)
    </span>
  );
}

export default function MissionControlPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { tasks, workspaceHydrated } = useHourglassStore();
  const { loadProfile, getLocalProfile } = useExecutionProfile();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogError, setTaskDialogError] = useState<string | null>(null);
  const [taskDialogSaving, setTaskDialogSaving] = useState(false);
  const [executionProfile, setExecutionProfile] = useState<ExecutionProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Load execution profile on mount
  useEffect(() => {
    let active = true;

    void (async () => {
      const local = getLocalProfile();
      if (local?.profileComplete) {
        if (active) {
          setExecutionProfile(local);
          setProfileLoading(false);
        }
        return;
      }

      const loaded = await loadProfile();
      if (!active) return;

      if (loaded) setExecutionProfile(loaded);
      setProfileLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [getLocalProfile, loadProfile]);

  // Compute intelligence report from profile + tasks
  const intelligence = useMemo(() => {
    if (!executionProfile || executionProfile.workingDays.length === 0) return null;
    return computeIntelligenceReport(
      executionProfile,
      tasks,
      executionProfile.calendarConnected,
      0
    );
  }, [executionProfile, tasks]);

  const hasTasks = tasks.length > 0;
  const hasProfile = executionProfile?.profileComplete ?? false;
  const hasNoProfile = !profileLoading && !hasProfile;
  const firstName = profile?.displayName?.trim().split(/\s+/)[0] ?? "there";

  // Derived metrics from intelligence
  const capacity = intelligence?.capacity;
  const workload = capacity?.workload;
  const rescue = intelligence?.rescue;
  const timeline = intelligence?.timeline;
  const recommendations = capacity?.recommendations ?? [];
  const confidence = intelligence?.capacity.confidence;

  const upcomingDeadline = useMemo(() => {
    if (!tasks.length) return null;
    return [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0] ?? null;
  }, [tasks]);

  const handleAddTask = () => {
    setTaskDialogError(null);
    setTaskDialogOpen(true);
  };

  const handleCreateTask = useCallback(async (values: {
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

      const taskId = generateId();
      const savedTask = await createUserTask(user.uid, {
        id: taskId,
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

      // Background orchestration — fire and forget so the dashboard updates
      void fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: nextTasks, userId: user.uid }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const result = await res.json();
          if (result && typeof result === 'object') {
            useHourglassStore.getState().setOrchestration(result as OrchestrationResult);
          }
        })
        .catch(() => {
          // Orchestration failure is non-critical — dashboard still shows local data
        });
    } catch (error) {
      setTaskDialogError(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setTaskDialogSaving(false);
    }
  }, [user]);

  // Check if user needs to complete execution profile
  if (hasNoProfile) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Logo size="md" variant="light" className="mb-5" />
          <h2 className="text-xl font-semibold">Set up your Execution Profile first</h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            Hourglass needs your work schedule, energy profile, and preferences to compute real analytics.
            This only takes a minute and works without any external integrations.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => router.push("/settings")}>
              Configure Execution Profile
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => router.push("/onboarding")} className="border-white/15 bg-white/5">
              Resume Onboarding
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

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
                : `Preparing Mission Control for ${firstName}...`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {confidence && (
              <ConfidenceBadge value={confidence.value} />
            )}
            <Button variant="outline" size="sm" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add Commitment
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
              <Settings className="h-4 w-4" />
              Profile
            </Button>
          </div>
        </div>

        {/* Profile summary notice */}
        {executionProfile && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-200"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              Current estimates are based on your configured work schedule
              {executionProfile.calendarConnected ? " and connected calendar." : "."}
            </span>
            {!executionProfile.calendarConnected && (
              <span className="ml-auto shrink-0">
                <button className="text-xs text-sky-300 underline hover:text-sky-200">
                  Connect Google Calendar
                </button>
                <span className="ml-1 text-sky-300/60">to improve prediction accuracy</span>
              </span>
            )}
          </motion.div>
        )}

        {/* Intelligence metrics when profile exists */}
        {hasProfile && intelligence && (
          <div className="mb-6 sm:mb-8 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <MissionMetricCard
              icon={Sparkles}
              title="Current Capacity"
              value={workload ? `${formatHours(workload.availableCapacity)} / week` : "Computing..."}
              helper={
                workload
                  ? `${workload.utilization}% utilized · ${formatHours(workload.remainingHours)} remaining work`
                  : "Add commitments to see capacity"
              }
              why={`Available capacity is ${formatHours(workload?.availableCapacity ?? 0)}h/week based on ${capacity?.weeklyCapacity.workingDaysCount ?? 0} working days at ${executionProfile?.productiveHours ?? 5}h productive capacity per day.`}
              tone={workload?.utilization && workload.utilization > 100 ? "text-red-300" : "text-emerald-300"}
            />
            <MissionMetricCard
              icon={AlertTriangle}
              title="Workload Utilization"
              value={workload ? `${workload.utilization}%` : "No data"}
              helper={
                workload?.overallocated
                  ? `Overallocated by ${formatHours(workload.overallocationAmount)}`
                  : workload
                    ? `${formatHours(workload.remainingHours)}h of ${formatHours(workload.availableCapacity)}h used`
                    : "Add tasks to calculate"
              }
              why={
                workload
                  ? `You have ${formatHours(workload.remainingHours)}h of work remaining and ${formatHours(workload.availableCapacity)}h of weekly productive capacity.`
                  : "No workload data available."
              }
              tone={
                workload?.utilization && workload.utilization >= 100
                  ? "text-red-300"
                  : workload?.utilization && workload.utilization > 80
                    ? "text-orange-300"
                    : "text-emerald-300"
              }
            />
            <MissionMetricCard
              icon={Brain}
              title="Execution Confidence"
              value={
                confidence
                  ? `${confidence.label.charAt(0).toUpperCase() + confidence.label.slice(1)}`
                  : "Not available"
              }
              helper={confidence ? `${confidence.value}% · ${confidence.reasoning[0] ?? ""}` : "Complete profile for confidence"}
              why={
                confidence
                  ? confidence.reasoning.map((r) => `- ${r}`).join("\n")
                  : "Confidence is based on data completeness across profile, tasks, and integrations."
              }
              tone={
                confidence?.value && confidence.value >= 70
                  ? "text-emerald-300"
                  : confidence?.value && confidence.value >= 40
                    ? "text-yellow-300"
                    : "text-red-300"
              }
            />
            <MissionMetricCard
              icon={Clock3}
              title="Burnout Risk"
              value={capacity?.riskOfBurnout ? capacity.riskOfBurnout.charAt(0).toUpperCase() + capacity.riskOfBurnout.slice(1) : "Unknown"}
              helper={
                capacity?.riskOfBurnout === "high"
                  ? `${capacity.recoveryThreshold}h recovery recommended`
                  : capacity?.riskOfBurnout === "moderate"
                    ? "Monitor workload closely"
                    : "Sustainable pace"
              }
              why={`Burnout risk is ${capacity?.riskOfBurnout ?? "unknown"} based on ${workload?.utilization ?? 0}% utilization and ${executionProfile?.recoveryHours ?? 4}h recovery threshold.`}
              tone={capacity?.riskOfBurnout === "high" ? "text-red-300" : capacity?.riskOfBurnout === "moderate" ? "text-orange-300" : "text-emerald-300"}
            />
            <MissionMetricCard
              icon={Activity}
              title="Predicted Completion"
              value={timeline?.completionDate ? new Date(timeline.completionDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No estimate"}
              helper={
                timeline
                  ? `${timeline.totalWeeksRequired} week${timeline.totalWeeksRequired === 1 ? "" : "s"} of work planned`
                  : "Add commitments to generate timeline"
              }
              why={
                timeline?.completionDate
                  ? `Based on weekly capacity of ${formatHours(capacity?.weeklyCapacity.productiveHours ?? 0)}h and ${timeline.totalWeeksRequired} weeks of scheduled work.`
                  : "A completion estimate requires at least one commitment with a deadline."
              }
              tone="text-cyan-300"
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
                  ? "This is the nearest deadline in your commitment list."
                  : "Without a deadline, Hourglass cannot generate a protected timeline or deadline risk."
              }
              tone="text-white"
            />
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
              <Zap className="h-4 w-4 text-yellow-300" />
              Recommendations
            </h3>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-xs leading-5 text-white/70">
                  {rec}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Risk summary */}
        {rescue && rescue.atRiskTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className={cn(
              "rounded-2xl border p-4",
              rescue.overallRiskLevel === "critical"
                ? "border-red-500/30 bg-red-500/10"
                : rescue.overallRiskLevel === "high"
                  ? "border-orange-500/30 bg-orange-500/10"
                  : "border-yellow-500/30 bg-yellow-500/10"
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Risk Assessment: {rescue.overallRiskLevel.charAt(0).toUpperCase() + rescue.overallRiskLevel.slice(1)}
                  </h3>
                  <p className="mt-1 text-xs text-white/60">
                    {rescue.atRiskTasks.length} task{rescue.atRiskTasks.length === 1 ? "" : "s"} need attention
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="border-white/10">
                  <Link href="/dashboard/risk">View details</Link>
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {rescue.atRiskTasks.slice(0, 3).map((task) => (
                  <div key={task.taskId} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-white/80">{task.title}</span>
                      <span className="ml-2 text-white/40">{task.daysUntilDeadline}d left</span>
                    </div>
                    <span className={cn(
                      "ml-2 shrink-0 font-medium",
                      task.failureProbability >= 75 ? "text-red-300" : task.failureProbability >= 50 ? "text-orange-300" : "text-yellow-300"
                    )}>
                      {task.failureProbability}% risk
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Capacity Analysis */}
        {capacity && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Weekly breakdown */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-sm font-medium text-white/80">Weekly Capacity Breakdown</h3>
                <div className="space-y-3">
                  {capacity.weeklyCapacity.dailyBreakdown.map((day) => (
                    <div key={day.day} className="flex items-center gap-3">
                      <span className="w-10 text-xs font-medium capitalize text-white/60">
                        {day.day.slice(0, 3)}
                      </span>
                      <div className="flex-1">
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                            style={{ width: `${(day.productiveHours / Math.max(...capacity.weeklyCapacity.dailyBreakdown.map((d) => d.totalHours))) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-16 text-right text-xs tabular-nums text-white/60">
                        {formatHours(day.productiveHours)} / {formatHours(day.totalHours)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/50">
                  <span>Weekly total: {formatHours(capacity.weeklyCapacity.totalAvailableHours)}h available</span>
                  <span>{formatHours(capacity.weeklyCapacity.productiveHours)}h productive</span>
                </div>
              </div>

              {/* Deep work slots */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-sm font-medium text-white/80">Deep Work Windows</h3>
                <div className="space-y-2">
                  {capacity.deepWorkSlots.map((slot) => (
                    <div
                      key={`${slot.day}-${slot.start}`}
                      className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3"
                    >
                      <div>
                        <span className="text-sm font-medium capitalize text-sky-200">{slot.day}</span>
                        <span className="ml-2 text-xs text-sky-300/70">{slot.date}</span>
                      </div>
                      <span className="text-xs text-sky-200">
                        {slot.start} - {slot.end} ({formatHours(slot.durationHours)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state when no tasks but profile exists */}
        {hasProfile && !hasTasks && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-16 text-center shadow-2xl shadow-black/10 backdrop-blur-2xl"
          >
            <div className="relative mb-6 flex items-center justify-center rounded-[28px] border border-white/10 bg-gradient-to-br from-sky-500/15 via-white/5 to-violet-500/15 px-5 py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                className="absolute inset-0 rounded-[28px] border border-sky-400/10"
              />
              <Logo size="lg" variant="light" />
            </div>
            <h2 className="text-2xl font-semibold">Your future starts today.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Your Execution Profile is ready. Create your first commitment and Hourglass will predict, plan, and protect your success.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="min-w-[220px]" onClick={() => router.push("/commitments/new")}>
                Create Your First Commitment
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-white/15 bg-white/5" onClick={handleAddTask}>
                Add Commitment
              </Button>
            </div>
          </motion.div>
        )}

        {/* Loading profile */}
        {profileLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-16"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="mx-auto h-10 w-10 rounded-full border-2 border-sky-400/30 border-t-sky-400"
              />
              <p className="mt-4 text-sm text-white/50">Loading your Execution Profile...</p>
            </div>
          </motion.div>
        )}
      </div>

      <TaskDialog
        key={taskDialogOpen ? "open" : "closed"}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSubmit={handleCreateTask}
        isSaving={taskDialogSaving}
        error={taskDialogError}
      />
    </DashboardShell>
  );
}
