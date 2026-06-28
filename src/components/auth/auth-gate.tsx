"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Shield, Sparkles } from "lucide-react";
import { useAuth, type AuthStatus } from "@/components/auth/auth-provider";
import { Logo } from "@/components/ui/logo";

// States where we block rendering and show the loading screen
const BLOCKING_STATES: AuthStatus[] = [
  "Initializing",
  "Authenticated", // profile is loading
  "SigningOut",
];

// States that require redirect to /auth
const UNAUTH_STATES: AuthStatus[] = ["Unauthenticated", "ExpiredSession"];

export function AuthGate({
  children,
  requireOnboardingComplete = true,
}: {
  children: React.ReactNode;
  requireOnboardingComplete?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { authStatus } = useAuth();

  useEffect(() => {
    // Don't redirect while still initializing
    if (authStatus === "Initializing" || authStatus === "Authenticated" || authStatus === "SigningOut") {
      return;
    }

    if (UNAUTH_STATES.includes(authStatus)) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireOnboardingComplete && authStatus === "ProfileIncomplete") {
      router.replace("/onboarding");
    }
  }, [authStatus, pathname, requireOnboardingComplete, router]);

  // Show loading screen while state machine is in blocking states
  if (BLOCKING_STATES.includes(authStatus)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Securing your workspace</p>
              <p className="text-sm text-white/50">Verifying your session and loading your profile.</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
            <div className="flex items-center gap-4">
              <Logo size="md" variant="light" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Preparing your execution system</p>
                <p className="text-xs text-white/45">Authenticating, syncing, and priming dashboard data.</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300 animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300/70 animate-pulse [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300/40 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
            <Sparkles className="h-3.5 w-3.5 text-sky-300" />
            Session persistence enabled
          </div>
        </div>
      </div>
    );
  }

  // Block render for unauthenticated states (redirect is already triggered)
  if (UNAUTH_STATES.includes(authStatus)) {
    return null;
  }

  // Block if onboarding required but incomplete (redirect is already triggered)
  if (requireOnboardingComplete && authStatus === "ProfileIncomplete") {
    return null;
  }

  return <>{children}</>;
}
