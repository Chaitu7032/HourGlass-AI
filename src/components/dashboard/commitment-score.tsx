"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { CommitmentScore, FutureSelfProjection } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface CommitmentScoreCardProps {
  score: CommitmentScore;
}

export function CommitmentScoreCard({ score }: CommitmentScoreCardProps) {
  const factors = [
    { label: "Completion", value: score.completionRate },
    { label: "Planning", value: score.planningQuality },
    { label: "Consistency", value: score.executionConsistency },
    { label: "Recovery", value: score.recoveryAbility },
    { label: "Focus", value: score.focus },
    { label: "Reliability", value: score.reliability },
  ];

  const trendColor =
    score.trend === "improving" ? "text-emerald-400" : score.trend === "declining" ? "text-red-400" : "text-yellow-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commitment Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-5xl font-bold tabular-nums"
          >
            {Math.round(score.overall)}
          </motion.div>
          <div>
            <span className={`text-sm capitalize ${trendColor}`}>{score.trend}</span>
            <p className="text-xs text-white/40">Proprietary execution metric</p>
          </div>
        </div>
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={score.history}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {factors.map((f) => (
            <div key={f.label} className="text-center">
              <div className="text-sm font-medium tabular-nums">{Math.round(f.value)}</div>
              <div className="text-[10px] text-white/40">{f.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface FutureSelfTimelineProps {
  projections: FutureSelfProjection[];
}

export function FutureSelfTimeline({ projections }: FutureSelfTimelineProps) {
  const chartData = projections.map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    score: p.commitmentScore,
    stress: p.stressLevel,
    missed: p.missedDeadlines,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Future Self Simulation</CardTitle>
        <p className="text-xs text-white/40">If current behavior continues...</p>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} domain={[30, 100]} />
              <Tooltip
                contentStyle={{
                  background: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} name="Commitment" />
              <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} name="Stress" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {projections.filter((_, i) => i === 6 || i === 13).map((p) => (
            <div key={p.date} className="rounded-lg bg-white/5 p-3">
              <div className="text-xs font-medium text-white/80">
                {format(new Date(p.date), "EEEE, MMM d")}
              </div>
              <p className="mt-1 text-xs text-white/50">{p.narrative}</p>
              <div className="mt-2 flex gap-3 text-[10px] text-white/40">
                <span>Missed: {p.missedDeadlines}</span>
                <span>Stress: {p.stressLevel}%</span>
                <span>{p.careerImpact}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
