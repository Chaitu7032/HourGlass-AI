"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingDown, ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { FutureSelfSimulation } from "@/components/dashboard/future-self-simulation";
import { OpportunityLossPanel } from "@/components/dashboard/opportunity-panel";
import { Button } from "@/components/ui/button";
import { useHourglassStore } from "@/lib/store/hourglass-store";

export default function FutureSelfPage() {
  const { orchestration, tasks } = useHourglassStore();

  if (!orchestration) {
    return (
      <DashboardShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-violet-500/20">
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">No future self simulation yet</h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            {tasks.length === 0
              ? "Add commitments and run the planning pipeline. The Future Self simulation uses your current workload and historical execution patterns to project a 14-day trajectory."
              : "Run planning from Mission Control to generate your future trajectory simulation."}
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
          className="mb-6"
        >
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Mission Control
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Future Self Simulation</h1>
          <p className="mt-1 text-sm text-white/40">
            Simulation based on your current workload and historical execution patterns. This is not a prediction — it is a what-if model showing the trajectory if no changes are made.
          </p>
        </motion.div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FutureSelfSimulation projections={orchestration.futureSelf} />
          </div>
          <div className="space-y-6">
            <OpportunityLossPanel impacts={orchestration.opportunityImpacts} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
