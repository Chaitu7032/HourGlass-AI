"use client";

import { motion } from "framer-motion";
import type { AgentLogEntry } from "@/types";
import { cn } from "@/lib/utils";
import {
  Brain,
  Calendar,
  Zap,
  AlertTriangle,
  Target,
  RefreshCw,
  Database,
  Battery,
  Scale,
  Shield,
} from "lucide-react";

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  planner: Target,
  risk: AlertTriangle,
  calendar: Calendar,
  focus: Zap,
  accountability: Shield,
  reflection: RefreshCw,
  memory: Database,
  energy: Battery,
  opportunity: Scale,
  negotiation: Brain,
};

interface AgentPipelineProps {
  logs: AgentLogEntry[];
  isRunning: boolean;
}

export function AgentPipeline({ logs, isRunning }: AgentPipelineProps) {
  const pipelineOrder = [
    "planner",
    "memory",
    "focus",
    "energy",
    "risk",
    "calendar",
    "opportunity",
    "negotiation",
    "accountability",
    "reflection",
  ];

  const completedAgents = new Set(logs.map((l) => l.agent));
  const latestLog = logs[logs.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">Agent Pipeline</h3>
        {isRunning && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xs text-blue-400"
          >
            Orchestrating...
          </motion.span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {pipelineOrder.map((agent, i) => {
          const Icon = AGENT_ICONS[agent] ?? Brain;
          const done = completedAgents.has(agent as AgentLogEntry["agent"]);
          const active = isRunning && latestLog?.agent === agent;

          return (
            <motion.div
              key={agent}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                done
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : active
                    ? "border-blue-500/40 bg-blue-500/10 animate-pulse"
                    : "border-white/5 bg-white/[0.02]"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  done ? "text-emerald-400" : active ? "text-blue-400" : "text-white/20"
                )}
              />
              <span className="text-[10px] capitalize text-white/60">{agent}</span>
            </motion.div>
          );
        })}
      </div>
      {latestLog && (
        <motion.p
          key={latestLog.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-white/40"
        >
          {latestLog.message}
        </motion.p>
      )}
    </div>
  );
}
