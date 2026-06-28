import type { PlannerSuggestion, TaskCategory, TaskPriority } from "@/types";

export type CommitmentDraft = {
  title: string;
  description?: string;
  deadline?: string;
  estimatedHours?: number | null;
  priority?: TaskPriority | null;
  category?: TaskCategory | null;
  complexity?: number | null;
};

export const COMPLEXITY_SCALE: Record<
  number,
  {
    label: string;
    hint: string;
  }
> = {
  1: { label: "Tiny", hint: "Quick follow-up or light admin work." },
  2: { label: "Easy", hint: "Low-friction task with a small decision surface." },
  3: { label: "Small", hint: "Contained task with a few moving parts." },
  4: { label: "Moderate", hint: "Requires planning and a focused block." },
  5: { label: "Medium", hint: "A normal commitment with moderate coordination." },
  6: { label: "Challenging", hint: "Needs deliberate focus and clear checkpoints." },
  7: { label: "Difficult", hint: "Likely needs multiple work sessions." },
  8: { label: "Very Difficult", hint: "High coordination or deep cognitive load." },
  9: { label: "Expert", hint: "Large commitment with notable uncertainty." },
  10: { label: "Massive Commitment", hint: "Substantial execution effort across several sessions." },
};

export const CATEGORY_OPTIONS: { value: TaskCategory; label: string; description: string }[] = [
  { value: "interview", label: "Interview", description: "Interview prep, application, or hiring loop work." },
  { value: "exam", label: "Exam", description: "Exam prep, revision, and assessment work." },
  { value: "assignment", label: "Assignment", description: "Academic deliverables with a fixed due date." },
  { value: "hackathon", label: "Hackathon", description: "Time-boxed build, competition, or sprint event." },
  { value: "research", label: "Research", description: "Exploration, reading, synthesis, or experiments." },
  { value: "coding_project", label: "Coding Project", description: "Implementation, debugging, or shipping code." },
  { value: "startup", label: "Startup", description: "Product, growth, or founder execution work." },
  { value: "open_source", label: "Open Source", description: "Community-driven engineering or contribution work." },
  { value: "project", label: "Project", description: "Cross-functional initiative with defined milestones." },
  { value: "meeting", label: "Meeting", description: "Live discussion, preparation, or follow-up." },
  { value: "health", label: "Health", description: "Sleep, fitness, care, and recovery commitments." },
  { value: "personal", label: "Personal", description: "Life admin, family, or personal obligations." },
  { value: "finance", label: "Finance", description: "Budgeting, invoices, taxes, or money management." },
  { value: "learning", label: "Learning", description: "Courses, study goals, or skill-building." },
  { value: "work", label: "Work", description: "Job-related execution and operational tasks." },
  { value: "career", label: "Career", description: "Long-term career planning and positioning." },
  { value: "side_project", label: "Side Project", description: "Independent build or creative project work." },
  { value: "other", label: "Other", description: "Anything that does not fit the core categories." },
];

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string; description: string }[] = [
  { value: "critical", label: "Critical", description: "Must happen now or the commitment will likely slip. Highest urgency." },
  { value: "high", label: "Important", description: "Strongly worth protecting in the current timeline. High impact." },
  { value: "medium", label: "Planned", description: "Should happen soon, but there is some flexibility. On the roadmap." },
  { value: "low", label: "Flexible", description: "Useful work that can move if capacity gets tight. Low urgency." },
];

const CATEGORY_KEYWORDS: Array<{ match: RegExp; value: TaskCategory }> = [
  { match: /interview|recruit|resume|offer|leetcode|hiring/i, value: "interview" },
  { match: /exam|test|quiz|midterm|final/i, value: "exam" },
  { match: /assignment|homework|essay|paper|submission/i, value: "assignment" },
  { match: /hackathon|hackathon demo|sprint|shipathon/i, value: "hackathon" },
  { match: /research|paper|study|analysis|investigate/i, value: "research" },
  { match: /code|bug|build|feature|app|website|api|deploy/i, value: "coding_project" },
  { match: /startup|founder|pitch|product|mvp|launch/i, value: "startup" },
  { match: /open source|github|repo|pull request|pr/i, value: "open_source" },
  { match: /meeting|sync|standup|review|call/i, value: "meeting" },
  { match: /health|gym|workout|doctor|sleep|therapy|recovery/i, value: "health" },
  { match: /finance|tax|budget|invoice|payment|bank/i, value: "finance" },
  { match: /learn|course|lesson|practice|study/i, value: "learning" },
  { match: /career|network|linkedin|portfolio|job/i, value: "career" },
  { match: /side project|sideproject|personal project/i, value: "side_project" },
  { match: /project|initiative|milestone|deliverable|launch/i, value: "project" },
  { match: /personal|family|home|errand/i, value: "personal" },
];

