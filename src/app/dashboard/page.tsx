"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Zap } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { AgentPipeline } from "@/components/dashboard/agent-pipeline";
import { RiskGridCompact } from "@/components/dashboard/risk-heatmap";
import { CommitmentScoreCard } from "@/components/dashboard/commitment-score";
import { ExecutiveSummary } from "@/components/dashboard/opportunity-panel";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { DEMO_TASKS } from "@/lib/demo-data";
import type { OrchestrationResult } from "@/types";

export default function MissionControlPage() {
  const {
    tasks,
    orchestration,
    isOrchestrating,
    orchestrationProgress,
    demoMode,
    loadDemo,
    setOrchestration,
    setIsOrchestrating,
    appendOrchestrationLog,
    clearOrchestrationProgress,
  } = useHourglassStore();

  const runAnalysis = useCallback(async () => {
    const taskList = tasks.length ? tasks : DEMO_TASKS;
    setIsOrchestrating(true);
    clearOrchestrationProgress();

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: taskList }),
      });
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
  }, [tasks, setIsOrchestrating, clearOrchestrationProgress, appendOrchestrationLog, setOrchestration]);

  useEffect(() => {
    if (demoMode && !orchestration && !isOrchestrating) {
      runAnalysis();
    }
  }, [demoMode, orchestration, isOrchestrating, runAnalysis]);

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
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
              Autonomous execution intelligence · {tasks.length || DEMO_TASKS.length} active commitments
            </p>
          </div>
          <div className="flex gap-2">
            {!demoMode && (
              <Button variant="outline" size="sm" onClick={loadDemo}>
                Load Demo
              </Button>
            )}
            <Button onClick={runAnalysis} disabled={isOrchestrating}>
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

        {(isOrchestrating || orchestrationProgress.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8 glass rounded-2xl p-6"
          >
            <AgentPipeline logs={orchestrationProgress} isRunning={isOrchestrating} />
          </motion.div>
        )}

        {orchestration ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <ExecutiveSummary
              summary={orchestration.executiveSummary}
              voiceMessage={orchestration.voiceCoachMessage}
            />

            <RiskGridCompact assessments={orchestration.riskAssessments} />

            <div className="grid gap-6 lg:grid-cols-2">
              <CommitmentScoreCard score={orchestration.commitmentScore} />
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-medium text-white/80">Capacity Analysis</h3>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-400">54h</div>
                    <div className="text-[10px] text-white/40">Required</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">28h</div>
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
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="glass rounded-2xl p-12 max-w-md">
              <Zap className="mx-auto h-12 w-12 text-blue-400" />
              <h2 className="mt-4 text-xl font-semibold">Ready for Analysis</h2>
              <p className="mt-2 text-sm text-white/50">
                Load the demo scenario or add commitments, then run the multi-agent orchestration pipeline.
              </p>
              <Button className="mt-6" onClick={loadDemo}>
                Load Hackathon Demo
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
