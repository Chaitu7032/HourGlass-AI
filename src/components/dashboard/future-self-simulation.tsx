"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Brain, Calendar, TrendingDown } from "lucide-react";
import type { FutureScenario } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FutureSelfSimulationProps {
  scenarios: FutureScenario[];
}

export function FutureSelfSimulation({ scenarios }: FutureSelfSimulationProps) {
  const readyScenarios = scenarios.filter((scenario) => scenario.projections.length > 0);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(readyScenarios[0]?.id ?? scenarios[0]?.id ?? "");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const activeScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0] ?? null;

  const chartData = useMemo(
    () =>
      activeScenario?.projections.map((projection) => ({
        date: format(new Date(projection.date), "MMM d"),
        fullDate: format(new Date(projection.date), "EEEE, MMM d"),
        score: projection.commitmentScore,
        stress: projection.stressLevel,
        missed: projection.missedDeadlines,
        opportunityLoss: projection.opportunityLoss,
        careerImpact: projection.careerImpact,
        academicImpact: projection.academicImpact,
        narrative: projection.narrative,
      })) ?? [],
    [activeScenario]
  );

  if (!activeScenario) {
    return null;
  }

  if (activeScenario.dataStatus === "insufficient_data" || chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          Insufficient Data
        </div>
        <p className="mt-3 text-sm leading-6 text-white/70">{activeScenario.summary}</p>
        <div className="mt-4 space-y-2">
          {activeScenario.adjustments.map((adjustment) => (
            <div key={adjustment} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55">
              {adjustment}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentScore = chartData[0]?.score ?? 0;
  const finalScore = chartData[chartData.length - 1]?.score ?? 0;
  const scoreDrop = currentScore - finalScore;

  const milestones = chartData
    .map((day, index) => {
      if (day.missed > 0) {
        return { day: index + 1, label: `${day.missed} missed deadline${day.missed === 1 ? "" : "s"}`, severity: "critical" as const };
      }
      if (day.stress >= 80) {
        return { day: index + 1, label: "Stress overload", severity: "danger" as const };
      }
      if (day.stress >= 65) {
        return { day: index + 1, label: "Pressure rising", severity: "warning" as const };
      }
      return null;
    })
    .filter((value, index, list): value is { day: number; label: string; severity: "warning" | "danger" | "critical" } => {
      if (!value) return false;
      return list.findIndex((candidate) => candidate?.label === value.label) === index;
    })
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => {
              setSelectedScenarioId(scenario.id);
              setSelectedDay(null);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              scenario.id === activeScenario.id
                ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
            )}
          >
            {scenario.label}
          </button>
        ))}
      </div>

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
            {activeScenario.label}
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/60">{activeScenario.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeScenario.adjustments.map((adjustment) => (
              <span key={adjustment} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] text-white/55">
                {adjustment}
              </span>
            ))}
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

            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <p className="text-xs text-white/40">Projected in 14 Days</p>
              <p className="text-4xl font-bold tabular-nums text-red-400">{Math.round(finalScore)}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="rounded-xl bg-red-500/20 px-4 py-2">
              <p className="text-xs text-red-400">Score Change</p>
              <p className="text-2xl font-bold tabular-nums text-red-400">
                {scoreDrop > 0 ? `-${Math.round(scoreDrop)}` : `+${Math.round(Math.abs(scoreDrop))}`}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="rounded-xl bg-yellow-500/20 px-4 py-2">
              <p className="text-xs text-yellow-400">Projected Missed Deadlines</p>
              <p className="text-2xl font-bold tabular-nums text-yellow-400">{chartData[chartData.length - 1]?.missed ?? 0}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle>14-Day Trajectory</CardTitle>
            <CardDescription>Projection generated from current logged workload, progress, and observed execution pace</CardDescription>
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
                  <XAxis dataKey="date" tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis yAxisId="left" tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#ffffff80" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#ffffff60" }} />
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
                  <Area yAxisId="right" type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" fill="url(#stressGrad)" name="Stress Level" dot={false} />
                  <ReferenceLine
                    yAxisId="left"
                    y={60}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{ value: "Warning Threshold", fill: "#f59e0b", fontSize: 10, position: "right" }}
                  />
                  {milestones.map((milestone) => {
                    const milestoneData = chartData[milestone.day - 1];
                    if (!milestoneData) return null;

                    return (
                      <ReferenceLine
                        key={`${milestone.label}-${milestone.day}`}
                        yAxisId="left"
                        x={milestoneData.date}
                        stroke={milestone.severity === "critical" ? "#ef4444" : milestone.severity === "danger" ? "#f59e0b" : "#eab308"}
                        strokeDasharray="3 3"
                        label={{
                          value: milestone.label,
                          fill: milestone.severity === "critical" ? "#ef4444" : milestone.severity === "danger" ? "#f59e0b" : "#eab308",
                          fontSize: 9,
                          position: "top",
                        }}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1">
              {chartData.map((day, index) => {
                const isSelected = selectedDay === index;
                const isToday = index === 0;

                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDay(isSelected ? null : index)}
                    className={cn(
                      "rounded-lg border px-1 py-2 text-center text-[10px] transition-all",
                      isSelected
                        ? "border-blue-500/40 bg-blue-500/20 text-white"
                        : isToday
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                          : "border-white/5 bg-white/[0.02] text-white/30 hover:border-white/10"
                    )}
                  >
                    <div className="font-medium">{day.date}</div>
                    <div className="mt-0.5 tabular-nums">{Math.round(day.score)}</div>
                  </motion.button>
                );
              })}
            </div>

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
                        <div className="text-lg font-bold tabular-nums text-blue-400">{Math.round(chartData[selectedDay].score)}</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-xs text-white/40">Stress</div>
                        <div className="text-lg font-bold tabular-nums text-red-400">{chartData[selectedDay].stress}%</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-xs text-white/40">Missed</div>
                        <div className="text-lg font-bold tabular-nums text-yellow-400">{chartData[selectedDay].missed}</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <div className="text-xs text-white/40">Opportunity</div>
                        <div className="text-xs font-bold text-violet-400">{chartData[selectedDay].opportunityLoss}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs italic text-white/60">&ldquo;{chartData[selectedDay].narrative}&rdquo;</p>
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
          {chartData.filter((_, index) => index === 2 || index === 5 || index === 8 || index === 12).map((day, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={cn(
                "relative rounded-xl border p-4 pl-8",
                day.missed > 0 ? "border-red-500/20 bg-red-500/10" : day.stress >= 65 ? "border-orange-500/20 bg-orange-500/10" : "border-yellow-500/20 bg-yellow-500/10"
              )}
            >
              <div
                className={cn(
                  "absolute left-3 top-4 h-2 w-2 rounded-full",
                  day.missed > 0 ? "bg-red-400" : day.stress >= 65 ? "bg-orange-400" : "bg-yellow-400"
                )}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{day.fullDate}</span>
                <span className="text-[10px] text-white/40">Score: {Math.round(day.score)}</span>
              </div>
              <div className="mt-1 text-xs text-white/60">{day.narrative}</div>
              <div className="mt-1.5 flex gap-2 text-[10px] text-white/40">
                <span>Stress: {day.stress}%</span>
                <span>Missed: {day.missed}</span>
                <span>{day.opportunityLoss}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center"
        >
          <Brain className="mx-auto h-6 w-6 text-blue-400" />
          <p className="mt-2 text-sm font-medium text-blue-400">This trajectory is adjustable</p>
          <p className="mt-1 text-xs text-blue-300/60">
            Compare the rescue and optimized scenarios to see how much the current outcome depends on protected focus and reduced fragmentation.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