export function getComplexityCopy(value: number) {
  return COMPLEXITY_SCALE[Math.min(10, Math.max(1, Math.round(value)))] ?? COMPLEXITY_SCALE[5];
}

export function getCategoryLabel(category: TaskCategory) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? "Other";
}

export function getPriorityLabel(priority: TaskPriority) {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? "Planned";
}

export function getPriorityExplanation(priority: TaskPriority): string {
  switch (priority) {
    case "critical":
      return "Critical — must happen now or this commitment will slip. Highest urgency.";
    case "high":
      return "Important — strongly worth protecting in the current timeline. High impact if missed.";
    case "medium":
      return "Planned — should happen soon, but there is flexibility in timing.";
    case "low":
      return "Flexible — useful work that can move if capacity gets tight. Low urgency.";
    default:
      return "Priority level helps the planner allocate attention and calendar blocks.";
  }
}

export function inferCategoryFromText(text: string): TaskCategory {
  const lower = text.trim();
  const match = CATEGORY_KEYWORDS.find((entry) => entry.match.test(lower));
  return match?.value ?? "other";
}

export function inferPriorityFromDraft(draft: CommitmentDraft, category: TaskCategory, riskScore: number): TaskPriority {
  if (draft.priority) return draft.priority;
  const title = draft.title.toLowerCase();
  const deadlineDays = draft.deadline ? Math.max(0, (new Date(draft.deadline).getTime() - Date.now()) / 86_400_000) : 7;

  if (/(urgent|asap|now|today|tomorrow|critical)/i.test(title) || riskScore >= 0.75 || deadlineDays <= 1) {
    return "critical";
  }
  if (deadlineDays <= 3 || riskScore >= 0.55 || category === "interview" || category === "exam") {
    return "high";
  }
  if (deadlineDays <= 7 || riskScore >= 0.35) {
    return "medium";
  }
  return "low";
}

function getBaseHours(category: TaskCategory, title: string): number {
  const keywordWeight =
    /(build|ship|launch|project|mvp|prepare|prepare|write|research|study|solve|debug|design|plan)/i.test(title)
      ? 2
      : 1;

  const categoryHours: Record<TaskCategory, number> = {
    exam: 12,
    interview: 10,
    assignment: 8,
    hackathon: 14,
    research: 10,
    coding_project: 14,
    startup: 16,
    open_source: 6,
    meeting: 2,
    health: 3,
    personal: 3,
    finance: 4,
    learning: 8,
    work: 6,
    career: 7,
    side_project: 10,
    project: 10,
    other: 5,
  };

  return categoryHours[category] * keywordWeight;
}

function buildSubtasks(category: TaskCategory, title: string): string[] {
  const defaults: Record<TaskCategory, string[]> = {
    exam: ["Map syllabus", "Review weak areas", "Run one timed practice block"],
    interview: ["Review role requirements", "Practice answers", "Do one mock round"],
    assignment: ["Clarify rubric", "Draft outline", "Complete and polish submission"],
    hackathon: ["Define the build goal", "Ship a working demo slice", "Prepare a submission pass"],
    research: ["Define question", "Collect sources", "Synthesize findings"],
    coding_project: ["Define scope", "Ship first vertical slice", "Test and polish"],
    startup: ["Clarify outcome", "Cut scope to MVP", "Prepare launch checklist"],
    open_source: ["Inspect issue or PR", "Implement smallest fix", "Submit and follow up"],
    meeting: ["Prepare context", "Capture decisions", "Send follow-up"],
    health: ["Prepare environment", "Complete session", "Log recovery"],
    personal: ["Gather details", "Handle the core step", "Close the loop"],
    finance: ["Collect numbers", "Validate assumptions", "Take action"],
    learning: ["Pick one lesson", "Practice actively", "Summarize what stuck"],
    work: ["Clarify deliverable", "Execute core work", "Share progress"],
    career: ["Define target", "Prepare assets", "Take the next outreach step"],
    side_project: ["Pick the next milestone", "Build the smallest useful slice", "Review and iterate"],
    project: ["Define scope", "Ship first vertical slice", "Test and polish"],
    other: ["Clarify the outcome", "Take the first concrete step", "Check what remains"],
  };

  const smartPrefix = title.trim() ? title.trim() : "Enter a task title";
  return defaults[category].map((item) => `${smartPrefix}: ${item}`);
}

