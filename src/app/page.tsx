"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Calendar,
  ChevronDown,
  Clock,
  Lock,
  Menu,
  Bot,
  Layers3,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { Logo } from "@/components/ui/logo";

const NAV_ITEMS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#agents", label: "Agents" },
  { href: "#trust", label: "Trust" },
] as const;

const HERO_STATS = [
  { value: "Real data only", label: "Deterministic analytics", desc: "No fabricated percentages or demo scores" },
  { value: "10", label: "Specialized agents", desc: "Coordinated through one execution brain" },
  { value: "Explainable", label: "Transparent rescue logic", desc: "Every intervention traces back to workload signals" },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect and commit",
    desc: "Add your goals, tasks, and deadlines. Connect Google Calendar for real availability. Hourglass learns your work patterns and energy profile.",
    icon: Target,
    accent: "from-sky-500/20 to-blue-500/10",
    border: "border-sky-400/20",
  },
  {
    step: "02",
    title: "Analyze and predict",
    desc: "10 specialized agents analyze workload, capacity, calendar conflicts, risk, and opportunity cost in a single coordinated pass.",
    icon: Brain,
    accent: "from-violet-500/20 to-fuchsia-500/10",
    border: "border-violet-400/20",
  },
  {
    step: "03",
    title: "Prevent and rescue",
    desc: "When modeled failure risk rises, Hourglass proposes trade-offs, creates protected focus blocks, and surfaces the next action.",
    icon: Shield,
    accent: "from-emerald-500/20 to-cyan-500/10",
    border: "border-emerald-400/20",
  },
] as const;

const FEATURE_CARDS = [
  {
    icon: Brain,
    title: "10-Agent Orchestration",
    desc: "Planner, Risk, Calendar, Focus, Energy, Memory, Opportunity, Negotiation, Accountability, and Reflection all coordinated centrally.",
    color: "text-sky-300",
  },
  {
    icon: TrendingDown,
    title: "Future Self Simulation",
    desc: "See missed deadlines, stress accumulation, and career impact before they happen with a day-by-day projection.",
    color: "text-red-300",
  },
  {
    icon: Shield,
    title: "Rescue Mode",
    desc: "When overload appears, Hourglass generates trade-offs, priorities, and immediate next steps from the live workload graph.",
    color: "text-emerald-300",
  },
  {
    icon: Calendar,
    title: "Smart Calendar",
    desc: "Protected deep work sessions, conflict detection, and schedule optimization that respects your real availability.",
    color: "text-cyan-300",
  },
  {
    icon: Zap,
    title: "Commitment Score",
    desc: "A transparent execution metric built from completion, planning quality, consistency, recovery, focus, and reliability.",
    color: "text-yellow-300",
  },
  {
    icon: Target,
    title: "Opportunity Loss Engine",
    desc: "Quantifies what slips when work is delayed, so the system prioritizes the commitments that matter most.",
    color: "text-violet-300",
  },
] as const;

const AGENTS = [
  { name: "Planner", icon: Target, desc: "Turns goals into executable tasks", color: "text-sky-300" },
  { name: "Risk", icon: TrendingDown, desc: "Predicts failure probability per task", color: "text-red-300" },
  { name: "Calendar", icon: Calendar, desc: "Optimizes schedules around energy peaks", color: "text-cyan-300" },
  { name: "Focus", icon: Zap, desc: "Tracks velocity and distraction risk", color: "text-yellow-300" },
  { name: "Energy", icon: Clock, desc: "Models mental energy, not just time", color: "text-emerald-300" },
  { name: "Memory", icon: Brain, desc: "Learns behavior patterns over time", color: "text-violet-300" },
  { name: "Opportunity", icon: Target, desc: "Quantifies cost of missed commitments", color: "text-orange-300" },
  { name: "Negotiation", icon: Users, desc: "Recommends trade-offs when overloaded", color: "text-pink-300" },
  { name: "Accountability", icon: Shield, desc: "Creates commitment loops and escalation", color: "text-indigo-300" },
  { name: "Reflection", icon: BarChart3, desc: "Learns from outcomes and adapts", color: "text-cyan-300" },
] as const;

