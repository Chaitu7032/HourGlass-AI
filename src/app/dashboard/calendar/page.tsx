"use client";

import { format, isSameDay } from "date-fns";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BrainCircuit, CalendarClock, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { cn } from "@/lib/utils";
import type { CalendarBlock } from "@/types";

const typeStyles: Record<CalendarBlock["type"], { label: string; accent: string; chip: string }> = {
  focus: {
    label: "Deep Work",
    accent: "from-sky-400/25 via-sky-500/10 to-transparent border-sky-400/30",
    chip: "bg-sky-400/15 text-sky-200 border-sky-300/20",
  },
  meeting: {
    label: "Meeting",
    accent: "from-amber-400/25 via-amber-500/10 to-transparent border-amber-400/30",
    chip: "bg-amber-400/15 text-amber-100 border-amber-300/20",
  },
  break: {
    label: "Recovery",
    accent: "from-emerald-400/25 via-emerald-500/10 to-transparent border-emerald-400/30",
    chip: "bg-emerald-400/15 text-emerald-100 border-emerald-300/20",
  },
  commute: {
    label: "Transit",
    accent: "from-fuchsia-400/25 via-fuchsia-500/10 to-transparent border-fuchsia-400/30",
    chip: "bg-fuchsia-400/15 text-fuchsia-100 border-fuchsia-300/20",
  },
  free: {
    label: "Open Buffer",
    accent: "from-white/10 via-white/5 to-transparent border-white/12",
    chip: "bg-white/10 text-white/75 border-white/10",
  },
};

function getDurationHours(start: string, end: string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
}

function getDayLabel(date: Date) {
  if (isSameDay(date, new Date())) return "Today";
  return format(date, "EEEE");
}

