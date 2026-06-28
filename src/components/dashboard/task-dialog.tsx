"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Lightbulb,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlannerSuggestion, TaskCategory, TaskPriority } from "@/types";
import {
  CATEGORY_OPTIONS,
  COMPLEXITY_SCALE,
  PRIORITY_OPTIONS,
  buildPlannerSuggestion,
  getCategoryLabel,
} from "@/lib/agents/planner-core";
import { cn } from "@/lib/utils";

type TaskFormValues = {
  title: string;
  description: string;
  deadlineDate: string;
  estimatedHours: string;
  priority: TaskPriority;
  category: TaskCategory;
  complexity: string;
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultValues(): TaskFormValues {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  return {
    title: "",
    description: "",
    deadlineDate: formatDateInput(deadline),
    estimatedHours: "",
    priority: "medium",
    category: "other",
    complexity: "",
  };
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    title: string;
    description: string;
    deadline: string;
    estimatedHours: number;
    priority: TaskPriority;
    category: TaskCategory;
    complexity: number;
  }) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

function formatHours(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

function getDeadlineDate(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysRemaining(value: string) {
  const deadline = getDeadlineDate(value);
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000));
}

function getRiskTone(risk: PlannerSuggestion["deadlineRisk"]) {
  switch (risk) {
    case "critical":
      return "text-red-300 border-red-500/30 bg-red-500/10";
    case "high":
      return "text-orange-300 border-orange-500/30 bg-orange-500/10";
    case "elevated":
      return "text-yellow-300 border-yellow-500/30 bg-yellow-500/10";
    case "moderate":
      return "text-blue-300 border-blue-500/30 bg-blue-500/10";
    default:
      return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  }
}

function getExecutionHealthTone(value: string) {
  if (value === "At risk") return "text-red-300";
  if (value === "Watch closely") return "text-orange-300";
  if (value === "Stable") return "text-yellow-300";
  return "text-emerald-300";
}

function isMeaningfulDescription(description: string) {
  return description.trim().length >= 12;
}

function getAnalysisConfidence(values: TaskFormValues) {
  const title = values.title.trim();
  const description = values.description.trim();
  const hasTitle = Boolean(title);
  const hasMeaningfulDescription = isMeaningfulDescription(description);
  const hasDeadlineContext = Boolean(values.deadlineDate);
  const hasCategoryContext = values.category !== "other";
  const hasPriorityContext = values.priority !== "medium";
  const hasComplexityContext = Boolean(values.complexity.trim());

  if (!hasTitle && !hasMeaningfulDescription) {
    return null;
  }

  let value = 0;

  if (hasTitle) value += 35;
  if (hasMeaningfulDescription) value += hasTitle ? 25 : 45;
  if (hasDeadlineContext) value += 10;
  if (hasCategoryContext) value += 10;
  if (hasPriorityContext) value += 5;
  if (hasComplexityContext) value += 5;

  value = Math.min(92, value);

  return {
    value,
    label: value >= 80 ? "high" : value >= 50 ? "medium" : "low",
  } as const;
}

