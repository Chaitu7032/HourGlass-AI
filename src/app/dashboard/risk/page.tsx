"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useIntelligence } from "@/lib/execution/use-intelligence";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BarChart3, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function getRiskColor(probability: number): string {
  if (probability >= 75) return "text-red-300";
  if (probability >= 50) return "text-orange-300";
  if (probability >= 25) return "text-yellow-300";
  return "text-emerald-300";
}

function FailureBar({ probability, label }: { probability: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-medium text-white/60">{label}</span>
      <div className="flex-1">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${probability}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              probability >= 75 ? "bg-red-500" : probability >= 50 ? "bg-orange-500" : probability >= 25 ? "bg-yellow-500" : "bg-emerald-500"
            )}
          />
        </div>
      </div>
      <span className={cn("w-12 text-right text-xs font-medium tabular-nums", getRiskColor(probability))}>
        {probability}%
      </span>
    </div>
  );
}

export default function RiskPage() {
  const { tasks } = useHourglassStore();
  const { report } = useIntelligence();
  const rescue = report?.rescue;

  if (!rescue || rescue.atRiskTasks.length === 0) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <BarChart3 className="h-8 w-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold">No risk assessment yet</h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            {tasks.length === 0
              ? "Create your first commitment in Mission Control. Risk assessment runs automatically based on your Execution Profile."
              : "Your commitments appear to be within capacity. No tasks are currently flagged as at-risk."}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Go to Mission Control</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  // Group by risk level
  const critical = rescue.atRiskTasks.filter((t) => t.failureProbability >= 75);
  const high = rescue.atRiskTasks.filter((t) => t.failureProbability >= 50 && t.failureProbability < 75);
  const moderate = rescue.atRiskTasks.filter((t) => t.failureProbability >= 25 && t.failureProbability < 50);
  const low = rescue.atRiskTasks.filter((t) => t.failureProbability < 25);

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold">Risk Assessment</h1>
          <p className="mt-1 text-sm text-white/40">
            Deterministic failure prediction based on capacity, deadlines, and workload
          </p>
        </motion.div>

        {/* Confidence */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Prediction Confidence</span>
            <span className={cn(
              "text-xs font-medium",
              rescue.confidence.value >= 70 ? "text-emerald-300" : rescue.confidence.value >= 40 ? "text-yellow-300" : "text-red-300"
            )}>
              {rescue.confidence.label.toUpperCase()} ({rescue.confidence.value}%)
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rescue.confidence.reasoning.map((r, i) => (
              <span key={i} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">
                {r}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Risk level overview */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Critical", count: critical.length, color: "bg-red-500/20 text-red-300 border-red-500/30" },
            { label: "High", count: high.length, color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
            { label: "Moderate", count: moderate.length, color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
            { label: "Low", count: low.length, color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
          ].map((level) => (
            <motion.div
              key={level.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn("rounded-xl border p-4 text-center", level.color)}
            >
              <div className="text-3xl font-bold tabular-nums">{level.count}</div>
              <div className="mt-1 text-xs uppercase tracking-wider">{level.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Risk breakdown bars */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h2 className="mb-4 text-sm font-medium text-white/80">Failure Probability by Task</h2>
          <div className="space-y-4">
            {rescue.atRiskTasks.map((task) => (
              <div key={task.taskId} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-white/80">{task.title}</span>
                    <span className="ml-2 text-xs text-white/40">{task.daysUntilDeadline}d until deadline</span>
                  </div>
                  <span className={cn("ml-3 text-xs", getRiskColor(task.failureProbability))}>
                    {task.requiredHours}h needed · {task.availableBeforeDeadline.toFixed(1)}h available
                  </span>
                </div>
                <FailureBar probability={task.failureProbability} label="" />
                {task.gap > 0 && (
                  <p className="text-[10px] text-white/40">
                    Gap: {task.gap}h · {task.recommendedAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Detailed breakdown by risk level */}
        {critical.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-200">
              <AlertTriangle className="h-4 w-4" />
              Critical Risk Tasks
            </h3>
            <div className="space-y-3">
              {critical.map((task) => (
                <div key={task.taskId} className="rounded-xl border border-red-500/20 bg-black/20 px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <p className="mt-1 text-xs text-red-300/70">
                        {task.daysUntilDeadline}d left · {task.requiredHours}h remaining · {task.availableBeforeDeadline.toFixed(1)}h capacity
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-bold text-red-300">{task.failureProbability}%</span>
                  </div>
                  <div className="mt-2 rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2 text-xs text-red-200/80">
                    {task.recommendedAction}
                  </div>
                  {task.gap > 0 && (
                    <div className="mt-1.5 text-xs text-red-300/60">
                      Gap: {task.gap}h — Consider negotiation or scope reduction
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Rescue navigation */}
        {rescue.overallRiskLevel === "critical" || rescue.overallRiskLevel === "high" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <Button asChild variant="outline" className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20">
              <Link href="/dashboard/rescue">
                <TrendingUp className="h-4 w-4" />
                Go to Rescue Mode
              </Link>
            </Button>
          </motion.div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
