"use client";

import { motion } from "framer-motion";
import type { RiskAssessment } from "@/types";
import { cn, formatProbability, getRiskBg, getRiskLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskHeatmapProps {
  assessments: RiskAssessment[];
}

export function RiskHeatmap({ assessments }: RiskHeatmapProps) {
  const sorted = [...assessments].sort((a, b) => b.failureProbability - a.failureProbability);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Risk Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((assessment, i) => (
          <motion.div
            key={assessment.taskId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn("rounded-xl border p-4", getRiskBg(assessment.failureProbability))}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">{assessment.taskTitle}</h4>
                <p className="mt-1 text-xs text-white/50 line-clamp-2">{assessment.reasoning}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold tabular-nums">
                  {formatProbability(assessment.failureProbability)}
                </div>
                <div className="text-[10px] text-white/40">{getRiskLabel(assessment.failureProbability)}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {assessment.factors.slice(0, 3).map((f) => (
                <span
                  key={f.name}
                  className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] text-white/60"
                >
                  {f.name}: +{f.impact}%
                </span>
              ))}
            </div>
            {assessment.rescueRecommended && (
              <div className="mt-2 text-[10px] font-medium text-red-400 uppercase tracking-wider">
                Rescue Recommended
              </div>
            )}
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RiskGridCompact({ assessments }: RiskHeatmapProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {assessments.map((a, i) => (
        <motion.div
          key={a.taskId}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className={cn(
            "rounded-xl border p-4 text-center",
            getRiskBg(a.failureProbability)
          )}
        >
          <div className="text-3xl font-bold tabular-nums">{formatProbability(a.failureProbability)}</div>
          <div className="mt-1 text-xs text-white/60 truncate">{a.taskTitle}</div>
          <div className="mt-1 text-[10px] text-white/40">{getRiskLabel(a.failureProbability)}</div>
        </motion.div>
      ))}
    </div>
  );
}
