"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingDown, Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useIntelligence } from "@/lib/execution/use-intelligence";
import { cn } from "@/lib/utils";

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

export default function FutureSelfPage() {
  const { tasks } = useHourglassStore();
  const { report } = useIntelligence();
  const timeline = report?.timeline;
  const capacity = report?.capacity;
  const rescue = report?.rescue;

  if (!timeline || timeline.tasksByWeek.length === 0) {
    return (
      <DashboardShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-violet-500/20">
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">No future simulation yet</h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            {tasks.length === 0
              ? "Add commitments and configure your Execution Profile. Hourglass simulates future trajectories based on your work schedule and workload."
              : "Run planning from Mission Control to generate your future trajectory scenarios."}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Go to Mission Control</Link>
          </Button>
        </motion.div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-white/70">
            <ArrowLeft className="h-3 w-3" />
            Back to Mission Control
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Future Self Simulation</h1>
          <p className="mt-1 text-sm text-white/40">
            Deterministic timeline projection based on your Execution Profile and current workload
          </p>
        </motion.div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Predicted Completion</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-cyan-300">
              {timeline.completionDate ? new Date(timeline.completionDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "N/A"}
            </p>
            <p className="mt-1 text-xs text-white/50">{timeline.totalWeeksRequired} weeks of work</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Weekly Capacity</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-300">
              {formatHours(capacity?.weeklyCapacity.productiveHours ?? 0)}
            </p>
            <p className="mt-1 text-xs text-white/50">productive hours / week</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Confidence</p>
            <p className={cn(
              "mt-2 text-2xl font-semibold tabular-nums",
              timeline.confidence.value >= 70 ? "text-emerald-300" : timeline.confidence.value >= 40 ? "text-yellow-300" : "text-red-300"
            )}>
              {timeline.confidence.value}%
            </p>
            <p className="mt-1 text-xs text-white/50">{timeline.confidence.label} confidence</p>
          </motion.div>
        </div>

        {/* Confidence reasoning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-6 flex flex-wrap gap-1.5"
        >
          {timeline.confidence.reasoning.map((r, i) => (
            <span key={i} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/50">
              {r}
            </span>
          ))}
        </motion.div>

        {/* Weekly timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-white/80">
            <Calendar className="h-4 w-4" />
            Execution Timeline
          </h2>
          <div className="space-y-4">
            {timeline.tasksByWeek.map((week, weekIndex) => (
              <div key={week.weekStart} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/60">Week {weekIndex + 1}</span>
                    <span className="text-xs text-white/40">
                      {new Date(week.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {" - "}
                      {new Date(week.weekEnd).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <span className="text-xs text-white/50">
                    {formatHours(week.totalHoursScheduled)} / {formatHours(week.totalCapacity)}h
                  </span>
                </div>

                {/* Capacity bar */}
                <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(week.totalHoursScheduled / week.totalCapacity) * 100}%` }}
                    transition={{ duration: 0.6, delay: weekIndex * 0.05 }}
                    className={cn(
                      "h-full rounded-full",
                      week.totalHoursScheduled > week.totalCapacity ? "bg-red-500" : "bg-sky-400"
                    )}
                  />
                </div>

                {/* Tasks in this week */}
                <div className="mt-3 space-y-1.5">
                  {week.tasks.map((task) => (
                    <div key={task.taskId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {task.onTrack ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />
                        )}
                        <span className="truncate text-white/70">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white/40">{formatHours(task.scheduledHours)}</span>
                        <span className={cn(
                          "text-[10px]",
                          task.onTrack ? "text-emerald-400" : "text-red-400"
                        )}>
                          {task.onTrack ? "On track" : "At risk"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Risk summary */}
        {rescue && rescue.atRiskTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-200">
              <AlertTriangle className="h-4 w-4" />
              Tasks at Risk of Missing Deadline
            </h3>
            <div className="space-y-2">
              {rescue.atRiskTasks.map((task) => (
                <div key={task.taskId} className="flex items-center justify-between rounded-xl border border-red-500/20 bg-black/20 px-4 py-2.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-white/80">{task.title}</span>
                    <span className="ml-2 text-white/40">{task.daysUntilDeadline}d left</span>
                  </div>
                  <span className="ml-2 shrink-0 text-red-300">{task.failureProbability}% risk</span>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Button asChild variant="outline" size="sm" className="border-red-500/30 text-red-200">
                <Link href="/dashboard/rescue">View Rescue Plans</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}