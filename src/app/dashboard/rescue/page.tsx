"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useIntelligence } from "@/lib/execution/use-intelligence";
import { motion } from "framer-motion";
import { Shield, ArrowLeft, Lightbulb, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RescuePage() {
  const { tasks } = useHourglassStore();
  const { report } = useIntelligence();
  const rescue = report?.rescue;
  const recommendations = report?.capacity.recommendations ?? [];

  if (!rescue || rescue.atRiskTasks.length === 0) {
    return (
      <DashboardShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">No rescue analysis needed</h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            {tasks.length === 0
              ? "Create commitments in Mission Control. Rescue Mode activates automatically when workload exceeds capacity."
              : "All commitments appear to be within capacity. No tasks require intervention at this time."}
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Mission Control
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Rescue Mode</h1>
          <p className="mt-1 text-sm text-white/40">
            Automated interventions when capacity is insufficient to meet deadlines
          </p>
        </motion.div>

        {/* Overall status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            "mt-6 rounded-2xl border p-5",
            rescue.overallRiskLevel === "critical"
              ? "border-red-500/30 bg-red-500/10"
              : rescue.overallRiskLevel === "high"
                ? "border-orange-500/30 bg-orange-500/10"
                : "border-yellow-500/30 bg-yellow-500/10"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {rescue.overallRiskLevel.charAt(0).toUpperCase() + rescue.overallRiskLevel.slice(1)} Risk Level
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {rescue.atRiskTasks.length} task{rescue.atRiskTasks.length === 1 ? "" : "s"} require attention
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                rescue.confidence.value >= 70
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
              )}>
                {rescue.confidence.value}% confidence
              </span>
              <p className="mt-1 text-[10px] text-white/40">{rescue.confidence.reasoning[0]}</p>
            </div>
          </div>
        </motion.div>

        {/* At-risk tasks */}
        <div className="mt-6 space-y-4">
          {rescue.atRiskTasks.map((task, index) => (
            <motion.div
              key={task.taskId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-2xl border p-5",
                task.failureProbability >= 75
                  ? "border-red-500/30 bg-red-500/[0.06]"
                  : task.failureProbability >= 50
                    ? "border-orange-500/30 bg-orange-500/[0.06]"
                    : task.failureProbability >= 25
                      ? "border-yellow-500/30 bg-yellow-500/[0.06]"
                      : "border-white/10 bg-white/[0.04]"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{task.title}</h3>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      task.failureProbability >= 75 ? "bg-red-500/20 text-red-300" : 
                      task.failureProbability >= 50 ? "bg-orange-500/20 text-orange-300" :
                      "bg-yellow-500/20 text-yellow-300"
                    )}>
                      {task.failureProbability}% risk
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.daysUntilDeadline}d until deadline
                    </span>
                    <span>{task.requiredHours}h of work remaining</span>
                    <span>{task.availableBeforeDeadline.toFixed(1)}h capacity available</span>
                    {task.gap > 0 && (
                      <span className="text-red-300">{task.gap}h gap</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gap indicator */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Capacity</span>
                  <span>Required</span>
                </div>
                <div className="mt-1 flex h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (task.availableBeforeDeadline / Math.max(task.requiredHours, task.availableBeforeDeadline)) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                  {task.gap > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (task.gap / Math.max(task.requiredHours, task.availableBeforeDeadline)) * 100)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-red-500"
                    />
                  )}
                </div>
                <div className="mt-1 flex justify-between text-[10px]">
                  <span className="text-emerald-300">{task.availableBeforeDeadline.toFixed(1)}h</span>
                  {task.gap > 0 && <span className="text-red-300">Gap: {task.gap}h</span>}
                  <span className="text-white/60">{task.requiredHours}h</span>
                </div>
              </div>

              {/* Recommended action */}
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
                <div>
                  <p className="text-xs font-medium text-white/80">Recommended Action</p>
                  <p className="mt-0.5 text-xs text-white/50">{task.recommendedAction}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              System Recommendations
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
      </div>
    </DashboardShell>
  );
}
