"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Hourglass, Sparkles, ArrowRight, Brain, Shield, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHourglassStore } from "@/lib/store/hourglass-store";

export default function LandingPage() {
  const router = useRouter();
  const loadDemo = useHourglassStore((s) => s.loadDemo);

  const handleDemo = () => {
    loadDemo();
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-violet-600/15 blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
            <Hourglass className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold">Hourglass AI</span>
        </div>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          Sign In
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12 text-center lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
            <Sparkles className="h-3 w-3 text-blue-400" />
            Google VIBE2SHIP Hackathon · Gemini 2.5 Flash
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            The AI that predicts
            <br />
            <span className="gradient-text">missed deadlines</span>
            <br />
            before they happen
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/50">
            Not a reminder app. An autonomous execution operating system that continuously
            predicts failure, intervenes before deadlines slip, and negotiates when capacity
            exceeds reality.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={handleDemo} className="group min-w-[200px]">
              Launch Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push("/dashboard")}>
              Mission Control
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-20 grid gap-4 sm:grid-cols-3"
        >
          {[
            {
              icon: Brain,
              title: "10-Agent Orchestration",
              desc: "Planner, Risk, Calendar, Focus, Energy, Memory, Opportunity — all coordinated.",
            },
            {
              icon: Shield,
              title: "Rescue Mode",
              desc: "89% failure detected? Calendar reorganized. Roadmap generated. Automatically.",
            },
            {
              icon: TrendingDown,
              title: "Future Self Simulation",
              desc: "See the cascade of missed deadlines, stress, and career impact before it happens.",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass rounded-2xl p-6 text-left"
            >
              <feature.icon className="h-8 w-8 text-blue-400" />
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-white/50">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left"
        >
          <p className="text-xs uppercase tracking-wider text-white/40">Demo scenario</p>
          <p className="mt-2 text-sm text-white/70">
            Student enters: Exam (7d), Interview (5d), Hackathon (4d), Assignment (3d).
            Within seconds — agents activate, failure detected, heatmap generated, rescue plan appears.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
