"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarRange,
  Brain,
  Sparkles,
  Shield,
  Gauge,
  Wand2,
  Hourglass,
  Bot,
} from "lucide-react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initializationLines = [
  "Initializing Executive Intelligence...",
  "Planner Agent Online",
  "Memory Engine Connected",
  "Focus Intelligence Activated",
  "Calendar Intelligence Ready",
  "Risk Prediction Engine Online",
  "Opportunity Analysis Running",
  "Future Simulation Initialized",
  "AI Executive System Ready",
];

const featureCards = [
  {
    title: "Predict Failure Before It Happens",
    description: "AI predicts which commitments are likely to fail before deadlines arrive.",
    icon: Gauge,
    tone: "from-blue-500/20 to-cyan-500/10",
  },
  {
    title: "Adaptive Planning",
    description: "Plans your work automatically and continuously updates it.",
    icon: CalendarRange,
    tone: "from-violet-500/20 to-fuchsia-500/10",
  },
  {
    title: "Rescue Mode",
    description: "Automatically restructures your schedule when risk increases.",
    icon: Shield,
    tone: "from-emerald-500/20 to-teal-500/10",
  },
  {
    title: "Future Simulation",
    description: "See how today's decisions affect tomorrow's outcomes.",
    icon: Brain,
    tone: "from-amber-500/20 to-orange-500/10",
  },
  {
    title: "AI Executive Assistant",
    description: "Acts as your Chief of Staff across commitments, calendars, and execution.",
    icon: Bot,
    tone: "from-sky-500/20 to-indigo-500/10",
  },
];

export default function ActivationPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [activeLineCount, setActiveLineCount] = useState(1);
  const [typedText, setTypedText] = useState("");

  const displayName = useMemo(() => {
    const source = profile?.displayName ?? user?.displayName ?? "";
    const trimmed = source.trim();
    return trimmed ? trimmed.split(/\s+/)[0] ?? "" : "";
  }, [profile?.displayName, user?.displayName]);

  useEffect(() => {
    router.prefetch("/commitments/new");
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    const lineTimer = window.setInterval(() => {
      setActiveLineCount((current) => {
        if (current >= initializationLines.length) {
          window.clearInterval(lineTimer);
          return current;
        }
        return current + 1;
      });
    }, 520);

    let index = 0;
    const typingTimer = window.setInterval(() => {
      index += 1;
      setTypedText(initializationLines[0].slice(0, index));
      if (index >= initializationLines[0].length) {
        window.clearInterval(typingTimer);
      }
    }, 35);

    return () => {
      window.clearInterval(lineTimer);
      window.clearInterval(typingTimer);
    };
  }, []);

  const handleStart = () => router.push("/commitments/new");
  const handleExplore = () => router.push("/dashboard");

  return (
    <AuthGate>
      <div className="relative min-h-screen overflow-hidden bg-[#04050a] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),radial-gradient(circle_at_20%_20%,_rgba(168,85,247,0.16),_transparent_30%),radial-gradient(circle_at_80%_70%,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,rgba(7,10,20,0.94),rgba(4,5,10,1))]" />
          <div className="absolute left-[-12%] top-[-12%] h-[32rem] w-[32rem] rounded-full bg-sky-500/15 blur-[140px]" />
          <div className="absolute right-[-10%] top-[18%] h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/10 blur-[160px]" />
          <div className="absolute bottom-[-18%] left-[18%] h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-[170px]" />
        </div>

        <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10 md:px-8 lg:px-12">
          <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="relative"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-sky-300" />
                AI Activation Experience
              </div>

              <div className="mt-6 max-w-2xl">
                <p className="text-sm uppercase tracking-[0.35em] text-white/35">
                  Predictive Execution Operating System
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  {displayName ? `Welcome, ${displayName}.` : "Welcome to Hourglass AI."}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
                  Your Predictive Execution Operating System.
                  <br />
                  Not a reminder app.
                  <br />
                  An AI that changes your future before deadlines become failures.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200">
                      <Hourglass className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Executive intelligence online</p>
                      <p className="text-xs text-white/45">Initializing the system before planning begins.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
                      <Wand2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Personalized execution</p>
                      <p className="text-xs text-white/45">Tailored to your name, goals, and deadlines.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={handleStart} className="group min-w-[240px]">
                  Create My First Commitment
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleExplore} className="border-white/15 bg-white/5">
                  Explore Platform
                </Button>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.6 }}
              className="relative"
            >
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Initialization</p>
                    <p className="mt-2 text-lg font-medium text-white">Executive system coming online</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                      className="rounded-full"
                    >
                      <Hourglass className="h-5 w-5 text-sky-300" />
                    </motion.div>
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-white/10 bg-[#060816] p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm text-sky-200">
                    <Shield className="h-4 w-4" />
                    <span>{typedText || initializationLines[0]}</span>
                  </div>

                  <div className="space-y-3">
                    {initializationLines.map((line, index) => {
                      const active = index < activeLineCount;
                      return (
                        <motion.div
                          key={line}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: active ? 1 : 0.28, y: 0 }}
                          transition={{ duration: 0.35, delay: index * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all",
                            active ? "border-emerald-400/20 bg-emerald-400/10 text-white" : "border-white/5 bg-white/5 text-white/45"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                              active ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/40"
                            )}
                          >
                            {active ? "✓" : index + 1}
                          </span>
                          <span className="flex-1">{line}</span>
                          {index === activeLineCount - 1 && activeLineCount < initializationLines.length && (
                            <motion.span
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 1.6 }}
                              className="h-2.5 w-2.5 rounded-full bg-sky-300"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          <section className="pb-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <p className="text-xs uppercase tracking-[0.3em] text-white/35">What Hourglass does</p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 + 0.15 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className={cn(
                    "group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/20 backdrop-blur-2xl",
                    "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)]"
                  )}
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", card.tone)} />
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                      <card.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">{card.description}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </AuthGate>
  );
}
