"use client";

import { motion } from "framer-motion";
import { Brain, Gauge, Minus, Shield, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { CommitmentScore } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CommitmentGaugeProps {
  score: CommitmentScore;
}

export function CommitmentGauge({ score }: CommitmentGaugeProps) {
  const trendIcon =
    score.trend === "improving" ? (
      <TrendingUp className="h-4 w-4 text-emerald-400" />
    ) : score.trend === "declining" ? (
      <TrendingDown className="h-4 w-4 text-red-400" />
    ) : (
      <Minus className="h-4 w-4 text-yellow-400" />
    );

  const trendColor =
    score.trend === "improving"
      ? "text-emerald-400"
      : score.trend === "declining"
        ? "text-red-400"
        : "text-yellow-400";

  const factors = score.scoreBreakdown.map((dimension) => ({
    label: dimension.label,
    value: dimension.value,
    icon:
      dimension.key === "planningQuality"
        ? Brain
        : dimension.key === "executionConsistency"
          ? Zap
          : dimension.key === "recoveryAbility"
            ? Shield
            : dimension.key === "focus"
              ? Gauge
              : Target,
    color:
      dimension.key === "planningQuality"
        ? "text-violet-400"
        : dimension.key === "executionConsistency"
          ? "text-yellow-400"
          : dimension.key === "recoveryAbility"
            ? "text-emerald-400"
            : dimension.key === "focus"
              ? "text-cyan-400"
              : dimension.key === "reliability"
                ? "text-indigo-400"
                : "text-blue-400",
    weight: dimension.weight,
    contribution: dimension.weightedContribution,
    reasoning: dimension.reasoning,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Commitment Score</CardTitle>
          <div className="flex items-center gap-1.5 text-sm">
            {trendIcon}
            <span className={cn("text-xs capitalize", trendColor)}>{score.trend}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative flex flex-col items-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - score.overall / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={score.overall >= 60 ? "#3b82f6" : score.overall >= 40 ? "#eab308" : "#ef4444"} />
                  <stop
                    offset="100%"
                    stopColor={
                      score.overall >= 80
                        ? "#22c55e"
                        : score.overall >= 60
                          ? "#8b5cf6"
                          : score.overall >= 40
                            ? "#f59e0b"
                            : "#dc2626"
                    }
                  />
                </linearGradient>
              </defs>
            </svg>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3, stiffness: 150 }}
              className="relative z-10 text-center"
            >
              <span className="text-4xl font-bold tabular-nums text-white">{Math.round(score.overall)}</span>
              <span className="block text-[10px] text-white/40">/ 100</span>
            </motion.div>
          </div>

          <div className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">History</p>
            <p className="mt-1 text-xs text-white/55">{score.historyUnavailableReason ?? "No historical score snapshots yet."}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {factors.map((f) => (
            <div key={f.label} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <f.icon className={cn("h-3 w-3", f.color)} />
                <span className="text-[10px] text-white/40">{f.label}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums text-white">{Math.round(f.value)}</span>
                <span className="text-[10px] text-white/30">/ 100</span>
              </div>
              <Progress
                value={f.value}
                className="mt-1 h-1"
                indicatorClassName={f.value >= 70 ? "bg-blue-500" : f.value >= 50 ? "bg-yellow-500" : "bg-red-500"}
              />
              <p className="mt-2 text-[10px] leading-4 text-white/40">
                Weight {Math.round(f.weight * 100)}% · contributes {f.contribution.toFixed(1)} points
              </p>
              <p className="mt-1 text-[10px] leading-4 text-white/35">{f.reasoning}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] text-white/30">Deterministic execution metric built from live commitment data</p>
      </CardContent>
    </Card>
  );
}
