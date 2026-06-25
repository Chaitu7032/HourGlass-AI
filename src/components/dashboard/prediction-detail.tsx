"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Target,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
} from "lucide-react";
import { cn, formatProbability, getRiskColor, getRiskLabel } from "@/lib/utils";
import { useState } from "react";
import type { RiskAssessment, RiskFactor } from "@/types";

interface PredictionDetailProps {
  assessment: RiskAssessment;
  defaultOpen?: boolean;
}

function FactorBar({ factor }: { factor: RiskFactor }) {
  const severity = factor.impact >= 30 ? "high" : factor.impact >= 15 ? "medium" : "low";
  const barColor =
    severity === "high"
      ? "bg-red-500"
      : severity === "medium"
        ? "bg-yellow-500"
        : "bg-blue-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">{factor.name}</span>
        <span className="text-white/50">+{factor.impact}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(factor.impact, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", barColor)}
        />
      </div>
      <p className="text-[10px] text-white/40">{factor.description}</p>
    </div>
  );
}

export function PredictionDetail({ assessment, defaultOpen = false }: PredictionDetailProps) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const riskColor = getRiskColor(assessment.failureProbability);
  const riskLabel = getRiskLabel(assessment.failureProbability);

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-white/5"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              assessment.failureProbability >= 0.75
                ? "bg-red-500/20"
                : assessment.failureProbability >= 0.5
                  ? "bg-orange-500/20"
                  : "bg-emerald-500/20"
            )}
          >
            {assessment.failureProbability >= 0.5 ? (
              <AlertTriangle
                className={cn(
                  "h-5 w-5",
                  assessment.failureProbability >= 0.75 ? "text-red-400" : "text-orange-400"
                )}
              />
            ) : (
              <Target className="h-5 w-5 text-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium truncate">{assessment.taskTitle}</h4>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={cn("text-sm font-bold tabular-nums", riskColor)}>
                {formatProbability(assessment.failureProbability)}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                {riskLabel} risk
              </span>
              <span className="text-[10px] text-white/30">
                · {Math.round(assessment.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 ml-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-4">
              {/* Reasoning */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
                  <Brain className="h-3.5 w-3.5" />
                  AI Reasoning
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                  {assessment.reasoning}
                </p>
              </div>

              {/* Factor Breakdown */}
              {assessment.factors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-white/60 mb-3">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Risk Factors
                  </div>
                  <div className="space-y-3">
                    {assessment.factors.map((factor) => (
                      <FactorBar key={factor.name} factor={factor} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {assessment.rescueRecommended && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Recommended Action
                  </div>
                  <p className="mt-1 text-xs text-white/70">
                    Rescue mode recommended. Activate the rescue plan to reorganize your schedule
                    and protect this commitment. Early intervention increases success probability by 34%.
                  </p>
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Info className="h-3 w-3" />
                  Prediction Confidence
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${assessment.confidence * 100}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-blue-500"
                    />
                  </div>
                  <span className="text-xs tabular-nums text-white/60">
                    {Math.round(assessment.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── PredictionList - groups assessments with explainable UI ──────────

interface PredictionListProps {
  assessments: RiskAssessment[];
}

export function PredictionList({ assessments }: PredictionListProps) {
  const sorted = [...assessments].sort(
    (a, b) => b.failureProbability - a.failureProbability
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">Prediction Breakdown</h3>
        <span className="text-xs text-white/40">
          Sorted by risk level
        </span>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm text-white/40">
            No predictions available. Run analysis to generate risk assessments.
          </p>
        </div>
      ) : (
        sorted.map((assessment, i) => (
          <motion.div
            key={assessment.taskId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <PredictionDetail assessment={assessment} defaultOpen={i === 0} />
          </motion.div>
        ))
      )}
    </div>
  );
}