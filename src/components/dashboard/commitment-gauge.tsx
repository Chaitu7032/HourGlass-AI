"use client";

import { motion } from "framer-motion";
import type { CommitmentScore } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Target, Zap, Shield, Brain, Gauge } from "lucide-react";

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

  const factors = [
    { label: "Completion Rate", value: score.completionRate, icon: Target, color: "text-blue-400" },
    { label: "Planning Quality", value: score.planningQuality, icon: Brain, color: "text-violet-400" },
    { label: "Execution Consistency", value: score.executionConsistency, icon: Zap, color: "text-yellow-400" },
    { label: "Recovery Ability", value: score.recoveryAbility, icon: Shield, color: "text-emerald-400" },
    { label: "Focus", value: score.focus, icon: Gauge, color: "text-cyan-400" },
    { label: "Reliability", value: score.reliability, icon: Target, color: "text-indigo-400" },
  ];

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
        {/* Animated gauge */}
        <div className="relative flex flex-col items-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            {/* Outer ring */}
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={`url(#gaugeGrad)`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 56 * (1 - score.overall / 100),
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={score.overall >= 60 ? "#3b82f6" : score.overall >= 40 ? "#eab308" : "#ef4444"}
                  />
                  <stop
                    offset="100%"
                    stopColor={score.overall >= 80 ? "#22c55e" : score.overall >= 60 ? "#8b5cf6" : score.overall >= 40 ? "#f59e0b" : "#dc2626"}
                  />
                </linearGradient>
              </defs>
            </svg>

            {/* Score number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3, stiffness: 150 }}
              className="relative z-10 text-center"
            >
              <span className="text-4xl font-bold tabular-nums text-white">
                {Math.round(score.overall)}
              </span>
              <span className="block text-[10px] text-white/40">/ 100</span>
            </motion.div>
          </div>

          {/* Score history mini-chart */}
          <div className="mt-4 h-12 w-full">
            <div className="flex items-end gap-[2px] h-full w-full">
              {score.history.map((point, i) => {
                const height = (point.score / 100) * 100;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="flex-1 rounded-t-sm"
                    style={{
                      background:
                        point.score >= 70
                          ? "rgba(59, 130, 246, 0.6)"
                          : point.score >= 50
                            ? "rgba(234, 179, 8, 0.6)"
                            : "rgba(239, 68, 68, 0.6)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {factors.map((f) => (
            <div key={f.label} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <f.icon className={cn("h-3 w-3", f.color)} />
                <span className="text-[10px] text-white/40">{f.label}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums text-white">
                  {Math.round(f.value)}
                </span>
                <span className="text-[10px] text-white/30">/ 100</span>
              </div>
              <Progress
                value={f.value}
                className="mt-1 h-1"
                indicatorClassName={
                  f.value >= 70
                    ? "bg-blue-500"
                    : f.value >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }
              />
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] text-center text-white/30">
          Proprietary execution metric · {score.history.length} days tracked
        </p>
      </CardContent>
    </Card>
  );
}
