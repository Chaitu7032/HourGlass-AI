"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import type { FutureSelfProjection } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { TrendingDown, AlertTriangle, Brain, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FutureSelfSimulationProps {
  projections: FutureSelfProjection[];
}

export function FutureSelfSimulation({ projections }: FutureSelfSimulationProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const chartData = projections.map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    fullDate: format(new Date(p.date), "EEEE, MMM d"),
    score: p.commitmentScore,
    stress: p.stressLevel,
    missed: p.missedDeadlines,
    opportunityLoss: p.opportunityLoss,
    careerImpact: p.careerImpact,
    academicImpact: p.academicImpact,
    narrative: p.narrative,
  }));

  const currentScore = chartData[0]?.score ?? 78;
  const finalScore = chartData[chartData.length - 1]?.score ?? 42;
  const scoreDrop = currentScore - finalScore;

  const milestones = [
    { day: 3, label: "First missed deadline", severity: "warning" as const },
    { day: 7, label: "Stress cascade begins", severity: "danger" as const },
    { day: 10, label: "Opportunity loss compounds", severity: "critical" as const },
  ];

  return (
    <div className="space-y-6">
      {/* Hero projection card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent p-6"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-red-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm font-medium text-red-400">
            <TrendingDown className="h-4 w-4" />
            Predictive Trajectory
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-8">
            <div>
              <p className="text-xs text-white/40">Commitment Score Now</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="text-4xl font-bold tabular-nums text-emerald-400"
              >
                {Math.round(currentScore)}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs text-white/40">Projected in 14 Days</p>
              <p className="text-4xl font-bold tabular-nums text-red-400">
                {Math.round(finalScore)}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="rounded-xl bg-red-500/20 px-4 py-2"
            >
              <p className="text-xs text-red-400">Score Drop</p>
              <p className="text-2xl font-bold tabular-nums text-red-400">-{Math.round(scoreDrop)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="rounded-xl bg-yellow-500/20 px-4 py-2"
            >
              <p className="text-xs text-yellow-400">Projected Missed Deadlines</p>
              <p className="text-2xl font-bold tabular-nums text-yellow-400">
                +{chartData[chartData.length - 1]?.missed ?? 0}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>14-Day Trajectory</CardTitle>
            <CardDescription>
              If current behavior continues — stress compounds, score declines, deadlines slip
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#ffffff40", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#ffffff40", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[30, 100]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#ffffff40", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#ffffff80" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "#ffffff60" }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#scoreGrad)"
                    name="Commitment Score"
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2 }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="stress"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    fill="url(#stressGrad)"
                    name="Stress Level"
                    dot={false}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={60}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: "Warning Threshold",
                      fill: "#f59e0b",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                  {milestones.map((m) => {
                    const milestoneData = chartData[m.day - 1];
                    if (!milestoneData) return null;
                    return (
                      <ReferenceLine
                        key={m.day}
                        yAxisId="left"
                        x={milestoneData.date}
                        stroke={
                          m.severity === "critical"
                            ? "#ef4444"
                            : m.severity === "danger"
                              ? "#f59e0b"
                              : "#eab308"
                        }
                        strokeDasharray="3 3"
                        label={{
                          value: m.label,
                          fill:
                            m.severity === "critical"
                              ? "#ef4444"
                              : m.severity === "danger"
                                ? "#f59e0b"
                                : "#eab308",
                          fontSize: 9,
                          position: "top",
                        }}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive day selector */}
            <div className="mt-4 grid grid-cols-7 gap-1">
              {chartData.map((d, i) => {
                const isSelected = selectedDay === i;
                const isToday = i === 0;
                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDay(isSelected ? null : i)}
                    className={cn(
                      "rounded-lg border px-1 py-2 text-center text-[10px] transition-all",
                      isSelected
                        ? "border-blue-500/40 bg-blue-500/20 text-white"
                        : isToday
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                          : "border-white/5 bg-white/[0.02] text-white/30 hover:border-white/10"
                    )}
                  >
                    <div className="font-medium">{d.date}</div>
                    <div className="mt-0.5 tabular-nums">{Math.round(d.score)}</div>
                  </motion.button>
                );
              })}
            </div>

            {/* Detail panel for selected day */}
            <AnimatePresence>
              {selectedDay !== null && chartData[selectedDay] && (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium">{chartData[selectedDay].fullDate}</span>
                      </div>
                      <span className="text-xs text-white/40">Day {selectedDay + 1}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-xs text-white/40">Score</div>
                        <div className="text-lg font-bold tabular-nums text-blue-400">
                          {Math.round(chartData[selectedDay].score)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-xs text-white/40">Stress</div>
                        <div className="text-lg font-bold tabular-nums text-red-400">
                          {chartData[selectedDay].stress}%
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-xs text-white/40">Missed</div>
                        <div className="text-lg font-bold tabular-nums text-yellow-400">
                          {chartData[selectedDay].missed}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-xs text-white/40">Opportunity</div>
                        <div className="text-xs font-bold text-violet-400">
                          {chartData[selectedDay].opportunityLoss}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-white/60 italic">
                      &ldquo;{chartData[selectedDay].narrative}&rdquo;
                    </p>
                    <div className="mt-2 flex gap-3 text-[10px] text-white/40">
                      <span>{chartData[selectedDay].careerImpact}</span>
                      <span>{chartData[selectedDay].academicImpact}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline narrative */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-red-500/10 bg-white/[0.03] p-6"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-red-400">
          <AlertTriangle className="h-4 w-4" />
          Failure Cascade Timeline
        </div>
        <div className="mt-4 space-y-3">
          {chartData.filter((_, i) => i === 2 || i === 5 || i === 8 || i === 12).map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className={cn(
                "relative rounded-xl border p-4 pl-8",
                i === 0
                  ? "border-yellow-500/20 bg-yellow-500/10"
                  : i >= 2
                    ? "border-red-500/20 bg-red-500/10"
                    : "border-orange-500/20 bg-orange-500/10"
              )}
            >
              <div
                className={cn(
                  "absolute left-3 top-4 h-2 w-2 rounded-full",
                  i === 0
                    ? "bg-yellow-400"
                    : i >= 2
                      ? "bg-red-400"
                      : "bg-orange-400"
                )}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{d.fullDate}</span>
                <span className="text-[10px] text-white/40">Score: {Math.round(d.score)}</span>
              </div>
              <div className="mt-1 text-xs text-white/60">{d.narrative}</div>
              <div className="mt-1.5 flex gap-2 text-[10px] text-white/40">
                <span>Stress: {d.stress}%</span>
                <span>Missed: {d.missed}</span>
                <span>{d.opportunityLoss}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Rescue call to action */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center"
        >
          <Brain className="mx-auto h-6 w-6 text-blue-400" />
          <p className="mt-2 text-sm font-medium text-blue-400">This trajectory is preventable</p>
          <p className="mt-1 text-xs text-blue-300/60">
            Activating rescue mode now recovers 34% of the projected score drop. The first 4 hours are critical.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}