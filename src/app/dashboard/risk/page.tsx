"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { PredictionList } from "@/components/dashboard/prediction-detail";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

export default function RiskPage() {
  const { orchestration } = useHourglassStore();

  if (!orchestration) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BarChart3 className="h-12 w-12 text-white/20" />
          <p className="mt-4 text-white/50">Run analysis first to generate risk assessments.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Mission Control</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold">Risk Assessment</h1>
          <p className="mt-1 text-sm text-white/40">
            AI-powered failure prediction with explainable risk factors
          </p>
        </motion.div>

        <RiskHeatmap assessments={orchestration.riskAssessments} />

        <div>
          <h2 className="mb-4 text-lg font-semibold">Detailed Predictions</h2>
          <PredictionList assessments={orchestration.riskAssessments} />
        </div>
      </div>
    </DashboardShell>
  );
}
