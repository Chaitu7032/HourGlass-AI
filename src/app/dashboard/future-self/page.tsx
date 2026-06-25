"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { FutureSelfSimulation } from "@/components/dashboard/future-self-simulation";
import { OpportunityLossPanel } from "@/components/dashboard/opportunity-panel";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FutureSelfPage() {
  const { orchestration } = useHourglassStore();

  if (!orchestration) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-white/50">Run analysis to simulate your future trajectory.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Mission Control</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Future Self Simulation</h1>
          <p className="text-sm text-white/40">
            Predictive timeline — if current behavior continues, here's what happens
          </p>
        </div>
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
