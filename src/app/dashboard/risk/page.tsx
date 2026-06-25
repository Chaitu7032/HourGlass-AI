"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RiskPage() {
  const { orchestration } = useHourglassStore();

  if (!orchestration) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-white/50">Run analysis first to generate risk assessments.</p>
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
        <h1 className="mb-6 text-2xl font-bold">Risk Heatmap</h1>
        <RiskHeatmap assessments={orchestration.riskAssessments} />
      </div>
    </DashboardShell>
  );
}
