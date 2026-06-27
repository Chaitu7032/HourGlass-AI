"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Hourglass, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { useAuth } from "@/components/auth/auth-provider";
import { useExecutionProfile } from "@/lib/execution/use-intelligence";
import { ExecutionProfileForm } from "@/components/onboarding/execution-profile-form";
import { Button } from "@/components/ui/button";
import type { ExecutionProfile } from "@/types/execution-profile";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { loadProfile, updateProfile } = useExecutionProfile();
  const [existingProfile, setExistingProfile] = useState<Partial<ExecutionProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadProfile().then((p) => {
        if (p) {
          setExistingProfile(p);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [user?.uid, loadProfile]);

  const handleSave = async (execProfile: ExecutionProfile) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(execProfile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="mx-auto h-10 w-10 rounded-full border-2 border-sky-400/30 border-t-sky-400"
            />
            <p className="mt-4 text-sm text-white/50">Loading profile...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Mission Control
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-white/40">Manage your Execution Profile and preferences</p>
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white/80">Account</h2>
              <p className="mt-1 text-xs text-white/50">{profile?.displayName ?? "User"}</p>
              <p className="text-xs text-white/40">{profile?.email ?? ""}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
              {profile?.onboardingComplete ? "Onboarding complete" : "Onboarding pending"}
            </div>
          </div>
        </div>

        {/* Success / Error messages */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"
          >
            <Sparkles className="mr-2 inline-block h-4 w-4" />
            Profile saved! All analytics have been recomputed.
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
          >
            {error}
          </motion.div>
        )}

        {/* Execution Profile Editor */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-2xl">
          <h2 className="mb-2 text-lg font-semibold text-white">Personal Execution Profile</h2>
          <p className="mb-6 text-sm text-white/50">
            Edit your work schedule, energy profile, and preferences. Changes immediately recompute all analytics.
          </p>
          <ExecutionProfileForm
            initialProfile={existingProfile ?? undefined}
            onSave={handleSave}
          />
        </div>
      </div>
    </DashboardShell>
  );
}