const TRUST_CARDS = [
  { icon: Lock, title: "Firebase Auth", desc: "Secure authentication with session persistence" },
  { icon: Shield, title: "Per-user Firestore", desc: "Data isolated by user ID with security rules" },
  { icon: Brain, title: "Gemini 2.5 Flash", desc: "AI processing on Google-grade infrastructure" },
] as const;

const FADE_UP = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

function scrollToHash(hash: string) {
  if (typeof document === "undefined") return;
  const target = document.querySelector(hash);
  if (target instanceof HTMLElement) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function LandingPage() {
  const router = useRouter();
  const { profile, authStatus } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const sessionResolved = authStatus !== "Initializing";
  const hasAuthenticatedSession =
    authStatus === "Authenticated" || authStatus === "ProfileIncomplete" || authStatus === "Ready";

  // Auto-redirect authenticated users away from the landing page
  useEffect(() => {
    if (!hasAuthenticatedSession) return;
    router.replace(profile?.onboardingComplete ? "/dashboard" : "/onboarding");
  }, [hasAuthenticatedSession, profile?.onboardingComplete, router]);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.25]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.97]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 24]);
  const heroMotionStyle = prefersReducedMotion ? undefined : { opacity: heroOpacity, scale: heroScale, y: heroY };

  const authLabel = hasAuthenticatedSession ? "Open Dashboard" : sessionResolved ? "Get Started Free" : "Checking session...";
  const trustStatement = useMemo(
    () => (profile?.onboardingComplete ? "Your workspace is ready." : "Start with onboarding and configure your workspace."),
    [profile?.onboardingComplete]
  );

  const handleGetStarted = () => {
    if (hasAuthenticatedSession) {
      router.push(profile?.onboardingComplete ? "/dashboard" : "/onboarding");
      return;
    }

    router.push("/auth");
  };

  const handleLearnMore = () => {
    scrollToHash("#how-it-works");
  };

  const handleNavClick = (href: string) => {
    setMobileNavOpen(false);
    scrollToHash(href);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute -right-32 top-1/4 h-72 w-72 rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-cyan-600/8 blur-[80px]" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-white/8 bg-zinc-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Hourglass AI home">
            <Logo size="sm" variant="light" />
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => handleNavClick(item.href)}
                className="rounded-full px-4 py-2 text-sm text-white/55 transition hover:bg-white/5 hover:text-white/90"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            {!hasAuthenticatedSession && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/auth")}
                disabled={!sessionResolved}
                className="text-white/70 hover:bg-white/5"
              >
                Sign In
              </Button>
            )}
            <Button size="sm" onClick={handleGetStarted} className="group shadow-[0_18px_50px_rgba(56,189,248,0.16)]">
              {authLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 md:hidden"
            aria-expanded={mobileNavOpen}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="border-t border-white/8 bg-zinc-950/95 px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:hidden"
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-3">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => handleNavClick(item.href)}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70 transition hover:border-white/12 hover:bg-white/[0.06]"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {!hasAuthenticatedSession && (
                    <Button variant="outline" onClick={() => router.push("/auth")} className="border-white/10 bg-white/5" disabled={!sessionResolved}>
                      Sign In
                    </Button>
                  )}
                  <Button onClick={handleGetStarted} className={hasAuthenticatedSession ? "col-span-2" : ""} disabled={!sessionResolved && !hasAuthenticatedSession}>
                    {authLabel}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative pt-28 sm:pt-32">
        <section ref={heroRef} className="relative">
          <motion.div style={heroMotionStyle} className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
              <div className="max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-1.5 text-xs font-medium text-sky-100 shadow-[0_10px_40px_rgba(56,189,248,0.12)]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Google VIBE2SHIP Hackathon - Powered by Gemini 2.5 Flash
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.6 }}
                  className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl"
                >
                  The AI that predicts
                  <span className="block text-white">
                    missed deadlines
                  </span>
                  before they happen.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16, duration: 0.55 }}
                  className="mt-6 max-w-2xl text-lg leading-8 text-white/62"
                >
                  Not a reminder app. Not a chatbot. An autonomous execution operating system that continuously
                  predicts failure, reorganizes your schedule, and prevents you from missing commitments before
                  it is too late.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.5 }}
                  className="mt-10 flex flex-col gap-3 sm:flex-row"
                >
                  <Button size="lg" onClick={handleGetStarted} className="group min-w-[210px] shadow-[0_20px_80px_rgba(56,189,248,0.18)]">
                    {authLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleLearnMore} className="border-white/10 bg-white/5">
                    See How It Works
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </motion.div>

                <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] text-white/42">
                  {["Calm interface", "Real scheduling data", "Explainable orchestration"].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32, duration: 0.5 }}
                  className="mt-12 grid gap-4 sm:grid-cols-3"
                >
                  {HERO_STATS.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-2xl font-semibold tracking-tight text-white">{stat.value}</div>
                      <div className="mt-1 text-sm font-medium text-white/80">{stat.label}</div>
                      <div className="mt-1 text-xs leading-5 text-white/40">{stat.desc}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.65 }}
                className="relative"
              >
                <div className="absolute -left-8 top-12 h-24 w-24 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="absolute right-2 top-0 h-28 w-28 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/10 backdrop-blur-2xl">
                  <div className="flex items-center justify-between rounded-[28px] border border-white/8 bg-black/25 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/40">
                      <Activity className="h-4 w-4 text-sky-300" />
                      Live execution preview
                    </div>
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-200">
                      {trustStatement}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="absolute left-6 top-6 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl" />
                      <div className="absolute right-8 top-10 h-24 w-24 rounded-full bg-violet-400/20 blur-2xl" />
                      <div className="relative">
                        <div className="text-xs uppercase tracking-[0.3em] text-white/30">Mission board</div>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                          Hello,
                          <span className="block bg-gradient-to-r from-sky-200 via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                            Meet your future schedule.
                          </span>
                        </h2>
                        <p className="mt-4 max-w-md text-sm leading-6 text-white/55">
                          Hourglass maps risk, capacity, and rescue actions into one calm execution surface that feels
                          clear in under twenty seconds.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2">
                          {["Protect focus", "Predict risk", "Rescue commitments"].map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/60">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-8 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[22px] border border-white/10 bg-zinc-950/60 p-4">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Deadline risk</div>
                            <div className="mt-2 text-3xl font-semibold text-white">Low</div>
                            <p className="mt-2 text-xs leading-5 text-white/45">
                              High confidence because the task graph is stable and the calendar is clear.
                            </p>
                          </div>
                          <div className="rounded-[22px] border border-white/10 bg-zinc-950/60 p-4">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Focus blocks</div>
                            <div className="mt-2 text-3xl font-semibold text-white">3</div>
                            <p className="mt-2 text-xs leading-5 text-white/45">
                              Protected deep work windows automatically placed around your peak energy.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[30px] border border-white/10 bg-zinc-950/70 p-5">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/35">
                          <span>Execution health</span>
                          <span className="text-emerald-300">Stable</span>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-4">
                          <div>
                            <div className="text-3xl font-semibold text-white">84%</div>
                            <p className="mt-2 max-w-[180px] text-xs leading-5 text-white/45">
                              Strong momentum, with enough capacity to absorb one surprise without losing the week.
                            </p>
                          </div>
                          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/10">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-zinc-950">
                              <Brain className="h-7 w-7 text-sky-300" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-sky-500/10 to-cyan-500/10 p-5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/35">
                          <Bot className="h-4 w-4 text-violet-200" />
                          Agent timeline
                        </div>
                        <div className="mt-4 space-y-3">
                          {[
                            "Planner decomposed the goal.",
                            "Calendar reserved deep work.",
                            "Risk flagged one dependency.",
                            "Rescue mode stayed idle.",
                          ].map((line, index) => (
                            <div key={line} className="flex items-start gap-3">
                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[10px] text-white/50">
                                {index + 1}
                              </span>
                              <p className="text-sm text-white/70">{line}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[
                      { label: "Confidence", value: "High", note: "Based on profile completeness" },
                      { label: "Risk window", value: "2 days", note: "Before the next protected review" },
                      { label: "Next action", value: "Start", note: "One click to open onboarding" },
                    ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">{item.label}</div>
                        <div className="mt-2 text-xl font-semibold text-white">{item.value}</div>
                        <p className="mt-1 text-xs leading-5 text-white/45">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section id="how-it-works" className="relative py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              {...FADE_UP}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
                <Layers3 className="h-3.5 w-3.5 text-sky-300" />
                How it works
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Your AI Chief of Staff in three steps
              </h2>
              <p className="mt-4 text-white/55">
                Hourglass connects to your calendar, analyzes your commitments, and continuously predicts
                execution risk. Then it intervenes before you miss anything.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <motion.article
                  key={step.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.12 }}
                  viewport={{ once: true, margin: "-60px" }}
                  className={`relative overflow-hidden rounded-[30px] border bg-gradient-to-br p-6 shadow-[0_20px_80px_rgba(0,0,0,0.12)] ${step.accent} ${step.border}`}
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/35">Step {step.step}</div>
                  <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">{step.desc}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="relative py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              {...FADE_UP}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
                <BarChart3 className="h-3.5 w-3.5 text-violet-300" />
                Capabilities
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Everything you need to avoid execution failure
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/55">
                The product is built around real user data, explainable predictions, and a workflow that stays
                editable at every step.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_CARDS.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true, margin: "-80px" }}
                  className="glass rounded-[28px] p-6 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                >
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{feature.desc}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="agents" className="relative py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              {...FADE_UP}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
                <Users className="h-3.5 w-3.5 text-cyan-300" />
                Agent network
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A team of specialists working for you
              </h2>
              <p className="mt-4 text-white/55">
                Each agent has a specific role, and they run in a coordinated pipeline so the UI never feels like
                disconnected modules.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {AGENTS.map((agent, index) => (
                <motion.article
                  key={agent.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * (index % 5) }}
                  viewport={{ once: true, margin: "-60px" }}
                  className="glass rounded-[24px] p-4 text-center transition hover:bg-white/[0.08]"
                >
                  <agent.icon className={`mx-auto h-6 w-6 ${agent.color}`} />
                  <h3 className="mt-3 text-sm font-semibold text-white">{agent.name}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-white/45">{agent.desc}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="relative py-24 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              {...FADE_UP}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
                <Lock className="h-3.5 w-3.5 text-emerald-300" />
                Privacy and security
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Built on Google Cloud, secured by Firebase
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/55">
                Authentication uses Firebase Auth with Google Sign-In or email and password. Firestore security
                rules enforce per-user access, and no data is shared with third parties.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {TRUST_CARDS.map((card) => (
                <div key={card.title} className="glass rounded-[28px] p-6">
                  <card.icon className="mx-auto h-6 w-6 text-emerald-300" />
                  <h3 className="mt-3 text-base font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-24 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              className="relative overflow-hidden rounded-[38px] border border-sky-400/20 bg-gradient-to-br from-sky-500/12 via-cyan-500/10 to-slate-500/10 p-8 sm:p-12"
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-400/20 blur-[100px]" />
              </div>
              <div className="relative text-center">
                <div className="flex justify-center">
                  <Logo size="lg" variant="light" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Stop missing deadlines.
                  <span className="block">Start predicting them.</span>
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-white/60">
                  Join Hourglass AI and let the execution engine protect your commitments. Free to start. No
                  credit card required.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button size="lg" onClick={handleGetStarted} className="min-w-[210px]">
                    {authLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {!hasAuthenticatedSession && (
                    <Button size="lg" variant="outline" onClick={() => router.push("/auth")} className="border-white/10 bg-white/5" disabled={!sessionResolved}>
                      Sign In
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Logo size="sm" variant="light" />

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/45">
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Powered by Gemini 2.5 Flash</span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Google VIBE2SHIP Hackathon</span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Predictive execution for serious work</span>
          </div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
