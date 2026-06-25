"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { FutureSelfTimeline } from "@/components/dashboard/commitment-score";
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
        <h1 className="mb-2 text-2xl font-bold">Future Self</h1>
        <p className="mb-6 text-sm text-white/40">
          Predictive timeline — if current behavior continues
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <FutureSelfTimeline projections={orchestration.futureSelf} />
          <OpportunityLossPanel impacts={orchestration.opportunityImpacts} />
        </div>
      </div>
    </DashboardShell>
  );
}
