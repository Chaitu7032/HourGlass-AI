"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGate({
  children,
  requireOnboardingComplete = true,
}: {
  children: React.ReactNode;
  requireOnboardingComplete?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, initialized } = useAuth();
  const awaitingProfile = Boolean(user) && !profile;

  useEffect(() => {
    if (!initialized || loading || awaitingProfile) return;

    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireOnboardingComplete && profile && !profile.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [awaitingProfile, initialized, loading, pathname, profile, requireOnboardingComplete, router, user]);

  if (
    !initialized ||
    loading ||
    !user ||
    awaitingProfile ||
    (requireOnboardingComplete && profile && !profile.onboardingComplete)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Securing your workspace</p>
              <p className="text-sm text-white/50">Verifying your session and loading your profile.</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
            <Sparkles className="h-3.5 w-3.5 text-sky-300" />
            Session persistence enabled
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
