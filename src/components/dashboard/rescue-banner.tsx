"use client";

import { motion } from "framer-motion";
import { Shield, AlertTriangle, Clock, Brain, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RescuePlan, RiskAssessment } from "@/types";

interface RescueBannerProps {
  rescuePlans: RescuePlan[];
  riskAssessments: RiskAssessment[];
}

export function RescueBanner({ rescuePlans, riskAssessments }: RescueBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const criticalCount = riskAssessments.filter((r) => r.failureProbability >= 0.65).length;
  const highestRisk = [...riskAssessments].sort((a, b) => b.failureProbability - a.failureProbability)[0];

  if (dismissed || criticalCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/15 via-orange-500/10 to-red-500/5 p-5"
    >
      {/* Animated pulse background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.05, 0.1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-red-500/20 blur-[60px]"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.03, 0.08] }}
          transition={{ repeat: Infinity, duration: 4, delay: 1 }}
          className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-orange-500/20 blur-[50px]"
        />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Shield className="h-8 w-8 text-red-400" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-red-400">Rescue Mode Active</h3>
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-2 w-2 rounded-full bg-red-500"
              />
            </div>
            <p className="mt-1 text-sm text-white/60">
              {criticalCount} task(s) above failure threshold.{" "}
              {highestRisk
                ? `Highest risk: "${highestRisk.taskTitle}" at ${Math.round(highestRisk.failureProbability * 100)}%`
                : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {riskAssessments
                .filter((r) => r.failureProbability >= 0.65)
                .slice(0, 3)
                .map((r) => (
                  <motion.div
                    key={r.taskId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>{r.taskTitle}</span>
                    <span className="font-bold">{Math.round(r.failureProbability * 100)}%</span>
                  </motion.div>
                ))}
            </div>

            {rescuePlans.length > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-black/20 p-3">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-white/60">
                  First action: {rescuePlans[0]?.roadmap[0]?.title ?? "Execute rescue plan"}
                </span>
                <ArrowRight className="h-3 w-3 text-yellow-400" />
                <span className="text-xs text-white/40">
                  {rescuePlans[0]?.roadmap[0]?.duration ?? "30 min"}
                </span>
              </div>
            )}

            {/* Rescue progress steps */}
            {rescuePlans.length > 0 && (
              <div className="mt-4 space-y-2">
                {rescuePlans[0]?.roadmap.slice(0, 3).map((step, i) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-medium text-red-400">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-white/80">{step.title}</div>
                      <div className="text-[10px] text-white/40">{step.duration}</div>
                    </div>
                    <Brain className="h-3 w-3 text-blue-400/50" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-all"
          aria-label="Dismiss rescue banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}