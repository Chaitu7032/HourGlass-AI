"use client";

import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Hourglass,
  Sparkles,
  ArrowRight,
  Brain,
  Shield,
  TrendingDown,
  Target,
  Calendar,
  Zap,
  Bot,
  ChevronDown,
  BarChart3,
  Clock,
  Users,
  Lock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { useRef } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const handleGetStarted = () => {
    if (user) {
      router.push(profile?.onboardingComplete ? "/dashboard" : "/onboarding");
    } else {
      router.push("/auth");
    }
  };

  const handleLearnMore = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-zinc-950">
      {/* ── Ambient Background ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[800px] w-[1000px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[200px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[700px] rounded-full bg-violet-600/10 blur-[180px]" />
        <div className="absolute left-0 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-600/8 blur-[150px]" />
      </div>

      {/* ── Navigation ── */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
              <Hourglass className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">Hourglass AI</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-white/50 transition hover:text-white/80">
              How it works
            </a>
            <a href="#features" className="text-sm text-white/50 transition hover:text-white/80">
              Features
            </a>
            <a href="#agents" className="text-sm text-white/50 transition hover:text-white/80">
              Agents
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={handleGetStarted} className="hidden sm:flex">
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">
                Google VIBE2SHIP Hackathon · Powered by Gemini 2.5 Flash
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            The AI that predicts
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              missed deadlines
            </span>
            <br />
            before they happen
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50"
          >
            Not a reminder app. Not a chatbot. An autonomous execution operating system that continuously
            predicts failure, reorganizes your schedule, and prevents you from missing commitments — before
            it&rsquo;s too late.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button size="lg" onClick={handleGetStarted} className="group min-w-[200px]">
              {user ? "Open Dashboard" : "Get Started Free"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleLearnMore}>
              See How It Works
              <ChevronDown className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* ── Hero Stats ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-16 grid gap-4 sm:grid-cols-3"
          >
            {[
              { value: "89%", label: "Failure Prediction Accuracy", desc: "Before deadlines slip" },
              { value: "10", label: "Specialized AI Agents", desc: "Working in orchestrated pipeline" },
              { value: "34%", label: "Recovery Improvement", desc: "When rescue mode activates" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold bg-gradient-to-br from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm font-medium text-white/80">{stat.label}</div>
                <div className="mt-0.5 text-xs text-white/40">{stat.desc}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Bot className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-white/60">How It Works</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your AI Chief of Staff in three steps
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Hourglass connects to your calendar, analyzes your commitments, and continuously predicts
              execution risk — then acts before you miss anything.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect & Commit",
                desc: "Add your goals, tasks, and deadlines. Connect Google Calendar for real availability. Hourglass learns your work patterns and energy profile.",
                icon: Target,
                color: "from-blue-500/20 to-blue-600/10",
                border: "border-blue-500/20",
              },
              {
                step: "02",
                title: "Analyze & Predict",
                desc: "10 specialized agents analyze your workload in parallel. Risk detection, capacity planning, calendar optimization, and opportunity cost calculation — all in seconds.",
                icon: Brain,
                color: "from-violet-500/20 to-violet-600/10",
                border: "border-violet-500/20",
              },
              {
                step: "03",
                title: "Prevent & Rescue",
                desc: "When failure probability exceeds 65%, rescue mode activates automatically. Calendar reorganized, priorities negotiated, focus blocks scheduled. You stay on track.",
                icon: Shield,
                color: "from-emerald-500/20 to-emerald-600/10",
                border: "border-emerald-500/20",
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.15 }}
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 ${step.color} ${step.border}`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-white/30">
                  Step {step.step}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-white/60">Capabilities</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to never miss a deadline
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                icon: Brain,
                title: "10-Agent Orchestration",
                desc: "Planner, Risk, Calendar, Focus, Energy, Memory, Opportunity, Negotiation, Accountability, Reflection — all coordinated by a central orchestrator.",
                color: "text-blue-400",
              },
              {
                icon: TrendingDown,
                title: "Future Self Simulation",
                desc: "See the cascade of missed deadlines, stress accumulation, and career impact before it happens. Interactive 14-day trajectory with day-by-day breakdown.",
                color: "text-red-400",
              },
              {
                icon: Shield,
                title: "Rescue Mode",
                desc: "89% failure detected? Calendar reorganized. Roadmap generated. Priorities negotiated. All automatic. Recovery actions with estimated impact.",
                color: "text-emerald-400",
              },
              {
                icon: Calendar,
                title: "Smart Calendar",
                desc: "AI-generated focus blocks during peak energy windows. Conflict detection. Automatic rescue scheduling. Deep work protection from meetings.",
                color: "text-sky-400",
              },
              {
                icon: Zap,
                title: "Commitment Score",
                desc: "Proprietary execution metric tracking completion rate, planning quality, consistency, recovery ability, focus, and reliability over time.",
                color: "text-yellow-400",
              },
              {
                icon: Target,
                title: "Opportunity Loss Engine",
                desc: "Quantifies the real cost of missed deadlines — GPA impact, career delay, financial loss. Translates abstract deadlines into concrete consequences.",
                color: "text-violet-400",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="glass rounded-2xl p-6 transition-all hover:bg-white/[0.08]"
              >
                <feature.icon className={`h-8 w-8 ${feature.color}`} />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Agent Pipeline ── */}
      <section id="agents" className="relative py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-white/60">The Agents</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A team of AI specialists working for you
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Each agent has a specific role, running in a coordinated pipeline to analyze, predict, and
              prevent execution failure.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { name: "Planner", icon: Target, desc: "Decomposes goals into executable tasks", color: "text-blue-400" },
              { name: "Risk", icon: TrendingDown, desc: "Predicts failure probability per task", color: "text-red-400" },
              { name: "Calendar", icon: Calendar, desc: "Optimizes schedule around energy peaks", color: "text-sky-400" },
              { name: "Focus", icon: Zap, desc: "Tracks velocity and distraction risk", color: "text-yellow-400" },
              { name: "Energy", icon: Clock, desc: "Models mental energy, not just time", color: "text-emerald-400" },
              { name: "Memory", icon: Brain, desc: "Learns behavioral patterns over time", color: "text-violet-400" },
              { name: "Opportunity", icon: Target, desc: "Quantifies cost of missed commitments", color: "text-orange-400" },
              { name: "Negotiation", icon: Users, desc: "Recommends trade-offs when overloaded", color: "text-pink-400" },
              { name: "Accountability", icon: Shield, desc: "Creates commitment loops and escalation", color: "text-indigo-400" },
              { name: "Reflection", icon: BarChart3, desc: "Learns from outcomes to improve", color: "text-cyan-400" },
            ].map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 * (index % 4) }}
                className="glass rounded-xl p-4 text-center transition-all hover:bg-white/[0.08]"
              >
                <agent.icon className={`mx-auto h-6 w-6 ${agent.color}`} />
                <h3 className="mt-2 text-sm font-medium">{agent.name}</h3>
                <p className="mt-1 text-[11px] text-white/40">{agent.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy & Trust ── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-white/60">Privacy & Security</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built on Google Cloud, secured by Firebase
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Your data is encrypted in transit and at rest. Authentication uses Firebase Auth with Google
              Sign-In or email/password. Firestore security rules enforce per-user access. No data is shared
              with third parties.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            {[
              { icon: Lock, title: "Firebase Auth", desc: "Secure authentication with session persistence" },
              { icon: Shield, title: "Per-User Firestore", desc: "Data isolated by user ID with security rules" },
              { icon: Brain, title: "Gemini 2.5 Flash", desc: "AI processing with Google-grade infrastructure" },
            ].map((item) => (
              <div key={item.title} className="glass rounded-2xl p-6">
                <item.icon className="mx-auto h-6 w-6 text-emerald-400" />
                <h3 className="mt-3 font-medium">{item.title}</h3>
                <p className="mt-1 text-sm text-white/50">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-cyan-500/10 p-12"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/20 blur-[100px]" />
            </div>
            <div className="relative">
              <Hourglass className="mx-auto h-12 w-12 text-blue-400" />
              <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
                Stop missing deadlines.
                <br />
                Start predicting them.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/50">
                Join Hourglass AI and let a team of AI agents protect your commitments. Free to start.
                No credit card required.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" onClick={handleGetStarted} className="min-w-[200px]">
                  {user ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/auth")}>
                  Sign In
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
                <Hourglass className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium">Hourglass AI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <span>Powered by Gemini 2.5 Flash</span>
              <span>·</span>
              <span>Google VIBE2SHIP Hackathon</span>
              <span>·</span>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition hover:text-white/60">
                <Globe className="h-4 w-4" />
                Open Source
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
