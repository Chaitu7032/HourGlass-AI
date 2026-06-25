"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Zap, Plus } from "lucide-react";
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
import type { OrchestrationResult } from "@/types";

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

  const runAnalysis = useCallback(async () => {
    if (tasks.length === 0) return;
    setIsOrchestrating(true);
    clearOrchestrationProgress();

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
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
  }, [tasks, user?.uid, setIsOrchestrating, clearOrchestrationProgress, appendOrchestrationLog, setOrchestration]);

  const handleAddTask = useCallback(() => {
    // Navigate to risk page or open a task creation dialog
    const title = prompt("Enter a new commitment:");
    if (!title?.trim()) return;

    const hours = prompt("Estimated hours needed:");
    if (!hours || isNaN(Number(hours))) return;

    const daysOut = prompt("Days until deadline:");
    if (!daysOut || isNaN(Number(daysOut))) return;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + Number(daysOut));

    // Add task via the Zustand store's method (which syncs to Firestore via SyncProvider)
    useHourglassStore.getState().addTask({
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: "",
      deadline: deadline.toISOString(),
      estimatedHours: Number(hours),
      completedHours: 0,
      priority: "medium",
      category: "project",
      complexity: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const hasNoTasks = tasks.length === 0;
  const hasNoAnalysis = !orchestration && !isOrchestrating && orchestrationProgress.length === 0;

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold"
            >
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
              Add Task
            </Button>
            <Button
              onClick={runAnalysis}
              disabled={isOrchestrating || hasNoTasks}
            >
              {isOrchestrating ? (
                <>
                  <Zap className="h-4 w-4 animate-pulse" />
                  Agents Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Analysis
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

        {/* Agent Pipeline */}
        {(isOrchestrating || orchestrationProgress.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8 glass rounded-2xl p-6"
          >
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
              Add your first task to see Hourglass AI in action. Commitments sync to Firestore
              and persist across sessions.
            </p>
            <Button className="mt-6" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add Your First Task
            </Button>
          </motion.div>
        )}

        {/* Results */}
        {orchestration ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Executive Summary */}
            <ExecutiveSummary
              summary={orchestration.executiveSummary}
              voiceMessage={orchestration.voiceCoachMessage}
            />

            {/* Rescue Banner */}
            <RescueBanner
              rescuePlans={orchestration.rescuePlans}
              riskAssessments={orchestration.riskAssessments}
            />

            {/* Risk Grid */}
            <RiskGridCompact assessments={orchestration.riskAssessments} />

            {/* Explainable Predictions */}
            <PredictionList assessments={orchestration.riskAssessments} />

            {/* Capacity & Commitment Score */}
            <div className="grid gap-6 lg:grid-cols-2">
              <CommitmentGauge score={orchestration.commitmentScore} />
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-medium text-white/80">Capacity Analysis</h3>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-400">{54}h</div>
                    <div className="text-[10px] text-white/40">Required</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{28}h</div>
                    <div className="text-[10px] text-white/40">Available</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {orchestration.energyProfile.productiveHours.toFixed(1)}h
                    </div>
                    <div className="text-[10px] text-white/40">Productive</div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/50">{orchestration.energyProfile.reasoning}</p>
              </div>
            </div>
          </motion.div>
        ) : workspaceHydrated && !isOrchestrating && tasks.length > 0 ? (
          /* Ready state - tasks loaded but no analysis yet */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <p className="text-sm text-white/40">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} loaded. Ready to analyze.
            </p>
            <Button className="mt-4" onClick={runAnalysis}>
              <Play className="h-4 w-4" />
              Run Analysis
            </Button>
          </motion.div>
        ) : null}
      </div>
    </DashboardShell>
  );
}