export function TaskDialog({ open, onOpenChange, onSubmit, isSaving, error }: TaskDialogProps) {
  const [values, setValues] = useState<TaskFormValues>(createDefaultValues);
  const [plannerSuggestion, setPlannerSuggestion] = useState<PlannerSuggestion | null>(null);
  const [plannerStatus, setPlannerStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    estimatedHours: false,
    priority: false,
    category: false,
    complexity: false,
  });

  // Reset form every time dialog opens to avoid stale state
  useEffect(() => {
    if (open) {
      const reset = window.setTimeout(() => {
        setValues(createDefaultValues());
        setTouched({ estimatedHours: false, priority: false, category: false, complexity: false });
        setPlannerSuggestion(null);
        setPlannerStatus("idle");
        setSuggestionError(null);
      }, 0);

      return () => window.clearTimeout(reset);
    }
  }, [open]);

  const parsedHours = values.estimatedHours ? Number(values.estimatedHours) : Number.NaN;
  const parsedComplexity = values.complexity ? Number(values.complexity) : Number.NaN;
  const titleText = values.title.trim();
  const descriptionText = values.description.trim();
  const hasMeaningfulInput = Boolean(titleText) || isMeaningfulDescription(descriptionText);
  const analysisSeedTitle = titleText || (isMeaningfulDescription(descriptionText) ? descriptionText.slice(0, 120) : "");
  const inputConfidence = getAnalysisConfidence(values);
  const daysRemaining = getDaysRemaining(values.deadlineDate);

  useEffect(() => {
    if (!hasMeaningfulInput) {
      const reset = window.setTimeout(() => {
        setPlannerSuggestion(null);
        setPlannerStatus("idle");
        setSuggestionError(null);
      }, 0);

      return () => window.clearTimeout(reset);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setPlannerSuggestion(null);
      setPlannerStatus("loading");
      setSuggestionError(null);

      try {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: analysisSeedTitle,
            description: descriptionText,
            deadline: getDeadlineDate(values.deadlineDate)?.toISOString(),
            estimatedHours: Number.isFinite(parsedHours) ? parsedHours : null,
            priority: touched.priority ? values.priority : null,
            category: touched.category ? values.category : null,
            complexity: Number.isFinite(parsedComplexity) ? parsedComplexity : null,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Planner analysis unavailable");
        }

        const suggestion = (await response.json()) as PlannerSuggestion;

        setPlannerSuggestion(suggestion);
        setPlannerStatus("success");

        setValues((current) => {
          const next = { ...current };
          if (!touched.estimatedHours && !current.estimatedHours.trim()) {
            next.estimatedHours = String(suggestion.estimatedHours);
          }
          if (!touched.complexity && !current.complexity.trim()) {
            next.complexity = String(suggestion.complexity);
          }
          if (!touched.priority) {
            next.priority = suggestion.priority;
          }
          if (!touched.category) {
            next.category = suggestion.category;
          }
          return next;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setPlannerSuggestion(null);
        setPlannerStatus("error");
        setSuggestionError(err instanceof Error ? err.message : "Planner analysis unavailable");
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [analysisSeedTitle, descriptionText, hasMeaningfulInput, parsedComplexity, parsedHours, touched.category, touched.complexity, touched.estimatedHours, touched.priority, values.category, values.deadlineDate, values.priority]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const deadline = getDeadlineDate(values.deadlineDate);
    const finalSuggestion =
      plannerSuggestion ??
      buildPlannerSuggestion({
        title: analysisSeedTitle || "Enter a task title",
        description: descriptionText,
        deadline: deadline?.toISOString(),
        estimatedHours: Number.isFinite(parsedHours) ? parsedHours : null,
        priority: values.priority,
        category: values.category,
        complexity: Number.isFinite(parsedComplexity) ? parsedComplexity : null,
      });
    await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      deadline: (deadline ?? new Date()).toISOString(),
      estimatedHours: Number.isFinite(parsedHours) ? parsedHours : finalSuggestion.estimatedHours,
      priority: values.priority,
      category: values.category,
      complexity: Number.isFinite(parsedComplexity) ? parsedComplexity : finalSuggestion.complexity,
    });
  };

  const complexityNumber = plannerSuggestion
    ? plannerSuggestion.complexity
    : Number.isFinite(parsedComplexity)
      ? parsedComplexity
      : null;
  const complexityCopy = complexityNumber
    ? COMPLEXITY_SCALE[Math.min(10, Math.max(1, Math.round(complexityNumber)))] ?? COMPLEXITY_SCALE[5]
    : null;
  const priorityCopy = PRIORITY_OPTIONS.find((option) => option.value === values.priority) ?? PRIORITY_OPTIONS[2];
  const categoryCopy = CATEGORY_OPTIONS.find((option) => option.value === values.category) ?? CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
  const deadlineRiskTone = plannerSuggestion ? getRiskTone(plannerSuggestion.deadlineRisk) : "text-white/45 border-white/10 bg-white/5";
  const executionHealthTone = plannerSuggestion ? getExecutionHealthTone(plannerSuggestion.executionHealth) : "text-white/45";
  const analysisConfidenceText = inputConfidence ? `${inputConfidence.label} confidence (${inputConfidence.value}%)` : "â€”";
  const executionHealthText = plannerSuggestion ? plannerSuggestion.executionHealth : hasMeaningfulInput ? "Awaiting analysis" : "Insufficient information";
  const riskText = plannerSuggestion ? plannerSuggestion.deadlineRisk : hasMeaningfulInput ? "Awaiting analysis" : "Insufficient information";
  const effortText = plannerSuggestion ? formatHours(plannerSuggestion.estimatedHours) : hasMeaningfulInput ? "Analyzing..." : "Waiting for analysis";
  const complexityText = plannerSuggestion ? `${plannerSuggestion.complexity}/10` : hasMeaningfulInput ? "Analyzing..." : "Waiting for analysis";
  const sessionsText = plannerSuggestion ? `${plannerSuggestion.suggestedWorkSessions}` : hasMeaningfulInput ? "Pending estimation" : "Waiting for analysis";
  const capacityText = plannerSuggestion ? formatHours(plannerSuggestion.availableCapacityHours) : hasMeaningfulInput ? "Pending estimation" : "Waiting for analysis";
  const confidenceText = plannerSuggestion ? `${Math.round(plannerSuggestion.confidence * 100)}%` : analysisConfidenceText;
  const firstStepText: string = plannerSuggestion
    ? String(typeof plannerSuggestion.firstStep === "string" ? plannerSuggestion.firstStep : ((plannerSuggestion.firstStep as Record<string, unknown>)?.title ?? JSON.stringify(plannerSuggestion.firstStep)))
    : hasMeaningfulInput
      ? "Awaiting analysis"
      : "Enter a task title to generate recommendations.";
  const subtasksText: string[] = plannerSuggestion
    ? plannerSuggestion.subtasks.slice(0, 3).map((item): string => typeof item === "string" ? item : String((item as Record<string, unknown>)?.title ?? (item as Record<string, unknown>)?.description ?? JSON.stringify(item)))
    : hasMeaningfulInput
      ? ["Recommendations will appear after analysis."]
      : ["Enter a task title to generate recommendations."];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0 sm:w-[calc(100vw-3rem)] sm:max-w-5xl lg:max-w-6xl">
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr_0.95fr]">
          <div className="flex min-h-0 flex-col overflow-hidden border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8">
              <DialogHeader className="max-w-xl text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Planner-assisted commitment
                </div>
                <DialogTitle>Create a commitment with AI planning support</DialogTitle>
                <DialogDescription>
                  Start with a title and Hourglass will suggest effort, complexity, priority, category, and first
                  steps. Everything stays editable before we save to Firestore.
                </DialogDescription>
              </DialogHeader>

              <form id="commitment-form" className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-white/70">Task title</span>
                    <Input
                      required
                      value={values.title}
                      onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Ship homepage analytics before Thursday"
                    />
                  </label>

                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-sm font-medium text-white/70">Description</span>
                    <Textarea
                      value={values.description}
                      onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                      placeholder="What exactly needs to be delivered? What does success look like? Any blockers or dependencies?"
                    />
                    <p className="text-[11px] leading-5 text-white/35">
                      Give the planner enough context to estimate effort, identify blockers, and recommend the first step.
                    </p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/70">Deadline</span>
                    <Input
                      required
                      type="date"
                      value={values.deadlineDate}
                      onChange={(event) => setValues((current) => ({ ...current, deadlineDate: event.target.value }))}
                    />
                    <p className="text-[11px] text-white/35">
                      {daysRemaining !== null ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining` : "No deadline selected"}
                    </p>
                  </label>

                  <label className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-white/70">Estimated hours</span>
                      <span className="text-[11px] text-sky-300">
                        {confidenceText}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={values.estimatedHours}
                      onChange={(event) => {
                        setTouched((current) => ({ ...current, estimatedHours: true }));
                        setValues((current) => ({ ...current, estimatedHours: event.target.value }));
                      }}
                      placeholder={plannerSuggestion ? String(plannerSuggestion.estimatedHours) : hasMeaningfulInput ? "Waiting for analysis" : "Enter a task title"}
                    />
                    <p className="text-[11px] text-white/35">You can override the recommendation at any time.</p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/70">Priority</span>
                    <select
                      value={values.priority}
                      onChange={(event) => {
                        setTouched((current) => ({ ...current, priority: true }));
                        setValues((current) => ({ ...current, priority: event.target.value as TaskPriority }));
                      }}
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-sky-400/50 focus:bg-white/[0.06]"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-zinc-950">
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-white/35">{priorityCopy.description}</p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/70">Category</span>
                    <select
                      value={values.category}
                      onChange={(event) => {
                        setTouched((current) => ({ ...current, category: true }));
                        setValues((current) => ({ ...current, category: event.target.value as TaskCategory }));
                      }}
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-sky-400/50 focus:bg-white/[0.06]"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-zinc-950">
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-white/35">{categoryCopy.description}</p>
                  </label>

                  <label className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white/70">Complexity</span>
                      <span className="text-sm text-white/40">
                        {complexityText} Â· {complexityCopy?.label ?? "Waiting"}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      step="1"
                      value={values.complexity}
                      onChange={(event) => {
                        setTouched((current) => ({ ...current, complexity: true }));
                        setValues((current) => ({ ...current, complexity: event.target.value }));
                      }}
                      placeholder="5"
                    />
                    <p className="text-[11px] leading-5 text-white/35">{complexityCopy?.hint ?? "Waiting for analysis"}</p>
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                      <Brain className="h-4 w-4 text-sky-300" />
                      Planner analysis
                    </div>
                    <span className={cn("text-[11px] uppercase tracking-[0.18em]", plannerSuggestion?.source === "Gemini" ? "text-emerald-300" : "text-white/40")}>
                      {plannerStatus === "loading"
                        ? "Analyzing..."
                        : plannerSuggestion
                          ? `${plannerSuggestion.source} assisted`
                          : hasMeaningfulInput
                            ? "Awaiting analysis"
                            : "Waiting for input"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    {plannerSuggestion
                      ? plannerSuggestion.reasoning
                      : hasMeaningfulInput
                        ? "Hourglass is preparing a recommendation from your profile and commitment context."
                        : "Enter a task title to generate recommendations."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/45">
                    {plannerSuggestion
                      ? plannerSuggestion.assumptions.map((item, idx) => {
                          const text = String(typeof item === "string" ? item : (item as Record<string, unknown>)?.title ?? (item as Record<string, unknown>)?.description ?? JSON.stringify(item));
                          return (
                            <span key={idx} className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                              {text}
                            </span>
                          );
                        })
                      : [hasMeaningfulInput ? "Waiting for analysis" : "Enter a task title to generate recommendations."].map((item) => (
                          <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                            {item}
                          </span>
                        ))}
                  </div>
                  {suggestionError && (
                    <p className="mt-3 text-xs text-white/35">
                      {suggestionError}. The preview is waiting for a valid analysis response.
                    </p>
                  )}
                </div>

                {error && (
                  <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                    {error}
                  </p>
                )}
              </form>
            </div>

            {/* â”€â”€ Sticky submit bar â”€â”€ */}
            <div className="shrink-0 border-t border-white/10 bg-zinc-950/95 p-4 backdrop-blur-md sm:p-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving || !values.title.trim()} form="commitment-form">
                  <Target className="h-4 w-4" />
                  {isSaving ? "Saving commitment..." : "Create commitment"}
                </Button>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col overflow-hidden bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
            <div className="overflow-y-auto overscroll-contain p-6 sm:p-8">
              <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-white/35">
                  <ListChecks className="h-4 w-4 text-sky-300" />
                  Execution preview
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  plannerStatus === "loading"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : plannerSuggestion?.source === "Gemini"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/40"
                )}>
                  {plannerStatus === "loading"
                    ? "Analyzing..."
                    : plannerSuggestion
                      ? plannerSuggestion.source === "Gemini"
                        ? "AI powered"
                        : "AI ready"
                      : hasMeaningfulInput
                        ? "Awaiting analysis"
                        : "Waiting"}
                </span>
              </div>

              {/* â”€â”€ Commitment Card â”€â”€ */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-violet-500/5 p-4">
                <h3 className="text-xl font-semibold text-white leading-tight">
                  {titleText || "Enter a task title"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {descriptionText || "Add a description so the planner can generate more credible recommendations."}
                </p>
              </div>

              {/* â”€â”€ Quick Stats Grid â”€â”€ */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <motion.div layout className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                    <Clock3 className="h-3 w-3" />
                    Effort
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-white">{effortText}</span>
                    <span className="text-[10px] text-white/40">{plannerSuggestion ? `${Math.round(plannerSuggestion.estimatedHoursConfidence * 100)}%` : "—"}</span>
                  </div>
                </motion.div>

                <motion.div layout className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                    <CircleGauge className="h-3 w-3" />
                    Complexity
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-semibold text-white">{complexityText}</span>
                    <span className="ml-1.5 text-xs text-white/50">{complexityCopy?.label ?? "Waiting"}</span>
                  </div>
                </motion.div>

                <motion.div layout className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                    <CalendarDays className="h-3 w-3" />
                    Deadline risk
                  </div>
                  <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", deadlineRiskTone)}>
                    {riskText}
                  </span>
                </motion.div>

                <motion.div layout className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                    <Brain className="h-3 w-3" />
                    Sessions
                  </div>
                  <div className="mt-1">
                    <span className="text-lg font-semibold text-white">{sessionsText}</span>
                    <span className="ml-1.5 text-xs text-white/50">blocks</span>
                  </div>
                </motion.div>
              </div>

              {/* â”€â”€ Capacity & Health Row â”€â”€ */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <motion.div layout className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/35">Available capacity</div>
                  <div className="mt-1 text-lg font-semibold text-white">{capacityText}</div>
                  <div className="text-[10px] text-white/45">Conservative window</div>
                </motion.div>

                <motion.div layout className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/35">Execution health</div>
                  <div className={cn("mt-1 text-lg font-semibold", executionHealthTone)}>
                    {executionHealthText}
                  </div>
                  <div className="text-[10px] text-white/45">{confidenceText}</div>
                </motion.div>
              </div>

              {/* â”€â”€ Suggested Subtasks â”€â”€ */}
              <motion.div layout className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <Lightbulb className="h-3 w-3" />
                  Suggested subtasks {plannerSuggestion ? `(${plannerSuggestion.subtaskCount})` : ""}
                </div>
                <div className="mt-2 space-y-1.5">
                  {subtasksText.map((item) => (
                    <div key={item} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
                      <span className="text-xs text-white/65">{item}</span>
                    </div>
                  ))}
                  {plannerSuggestion && plannerSuggestion.subtaskCount > 3 && (
                    <p className="text-[10px] text-white/35 pl-5">+{plannerSuggestion.subtaskCount - 3} more</p>
                  )}
                </div>
              </motion.div>

              {/* â”€â”€ First Step â”€â”€ */}
              <motion.div layout className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-sky-300">
                    <ArrowRight className="h-3 w-3" />
                    Recommended first step
                  </div>
                  <span className="text-[10px] text-white/40">confidence {confidenceText}</span>
                </div>
                <p className="mt-1 text-sm leading-5 text-white/80">{firstStepText}</p>
              </motion.div>

              {/* â”€â”€ Plan Summary â”€â”€ */}
              <motion.div layout className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <Target className="h-3 w-3" />
                  Plan summary
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-white/60">{effortText}</span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-white/60">{complexityCopy?.label ?? "Waiting"}</span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-white/60">{getCategoryLabel(values.category)}</span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-white/60">{priorityCopy.label}</span>
                </div>
                <p className="mt-2 text-[10px] text-white/40 leading-4">
                  {plannerStatus === "loading"
                    ? "Planner is refining the estimate..."
                    : plannerSuggestion?.source === "Gemini"
                      ? "Live planner recommendations powered by Gemini."
                      : hasMeaningfulInput
                        ? "Awaiting analysis."
                        : "Enter a task title to start analysis."}
                </p>
              </motion.div>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