function buildExecutionStrategy(category: TaskCategory, riskScore: number, hours: number, complexity: number): string {
  const sessions = Math.max(2, Math.ceil(hours / 1.5));
  const cadence = riskScore >= 0.65 ? "protected deep-work blocks" : "steady execution blocks";
  const pace = complexity >= 8 ? "short, focused sprints" : "balanced work sessions";
  const categoryNote =
    category === "exam" || category === "interview"
      ? "front-load practice and review"
      : category === "coding_project" || category === "startup"
        ? "ship the smallest usable slice first"
        : "start with the least ambiguous step";

  return `Use ${sessions} ${cadence} across the next few days, then finish with ${pace}. ${categoryNote}.`;
}

export function buildPlannerSuggestion(draft: CommitmentDraft): PlannerSuggestion {
  const normalizedTitle = draft.title.trim() || "Enter a task title";
  const category = draft.category ?? inferCategoryFromText(`${normalizedTitle} ${draft.description ?? ""}`);
  const rawComplexity = draft.complexity ?? Math.min(10, Math.max(2, Math.round(getBaseHours(category, normalizedTitle) / 2)));
  const complexity = Math.min(10, Math.max(1, Math.round(rawComplexity)));
  const complexityCopy = getComplexityCopy(complexity);
  const estimatedHours = draft.estimatedHours ?? Math.max(1, Math.round(getBaseHours(category, normalizedTitle) + Math.max(0, complexity - 5) * 1.5));
  const deadlineDays = draft.deadline ? Math.max(0, (new Date(draft.deadline).getTime() - Date.now()) / 86_400_000) : 7;
  const riskScore = Math.min(0.98, Math.max(0.08, (complexity / 10) * 0.42 + (estimatedHours / Math.max(8, deadlineDays * 3)) * 0.45));
  const priority = inferPriorityFromDraft(draft, category, riskScore);
  const subtasks = buildSubtasks(category, normalizedTitle).slice(0, Math.min(5, Math.max(3, Math.ceil(estimatedHours / 6))));
  const availableCapacityHours = Math.max(2, Math.round(Math.max(6, deadlineDays * 2.25) * 10) / 10);
  const suggestedWorkSessions = Math.max(2, Math.ceil(estimatedHours / 1.5));
  const confidence = Math.min(0.96, Math.max(0.6, 0.92 - Math.min(0.18, Math.abs((draft.estimatedHours ?? estimatedHours) - estimatedHours) / Math.max(estimatedHours, 1) * 0.2)));
  const executionHealth =
    riskScore >= 0.75 ? "At risk" : riskScore >= 0.5 ? "Watch closely" : riskScore >= 0.3 ? "Stable" : "Healthy";

  return {
    source: "Heuristic",
    confidence,
    estimatedHours,
    estimatedHoursConfidence: Math.max(0.55, confidence - 0.08),
    complexity,
    complexityLabel: complexityCopy.label,
    priority,
    category,
    deadlineRisk: riskScore >= 0.8 ? "critical" : riskScore >= 0.65 ? "high" : riskScore >= 0.45 ? "elevated" : riskScore >= 0.25 ? "moderate" : "low",
    subtaskCount: subtasks.length,
    subtasks,
    executionStrategy: buildExecutionStrategy(category, riskScore, estimatedHours, complexity),
    suggestedWorkSessions,
    availableCapacityHours,
    firstStep: subtasks[0] ?? `Clarify the first step for ${normalizedTitle}`,
    executionHealth,
    reasoning: `${normalizedTitle} maps to ${getCategoryLabel(category)} work. The estimate assumes ${complexityCopy.label.toLowerCase()} complexity, ${suggestedWorkSessions} work sessions, and ${deadlineDays.toFixed(0)} day(s) until the deadline.`,
    assumptions: [
      `Deadline window: ${deadlineDays.toFixed(0)} day(s)`,
      `AI estimate can be overridden by the user`,
      `Capacity is based on a conservative planning model`,
    ],
  };
}
