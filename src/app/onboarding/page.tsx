"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, Target } from "lucide-react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, finishOnboarding } = useAuth();
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [profile?.onboardingComplete, router]);

  const resolvedDisplayName = displayName ?? profile?.displayName ?? user?.displayName ?? "";
  const resolvedPrimaryGoal = primaryGoal ?? profile?.primaryGoal ?? "";
  const resolvedTimezone = timezone ?? profile?.timezone ?? defaultTimezone;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await finishOnboarding({
        displayName: resolvedDisplayName.trim(),
        primaryGoal: resolvedPrimaryGoal.trim(),
        timezone: resolvedTimezone,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to finish onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate requireOnboardingComplete={false}>
      <div className="relative min-h-screen overflow-hidden bg-zinc-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[12%] h-80 w-80 rounded-full bg-sky-500/18 blur-[150px]" />
          <div className="absolute bottom-[8%] right-[6%] h-96 w-96 rounded-full bg-emerald-500/12 blur-[160px]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65">
              <Sparkles className="h-4 w-4 text-sky-300" />
              First login onboarding
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Teach Hourglass who you are optimizing for.
            </h1>
            <p className="mt-4 text-base leading-7 text-white/55">
              This first-run setup seeds your profile so future scheduling, rescue planning, and accountability can
              operate with real context instead of demo assumptions.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Create your user profile in Firestore",
                "Lock in your primary operating goal",
                "Store timezone context for scheduling and calendar coordination",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="w-full max-w-lg"
          >
            <Card className="border-white/10 bg-black/20 backdrop-blur-2xl">
              <CardHeader>
                <CardTitle>Complete your setup</CardTitle>
                <CardDescription>
                  This becomes the baseline profile for protected routes and future planning flows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2">
                    <span className="text-sm text-white/65">Display name</span>
                    <input
                      type="text"
                      required
                      value={resolvedDisplayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                      placeholder="What should Hourglass call you?"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-white/65">Primary goal</span>
                    <textarea
                      required
                      value={resolvedPrimaryGoal}
                      onChange={(event) => setPrimaryGoal(event.target.value)}
                      className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/50"
                      placeholder="Example: Ship Hourglass AI to production and manage my execution calendar without missed deadlines."
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-white/65">Timezone</span>
                    <input
                      type="text"
                      required
                      value={resolvedTimezone}
                      onChange={(event) => setTimezone(event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                    />
                  </label>

                  {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p>}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    <Target className="h-4 w-4" />
                    {submitting ? "Saving workspace..." : "Enter Mission Control"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </AuthGate>
  );
}
