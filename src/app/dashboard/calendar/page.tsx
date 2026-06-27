"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useIntelligence } from "@/lib/execution/use-intelligence";
import { motion } from "framer-motion";
import { Calendar, ArrowLeft, Clock, Zap, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

function getDeepWorkIcon(window: string) {
  switch (window) {
    case "morning": return Sun;
    case "afternoon": return Sun;
    case "evening": return Moon;
    case "night": return Moon;
    default: return Zap;
  }
}

export default function TimelinePage() {
  const { tasks } = useHourglassStore();
  const { report, executionProfile } = useIntelligence();
  const timeline = report?.timeline;
  const capacity = report?.capacity;

  const hasNoTasks = tasks.length === 0;

  if (!executionProfile || !capacity) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold">Set up your Execution Profile first</h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            Hourglass needs your work schedule to generate a timeline. Configure your profile in Settings.
          </p>
          <Button asChild className="mt-6">
            <Link href="/settings">Go to Settings</Link>
          </Button>
        </div>
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
          <h1 className="mt-2 text-2xl font-bold">Timeline</h1>
          <p className="mt-1 text-sm text-white/40">
            Scheduled work based on your Execution Profile and commitments
          </p>
        </motion.div>

        {/* Weekly schedule overview */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
              <Clock className="h-4 w-4" />
              Work Schedule
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-xs">
                <span className="text-white/60">Working Days</span>
                <span className="font-medium text-white">
                  {executionProfile.workingDays
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                    .join(", ")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-xs">
                <span className="text-white/60">Hours</span>
                <span className="font-medium text-white">
                  {executionProfile.workStartTime} - {executionProfile.workEndTime}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-xs">
                <span className="text-white/60">Productive Capacity</span>
                <span className="font-medium text-sky-300">
                  {formatHours(capacity.weeklyCapacity.productiveHours)} / week
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-xs">
                <span className="text-white/60">Break Time</span>
                <span className="font-medium text-white">{formatHours(capacity.weeklyCapacity.breakHours)} / week</span>
              </div>
            </div>
          </motion.div>

          {/* Deep work windows */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
              <Zap className="h-4 w-4 text-yellow-300" />
              Deep Work Windows
            </h2>
            <div className="space-y-2">
              {capacity.deepWorkSlots.map((slot, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-sky-300" />
                    <span className="font-medium capitalize text-sky-200">{slot.day}</span>
                  </div>
                  <span className="text-sky-300/80">
                    {slot.start} - {slot.end} ({formatHours(slot.durationHours)})
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Daily breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h2 className="mb-4 text-sm font-medium text-white/80">Daily Capacity Breakdown</h2>
          <div className="space-y-3">
            {capacity.weeklyCapacity.dailyBreakdown.map((day, i) => (
              <div key={day.day} className="flex items-center gap-3">
                <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-xs font-medium capitalize text-white/60">
                  {day.day.slice(0, 3)}
                </div>
                <div className="flex-1">
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(day.productiveHours / day.totalHours) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${((day.totalHours - day.productiveHours) / day.totalHours) * 100}%`,
                      }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="h-full rounded-full bg-white/10"
                    />
                  </div>
                </div>
                <div className="w-28 text-right">
                  <span className="text-xs font-medium text-sky-300">{formatHours(day.productiveHours)}</span>
                  <span className="text-xs text-white/40"> / {formatHours(day.totalHours)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-400" />
              <span className="text-white/50">Productive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-white/10" />
              <span className="text-white/50">Break / Buffer</span>
            </div>
          </div>
        </motion.div>

        {/* Workload vs capacity */}
        {timeline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          >
            <h2 className="mb-4 text-sm font-medium text-white/80">Workload Timeline</h2>
            <div className="space-y-4">
              {timeline.tasksByWeek.length === 0 ? (
                <p className="text-xs text-white/40">
                  No tasks scheduled. Add commitments to see your timeline.
                </p>
              ) : (
                timeline.tasksByWeek.map((week, i) => (
                  <div key={week.weekStart} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/60">
                        Week of {new Date(week.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-white/40">
                        {formatHours(week.totalHoursScheduled)} / {formatHours(week.totalCapacity)}h
                      </span>
                    </div>
                    <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(week.totalHoursScheduled / week.totalCapacity) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className={cn(
                          "h-full rounded-full",
                          week.totalHoursScheduled > week.totalCapacity ? "bg-red-500" : "bg-sky-400"
                        )}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {week.tasks.map((task) => (
                        <span
                          key={task.taskId}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px]",
                            task.onTrack
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                          )}
                        >
                          {task.title} ({formatHours(task.scheduledHours)})
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {hasNoTasks && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-8 max-w-md text-center"
          >
            <p className="text-sm text-white/40">
              Your schedule is configured. Add commitments to build your timeline.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard">Go to Mission Control</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}