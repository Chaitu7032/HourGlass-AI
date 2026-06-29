"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, Target } from "lucide-react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { useExecutionProfile } from "@/lib/execution/use-intelligence";
import { ExecutionProfileForm } from "@/components/onboarding/execution-profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExecutionProfile } from "@/types/execution-profile";

type OnboardingStep = "basic" | "execution-profile";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, finishOnboarding } = useAuth();
  const { updateProfile } = useExecutionProfile();
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [step, setStep] = useState<OnboardingStep>("basic");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.onboardingComplete && profile) {
      // Check if execution profile is already set
      import("@/lib/firebase/execution-profile").then(({ getExecutionProfile }) => {
        if (!user?.uid) return;
        getExecutionProfile(user.uid)
          .then((ep) => {
            if (ep.profileComplete) {
              router.replace("/dashboard");
            } else {
              setStep("execution-profile");
            }
          })
          .catch(() => {
            setStep("execution-profile");
          });
      });
    }
  }, [profile, router, user?.uid]);

  const resolvedDisplayName = displayName ?? profile?.displayName ?? user?.displayName ?? "";
  const resolvedPrimaryGoal = primaryGoal ?? profile?.primaryGoal ?? "";
  const resolvedTimezone = timezone ?? profile?.timezone ?? defaultTimezone;
  const greetingName = resolvedDisplayName.trim().split(/\s+/).filter(Boolean)[0] ?? "";

  const handleBasicSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await finishOnboarding({
        displayName: resolvedDisplayName.trim(),
        primaryGoal: resolvedPrimaryGoal.trim(),
        timezone: resolvedTimezone,
      });
      // Move to execution profile step
      setStep("execution-profile");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to finish onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecutionProfileSave = async (execProfile: ExecutionProfile) => {
    setError(null);
    try {
      await updateProfile(execProfile);
      router.replace("/activation");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile.");
    }
  };

  const handleSkipExecutionProfile = async () => {
    router.replace("/activation");
  };

  return (
    <AuthGate requireOnboardingComplete={false}>
      <div className="relative min-h-screen overflow-hidden bg-zinc-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[12%] h-80 w-80 rounded-full bg-sky-500/18 blur-[150px]" />
          <div className="absolute bottom-[8%] right-[6%] h-96 w-96 rounded-full bg-emerald-500/12 blur-[160px]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center">
          {/* Left side - info */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65">
              <Sparkles className="h-4 w-4 text-sky-300" />
              {step === "basic" ? "First login onboarding" : "Personal Execution Profile"}
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {step === "basic"
                ? greetingName
                  ? `Welcome, ${greetingName}.`
                  : "Welcome to Hourglass AI."
                : "Configure Your Execution Profile"}
            </h1>
            <p className="mt-4 text-base leading-7 text-white/55">
              {step === "basic"
                ? "Let's personalize your executive operating system so it feels built around how you work."
                : "Set up your work schedule, energy patterns, and preferences. Hourglass uses this to compute every calculation — no external integrations required."}
            </p>

            {step === "basic" ? (
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
            ) : (
              <div className="mt-8 space-y-4">
                {[
                  "Set working days and hours for capacity calculations",
                  "Configure energy profile and deep work windows",
                  "Define interruption level and recovery needs",
                  "Get real analytics immediately — no calendar required",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Right side - form */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="w-full max-w-lg"
          >
            <Card className="border-white/10 bg-black/20 backdrop-blur-2xl">
              <CardHeader>
                <CardTitle>
                  {step === "basic" ? "Complete your setup" : "Personal Execution Profile"}
                </CardTitle>
                <CardDescription>
                  {step === "basic"
                    ? "This becomes the baseline profile for protected routes and future planning flows."
                    : "This profile is the mathematical foundation for every AI calculation."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <p className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                    {error}
                  </p>
                )}

                <AnimatePresence mode="wait">
                  {step === "basic" && (
                    <motion.div
                      key="basic"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <form className="space-y-4" onSubmit={handleBasicSubmit}>
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

                        <Button type="submit" className="w-full" disabled={submitting}>
                          <Target className="h-4 w-4" />
                          {submitting ? "Saving workspace..." : "Continue to Execution Profile"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </form>
                    </motion.div>
                  )}

                  {step === "execution-profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <ExecutionProfileForm
                        onSave={handleExecutionProfileSave}
                        onSkip={handleSkipExecutionProfile}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </AuthGate>
  );
}
