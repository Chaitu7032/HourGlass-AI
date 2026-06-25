"use client";

import { format } from "date-fns";
import { DashboardShell } from "@/components/layout/sidebar";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const { orchestration } = useHourglassStore();

  if (!orchestration) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-white/50">Run analysis to generate optimized calendar blocks.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Mission Control</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const typeColors: Record<string, string> = {
    focus: "border-blue-500/40 bg-blue-500/10",
    meeting: "border-yellow-500/40 bg-yellow-500/10",
    break: "border-emerald-500/40 bg-emerald-500/10",
    free: "border-white/10 bg-white/5",
    commute: "border-purple-500/40 bg-purple-500/10",
  };

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <h1 className="mb-2 text-2xl font-bold">Calendar Timeline</h1>
        <p className="mb-6 text-sm text-white/40">AI-optimized execution windows</p>
        <div className="space-y-3">
          {orchestration.calendarBlocks.map((block) => (
            <Card key={block.id} className={cn("border", typeColors[block.type])}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{block.title}</div>
                  <div className="text-xs text-white/40 capitalize">{block.type}</div>
                </div>
                <div className="text-right text-sm tabular-nums text-white/60">
                  {format(new Date(block.start), "MMM d · h:mm a")} –{" "}
                  {format(new Date(block.end), "h:mm a")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
