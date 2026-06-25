"use client";

import { motion } from "framer-motion";
import type { OpportunityImpact, NegotiationOption, RescuePlan, EnergyProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OpportunityLossPanel({ impacts }: { impacts: OpportunityImpact[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opportunity Loss Engine</CardTitle>
        <p className="text-xs text-white/40">What missing each commitment actually costs</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {impacts.map((impact, i) => (
          <motion.div
            key={impact.taskId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium">{impact.taskTitle}</h4>
                <span className="text-[10px] uppercase tracking-wider text-violet-400">{impact.impactType}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-400">{impact.magnitude}</div>
                <div className="text-[10px] text-white/40">weight: {impact.emotionalWeight}/10</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/50">{impact.description}</p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

export function NegotiationPanel({ options }: { options: NegotiationOption[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Negotiator</CardTitle>
        <p className="text-xs text-white/40">54h required · 28h capacity · 26h deficit</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((opt, i) => (
          <motion.div
            key={opt.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className={cn(
              "rounded-xl border p-4",
              opt.recommended
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-white/10 bg-white/[0.02]"
            )}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{opt.scenario}</h4>
              {opt.recommended && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
                  Recommended
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-2 text-xs">
              <div>
                <span className="text-emerald-400">Keep: </span>
                <span className="text-white/60">{opt.tradeoffs.keep.join(", ")}</span>
              </div>
              <div>
                <span className="text-yellow-400">Defer: </span>
                <span className="text-white/60">{opt.tradeoffs.defer.join(", ")}</span>
              </div>
              <div>
                <span className="text-red-400">Risk: </span>
                <span className="text-white/60">{opt.tradeoffs.risk}</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-white/40">{opt.reasoning}</p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EnergyPanel({ profile }: { profile: EnergyProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Energy Model</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-cyan-400">
            {profile.productiveHours.toFixed(1)}h
          </span>
          <span className="text-sm text-white/40">/ {profile.totalFreeHours}h free</span>
        </div>
        <p className="mt-2 text-xs text-white/50">{profile.reasoning}</p>
        <div className="mt-4 space-y-2">
          {profile.peakWindows.map((w) => (
            <div key={w.start} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-xs">{w.start} – {w.end}</span>
              <span className="text-xs font-medium text-cyan-400">{w.score}% peak</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RescuePlanPanel({ plans }: { plans: RescuePlan[] }) {
  if (!plans.length) return null;

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle className="text-red-400">Rescue Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.id}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-white/60">
                Triggered at {Math.round(plan.failureProbability * 100)}% failure probability
              </span>
            </div>
            <div className="space-y-2">
              {plan.roadmap.map((step) => (
                <div key={step.step} className="flex items-start gap-3 rounded-lg bg-white/5 p-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-medium text-red-400">
                    {step.step}
                  </div>
                  <div>
                    <div className="text-sm">{step.title}</div>
                    <div className="text-[10px] text-white/40">{step.duration}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {plan.actions.map((action) => (
                <div key={action.id} className="rounded-lg border border-white/10 p-3">
                  <div className="text-sm font-medium">{action.title}</div>
                  <div className="text-xs text-white/50">{action.description}</div>
                  <div className="mt-1 text-[10px] text-emerald-400">{action.impact}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ExecutiveSummary({ summary, voiceMessage }: { summary: string; voiceMessage: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-violet-500/10 p-6 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        Chief of Staff Briefing
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{summary}</p>
      <div className="mt-4 rounded-xl bg-black/20 p-4">
        <p className="text-xs text-white/40 mb-1">Voice Coach</p>
        <p className="text-sm italic text-white/70">&ldquo;{voiceMessage}&rdquo;</p>
      </div>
    </motion.div>
  );
}