export default function CalendarPage() {
  const { orchestration } = useHourglassStore();

  if (!orchestration) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-white/50">Run analysis to generate optimized calendar blocks.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Mission Control</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const sortedBlocks = [...orchestration.calendarBlocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const groupedDays = sortedBlocks.reduce<
    Array<{
      key: string;
      date: Date;
      blocks: CalendarBlock[];
      totalHours: number;
      focusHours: number;
    }>
  >((groups, block) => {
    const date = new Date(block.start);
    const key = format(date, "yyyy-MM-dd");
    const durationHours = getDurationHours(block.start, block.end);
    const group = groups.at(-1);

    if (!group || group.key !== key) {
      groups.push({
        key,
        date,
        blocks: [block],
        totalHours: durationHours,
        focusHours: block.type === "focus" ? durationHours : 0,
      });
      return groups;
    }

    group.blocks.push(block);
    group.totalHours += durationHours;
    if (block.type === "focus") group.focusHours += durationHours;
    return groups;
  }, []);

  const totalScheduledHours = sortedBlocks.reduce((sum, block) => sum + getDurationHours(block.start, block.end), 0);
  const focusHours = sortedBlocks.reduce(
    (sum, block) => sum + (block.type === "focus" ? getDurationHours(block.start, block.end) : 0),
    0
  );
  const meetingHours = sortedBlocks.reduce(
    (sum, block) => sum + (block.type === "meeting" ? getDurationHours(block.start, block.end) : 0),
    0
  );
  const openBufferHours = sortedBlocks.reduce(
    (sum, block) => sum + (block.type === "free" ? getDurationHours(block.start, block.end) : 0),
    0
  );
  const busiestDay = [...groupedDays].sort((a, b) => b.totalHours - a.totalHours)[0];
  const nextFocusBlock = sortedBlocks.find((block) => block.type === "focus") ?? sortedBlocks[0];

  const riskByTaskId = new Map(orchestration.riskAssessments.map((risk) => [risk.taskId, risk]));
  const rescueTaskIds = new Set(orchestration.rescuePlans.map((plan) => plan.taskId));

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 backdrop-blur-2xl lg:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(34,211,238,0.12),_transparent_28%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-100/80">
                <CalendarClock className="h-3.5 w-3.5" />
                Execution Timeline
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">Your week, rearranged for follow-through.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                Hourglass turned raw commitments into a protected schedule with explicit deep work, recovery windows,
                and visible slack before commitments start slipping.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="min-w-36 border-white/10 bg-black/20">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Scheduled</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatDuration(totalScheduledHours)}</p>
                  <p className="mt-1 text-xs text-white/45">{sortedBlocks.length} protected blocks</p>
                </CardContent>
              </Card>
              <Card className="min-w-36 border-white/10 bg-black/20">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Deep Work</p>
                  <p className="mt-2 text-2xl font-semibold text-sky-200">{formatDuration(focusHours)}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {totalScheduledHours > 0 ? Math.round((focusHours / totalScheduledHours) * 100) : 0}% of schedule
                  </p>
                </CardContent>
              </Card>
              <Card className="min-w-36 border-white/10 bg-black/20">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Open Buffer</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-200">{formatDuration(openBufferHours)}</p>
                  <p className="mt-1 text-xs text-white/45">Slack reserved for spillover</p>
                </CardContent>
              </Card>
              <Card className="min-w-36 border-white/10 bg-black/20">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Meetings</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-200">{formatDuration(meetingHours)}</p>
                  <p className="mt-1 text-xs text-white/45">Coordination load this plan cycle</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-white/8 pb-5">
                <CardTitle className="text-xl">Protected Schedule</CardTitle>
                <CardDescription>
                  Each block is classified by intent so you can see where execution time is actually going.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-5 pt-5 lg:p-6 lg:pt-6">
                {groupedDays.map((day, dayIndex) => (
                  <section key={day.key} aria-labelledby={`day-${day.key}`} className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 id={`day-${day.key}`} className="text-base font-semibold text-white">
                          {getDayLabel(day.date)}
                          <span className="ml-2 text-sm font-normal text-white/45">{format(day.date, "MMM d")}</span>
                        </h2>
                        <p className="mt-1 text-xs text-white/45">
                          {formatDuration(day.totalHours)} scheduled with {formatDuration(day.focusHours)} reserved for focused execution
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/60">
                        <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                        {day.blocks.length} block{day.blocks.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {day.blocks.map((block, index) => {
                        const durationHours = getDurationHours(block.start, block.end);
                        const style = typeStyles[block.type];
                        const risk = block.taskId ? riskByTaskId.get(block.taskId) : undefined;
                        const isRescueLinked = block.taskId ? rescueTaskIds.has(block.taskId) : false;

                        return (
                          <motion.article
                            key={block.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: dayIndex * 0.08 + index * 0.04 }}
                            className={cn(
                              "relative overflow-hidden rounded-2xl border bg-gradient-to-r p-4 shadow-lg shadow-black/10",
                              style.accent
                            )}
                          >
                            <div className="absolute left-5 top-0 h-full w-px bg-white/8" aria-hidden="true" />
                            <div className="relative grid gap-4 lg:grid-cols-[140px_1fr_auto] lg:items-center">
                              <div className="pl-5">
                                <p className="text-sm font-medium text-white/90">{format(new Date(block.start), "h:mm a")}</p>
                                <p className="mt-1 text-xs text-white/45">{formatDuration(durationHours)}</p>
                              </div>

                              <div className="pl-5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-semibold text-white">{block.title}</h3>
                                  <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", style.chip)}>
                                    {style.label}
                                  </span>
                                  {isRescueLinked && (
                                    <span className="rounded-full border border-red-400/20 bg-red-400/12 px-2.5 py-1 text-[11px] font-medium text-red-100">
                                      Rescue linked
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
                                  <span>{format(new Date(block.start), "MMM d")}</span>
                                  <span aria-hidden="true">|</span>
                                  <span>{format(new Date(block.end), "h:mm a")} finish</span>
                                  {risk && (
                                    <>
                                      <span aria-hidden="true">|</span>
                                      <span className={cn(risk.failureProbability >= 0.75 ? "text-red-200" : "text-white/60")}>
                                        {Math.round(risk.failureProbability * 100)}% deadline risk on linked task
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pl-5 lg:justify-end lg:pl-0">
                                {risk?.rescueRecommended && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/12 px-2.5 py-1 text-[11px] text-red-100">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Intervention suggested
                                  </span>
                                )}
                                {block.type === "focus" && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/12 px-2.5 py-1 text-[11px] text-sky-100">
                                    <BrainCircuit className="h-3.5 w-3.5" />
                                    Peak execution slot
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </CardContent>
            </Card>
          </motion.section>

          <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Schedule Readout</CardTitle>
                <CardDescription>Quick signals about whether this plan is defendable.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white/85">
                    <Clock3 className="h-4 w-4 text-sky-300" />
                    Next protected block
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">{nextFocusBlock.title}</p>
                  <p className="mt-1 text-sm text-white/50">
                    {format(new Date(nextFocusBlock.start), "EEE, MMM d")} | {format(new Date(nextFocusBlock.start), "h:mm a")} to{" "}
                    {format(new Date(nextFocusBlock.end), "h:mm a")}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white/85">Busiest day</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {busiestDay ? `${getDayLabel(busiestDay.date)} | ${formatDuration(busiestDay.totalHours)}` : "No schedule"}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {busiestDay ? `${formatDuration(busiestDay.focusHours)} deep work reserved` : "Run analysis to generate a workload forecast."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white/85">Rescue pressure</p>
                  <p className="mt-3 text-lg font-semibold text-white">{orchestration.rescuePlans.length} active intervention plan(s)</p>
                  <p className="mt-1 text-sm text-white/50">
                    {orchestration.rescuePlans.length > 0
                      ? "High-risk tasks are already linked into the timeline so recovery work is visible."
                      : "No rescue interventions required in the current orchestration."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Planner Guidance</CardTitle>
                <CardDescription>What to do with this schedule right now.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-white/65">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  Protect the focus blocks first. They carry the highest execution leverage and are the hardest slots to recreate once lost.
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  Use the open buffer intentionally. It is not spare time; it is failure absorption capacity.
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  If meetings expand, reclaim time from low-value free space before cutting recovery or deep work.
                </div>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href="/dashboard/rescue">
                    Review rescue interventions
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </DashboardShell>
  );
}
