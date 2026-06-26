"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import {
  RescuePlanPanel,
  NegotiationPanel,
  EnergyPanel,
} from "@/components/dashboard/opportunity-panel";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { motion } from "framer-motion";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RescuePage() {
  const { orchestration, tasks } = useHourglassStore();

  if (!orchestration) {
    return (
      <DashboardShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">No rescue analysis available</h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            {tasks.length === 0
              ? "Create commitments in Mission Control and run the planning pipeline. Rescue Mode activates automatically when the Risk Agent detects failure probability above the threshold."
              : "Your commitments are loaded. Run planning in Mission Control to generate rescue plans for at-risk tasks."}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Go to Mission Control</Link>
          </Button>
        </motion.div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Mission Control
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Rescue Mode</h1>
          <p className="mt-1 text-sm text-white/40">
            Autonomous interventions when failure probability exceeds threshold
          </p>
        </motion.div>
        <div className="grid gap-6 lg:grid-cols-2">
          <RescuePlanPanel plans={orchestration.rescuePlans} />
          <div className="space-y-6">
            <NegotiationPanel options={orchestration.negotiationOptions} />
            <EnergyPanel profile={orchestration.energyProfile} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
