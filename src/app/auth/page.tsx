"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Hourglass, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "signin" | "signup" | "reset";

function getFriendlyAuthError(message: string) {
  if (message.includes("auth/invalid-credential")) return "Incorrect email or password.";
  if (message.includes("auth/email-already-in-use")) return "An account with this email already exists.";
  if (message.includes("auth/weak-password")) return "Use a stronger password with at least 6 characters.";
  if (message.includes("auth/popup-closed-by-user")) return "Google sign-in was canceled before completion.";
  return message;
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { user, profile, loading, initialized, error, signInWithEmail, signInWithGoogle, signUpWithEmail, sendPasswordReset } =
    useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initialized || loading || !user) return;
    router.replace(profile?.onboardingComplete ? next : "/onboarding");
  }, [initialized, loading, next, profile?.onboardingComplete, router, user]);

  const headline = useMemo(() => {
    if (mode === "reset") return "Reset your password";
    if (mode === "signup") return "Create your Hourglass account";
    return "Sign in to Hourglass";
  }, [mode]);

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      if (mode === "signup") {
        await signUpWithEmail({ name, email, password });
        setStatus("Account created. Finishing sign-in...");
        return;
      }

      if (mode === "reset") {
        await sendPasswordReset(email);
        setStatus("Password reset email sent. Check your inbox.");
        return;
      }

      await signInWithEmail(email, password);
      setStatus("Signed in. Redirecting...");
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Authentication failed.";
      setStatus(getFriendlyAuthError(message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSubmitting(true);
    setStatus(null);

    try {
      await signInWithGoogle();
      setStatus("Google sign-in complete. Redirecting...");
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Google sign-in failed.";
      setStatus(getFriendlyAuthError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-[8%] h-72 w-72 rounded-full bg-blue-500/20 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[8%] h-80 w-80 rounded-full bg-cyan-500/15 blur-[150px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:gap-12">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65">
            <Hourglass className="h-4 w-4 text-sky-300" />
            Production authentication with Firebase
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            A secure front door for your Chief of Staff.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-white/55">
            Use Google or email and password. Sessions persist across refreshes, protected routes stay locked down,
            and first-time users are guided into onboarding before touching the dashboard.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm font-medium text-white">Protected routes</p>
              <p className="mt-1 text-sm text-white/50">Session cookie plus middleware protection for the dashboard.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <KeyRound className="h-5 w-5 text-sky-300" />
              <p className="mt-3 text-sm font-medium text-white">Password recovery</p>
              <p className="mt-1 text-sm text-white/50">Reset flows and resilient loading states are built in.</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-10 w-full max-w-md lg:mt-0"
        >
          <Card className="border-white/10 bg-black/20 backdrop-blur-2xl">
            <CardHeader>
              <CardTitle>{headline}</CardTitle>
              <CardDescription>
                {mode === "reset"
                  ? "We will send a secure reset link to your inbox."
                  : "Access your execution OS with a persistent authenticated session."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={mode === "reset" ? "signin" : mode}
                onValueChange={(value) => {
                  setMode(value as Mode);
                  setStatus(null);
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form className="space-y-4" onSubmit={handleEmailAuth}>
                    <label className="block space-y-2">
                      <span className="text-sm text-white/65">Email</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-white/65">Password</span>
                      <input
                        type="password"
                        required={mode !== "reset"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                        placeholder="Enter your password"
                      />
                    </label>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form className="space-y-4" onSubmit={handleEmailAuth}>
                    <label className="block space-y-2">
                      <span className="text-sm text-white/65">Full name</span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                        placeholder="How should Hourglass address you?"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-white/65">Email</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-white/65">Password</span>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                        placeholder="Create a password"
                      />
                    </label>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-white/30">
                <div className="h-px flex-1 bg-white/10" />
                or continue with
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleAuth} disabled={submitting}>
                <Mail className="h-4 w-4" />
                Continue with Google
              </Button>

              <button
                type="button"
                className="mt-4 text-sm text-sky-300 transition hover:text-sky-200"
                onClick={() => {
                  setMode(mode === "reset" ? "signin" : "reset");
                  setStatus(null);
                }}
              >
                {mode === "reset" ? "Back to sign in" : "Forgot your password?"}
              </button>

              {mode === "reset" && (
                <form className="mt-4 space-y-4" onSubmit={handleEmailAuth}>
                  <label className="block space-y-2">
                    <span className="text-sm text-white/65">Email</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                      placeholder="you@example.com"
                    />
                  </label>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Sending link..." : "Send reset link"}
                  </Button>
                </form>
              )}

              {(status || error) && (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  {status ?? error}
                </p>
              )}

              <p className="mt-5 text-xs text-white/35">
                By continuing, you agree to use Hourglass with your real calendar, priorities, and execution data.
              </p>

              <Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => router.push("/")}>
                Back to landing page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AuthPageContent />
    </Suspense>
  );
}