import type {
  Task,
  RiskAssessment,
  RiskFactor,
  RescuePlan,
  RescueAction,
  CalendarBlock,
  EnergyProfile,
  OpportunityImpact,
  NegotiationOption,
  FutureSelfProjection,
  CommitmentScore,
  BehaviorPattern,
  AgentLogEntry,
  OrchestrationResult,
} from "@/types";
import { generateId, hoursUntil, daysUntil } from "@/lib/utils";

const RESCUE_THRESHOLD = 0.65;
const AVAILABLE_HOURS = 28;
const VELOCITY = 2.1; // hours/day (dropped 27% from baseline 2.9)
const FOCUS_SCORE = 62;
const ENERGY_SCORE = 58;

function log(
  agent: AgentLogEntry["agent"],
  message: string,
  durationMs: number,
  output?: Record<string, unknown>
): AgentLogEntry {
  return {
    id: generateId(),
    agent,
    status: "complete",
    message,
    timestamp: new Date().toISOString(),
    durationMs,
    output,
  };
}

function computeFailureProbability(task: Task, patterns: BehaviorPattern): {
  probability: number;
  factors: RiskFactor[];
  reasoning: string;
} {
  const remaining = task.estimatedHours - task.completedHours;
  const hoursLeft = hoursUntil(task.deadline);
  const daysLeft = daysUntil(task.deadline);
  const capacityAtVelocity = hoursLeft > 0 ? (hoursLeft / 24) * patterns.executionVelocity : 0;
  const energyAdjusted = capacityAtVelocity * (ENERGY_SCORE / 100);
  const complexityFactor = task.complexity / 10;

  let probability = 0.1;

  const factors: RiskFactor[] = [];

  if (remaining > energyAdjusted) {
    const gap = ((remaining - energyAdjusted) / remaining) * 100;
    probability += Math.min(0.45, gap / 100);
    factors.push({
      name: "Insufficient capacity",
      impact: Math.round(gap * 0.8),
      description: `Need ${remaining}h but energy-adjusted capacity is only ${energyAdjusted.toFixed(1)}h`,
    });
  }

  if (daysLeft <= 3) {
    probability += 0.15;
    factors.push({
      name: "Deadline proximity",
      impact: 15,
      description: `Only ${daysLeft} day(s) remaining with ${remaining}h of work left`,
    });
  }

  if (patterns.executionVelocity < 2.5) {
    probability += 0.12;
    factors.push({
      name: "Velocity decline",
      impact: 12,
      description: `Execution velocity dropped to ${patterns.executionVelocity}h/day (27% below baseline)`,
    });
  }

  if (FOCUS_SCORE < 70) {
    probability += 0.08;
    factors.push({
      name: "Focus degradation",
      impact: 8,
      description: `Focus score at ${FOCUS_SCORE}/100 — distraction risk elevated`,
    });
  }

  probability += complexityFactor * 0.05;
  factors.push({
    name: "Task complexity",
    impact: Math.round(complexityFactor * 5),
    description: `Complexity rating ${task.complexity}/10 for ${task.category}`,
  });

  if (task.dependencies?.length) {
    probability += 0.05;
    factors.push({
      name: "Dependency chain",
      impact: 5,
      description: `Blocked by ${task.dependencies.length} upstream task(s)`,
    });
  }

  probability = Math.min(0.97, Math.max(0.05, probability));

  const reasoning = `There is a ${Math.round(probability * 100)}% probability you will miss "${task.title}" because ${
    factors[0]?.description ?? "multiple risk factors align"
  }. Your available work hours (${AVAILABLE_HOURS}h) are insufficient for the ${54}-hour workload, and execution velocity has dropped 27% this week.`;

  return { probability, factors, reasoning };
}

function buildRescuePlan(task: Task, probability: number): RescuePlan {
  const actions: RescueAction[] = [
    {
      id: generateId(),
      type: "break_down",
      title: "Decompose into 90-min focus sessions",
      description: `Split "${task.title}" into ${Math.ceil((task.estimatedHours - task.completedHours) / 1.5)} Pomodoro blocks`,
      impact: "Reduces cognitive load by 40%",
      priority: 1,
    },
    {
      id: generateId(),
      type: "reschedule",
      title: "Protect morning deep-work blocks",
      description: "Move 2 low-priority calendar events to create 4h focus window",
      impact: "Recovers 4 productive hours",
      priority: 2,
    },
    {
      id: generateId(),
      type: "reallocate",
      title: "Defer ML Assignment prep",
      description: "Postpone non-critical subtasks to after hackathon deadline",
      impact: "Frees 6 hours for critical path",
      priority: 3,
    },
    {
      id: generateId(),
      type: "pomodoro",
      title: "Activate Rescue Pomodoro mode",
      description: "25/5 cycles with accountability check-ins every 2 sessions",
      impact: "Estimated 35% velocity boost",
      priority: 4,
    },
  ];

  return {
    id: generateId(),
    taskId: task.id,
    triggeredAt: new Date().toISOString(),
    failureProbability: probability,
    actions,
    roadmap: [
      { step: 1, title: "Immediate: Cancel non-essential commitments today", duration: "30 min", completed: false },
      { step: 2, title: "Tonight: 2× 90-min deep work on highest-risk task", duration: "3 hours", completed: false },
      { step: 3, title: "Tomorrow AM: Protected focus block (no notifications)", duration: "4 hours", completed: false },
      { step: 4, title: "Negotiate: Defer assignment subtasks", duration: "15 min", completed: false },
      { step: 5, title: "Daily check-in with Accountability Agent", duration: "ongoing", completed: false },
    ],
    voiceMessage: `I've detected an ${Math.round(probability * 100)}% failure risk on your ${task.title}. I've reorganized your calendar and prepared a rescue plan. Let's start with tonight's focus session.`,
  };
}

function buildCalendarBlocks(tasks: Task[]): CalendarBlock[] {
  const blocks: CalendarBlock[] = [];
  const base = new Date();
  base.setHours(9, 0, 0, 0);

  tasks.forEach((task, i) => {
    const start = new Date(base);
    start.setDate(start.getDate() + i);
    start.setHours(9 + (i % 2) * 4, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 2);

    blocks.push({
      id: generateId(),
      title: `Focus: ${task.title}`,
      start: start.toISOString(),
      end: end.toISOString(),
      type: "focus",
      taskId: task.id,
    });
  });

  blocks.push({
    id: generateId(),
    title: "Team standup",
    start: new Date(base.setHours(11, 0)).toISOString(),
    end: new Date(base.setHours(11, 30)).toISOString(),
    type: "meeting",
  });

  return blocks;
}

function buildOpportunityImpacts(tasks: Task[]): OpportunityImpact[] {
  const impactMap: Record<string, Partial<OpportunityImpact>> = {
    exam: {
      impactType: "GPA Impact",
      magnitude: "-0.3 GPA points",
      emotionalWeight: 9,
      description: "Missing exam prep could drop your semester GPA from 3.7 to 3.4, affecting honors eligibility.",
    },
    interview: {
      impactType: "Career Delay",
      magnitude: "~6 months",
      emotionalWeight: 10,
      description: "Underprepared interview typically delays FAANG timeline by 6 months. Re-interview cycle: 4-8 months.",
    },
    hackathon: {
      impactType: "Network & Opportunity",
      magnitude: "$50K+ pipeline",
      emotionalWeight: 8,
      description: "VIBE2SHIP finalists gain Google mentor access. Incomplete submission = zero visibility.",
    },
    assignment: {
      impactType: "Grade Reduction",
      magnitude: "-15 points",
      emotionalWeight: 7,
      description: "Late ML assignment costs 15% per day. Current trajectory: 62/100.",
    },
  };

  return tasks.map((t) => {
    const base = impactMap[t.category] ?? {
      impactType: "Opportunity Loss",
      magnitude: "Significant",
      emotionalWeight: 6,
      description: "Missing this commitment creates downstream scheduling debt.",
    };
    return {
      taskId: t.id,
      taskTitle: t.title,
      category: t.category,
      impactType: base.impactType!,
      magnitude: base.magnitude!,
      emotionalWeight: base.emotionalWeight!,
      description: base.description!,
    };
  });
}

function buildNegotiationOptions(): NegotiationOption[] {
  return [
    {
      id: generateId(),
      scenario: "Protect Career Path",
      tradeoffs: {
        keep: ["Google Interview", "Hackathon Submission"],
        defer: ["ML Assignment (request extension)", "Exam prep (partial)"],
        risk: "Exam score may drop 8-12% without full prep",
      },
      recommended: true,
      reasoning: "Interview and hackathon have highest long-term ROI. Assignment extension is low-friction.",
    },
    {
      id: generateId(),
      scenario: "Protect Academics",
      tradeoffs: {
        keep: ["CS Final Exam", "ML Assignment"],
        defer: ["Hackathon (submit MVP only)", "Interview prep (minimal)"],
        risk: "Interview performance likely suboptimal; hackathon incomplete",
      },
      recommended: false,
      reasoning: "Safer for GPA but sacrifices career acceleration opportunities.",
    },
    {
      id: generateId(),
      scenario: "All-In Sprint (Not Recommended)",
      tradeoffs: {
        keep: ["All 4 commitments"],
        defer: [],
        risk: "89% failure probability on 2+ tasks; burnout within 48h",
      },
      recommended: false,
      reasoning: "54 hours required in 28 available. Physically impossible without quality collapse.",
    },
  ];
}

function buildFutureSelf(): FutureSelfProjection[] {
  const projections: FutureSelfProjection[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const stress = Math.min(95, 35 + i * 4 + (i > 7 ? 15 : 0));
    const missed = i > 5 ? Math.floor((i - 5) / 2) : 0;
    projections.push({
      date: d.toISOString(),
      commitmentScore: Math.max(42, 78 - i * 2.5),
      missedDeadlines: missed,
      stressLevel: stress,
      opportunityLoss: i > 3 ? `$${(i * 8).toFixed(0)}K career pipeline at risk` : "Minimal",
      careerImpact: i > 5 ? "6-month delay accumulating" : "Recoverable",
      academicImpact: i > 4 ? "GPA -0.2 projected" : "On track",
      narrative:
        i <= 3
          ? "Manageable if rescue plan activated now"
          : i <= 7
            ? "Stress compounding — 2 deadlines likely missed"
            : "Critical failure cascade — recovery requires 3+ weeks",
    });
  }
  return projections;
}

/** Deterministic orchestration engine — works offline for demo; Gemini enhances in production */
export async function runOrchestration(tasks: Task[] = []): Promise<OrchestrationResult> {
  const logs: AgentLogEntry[] = [];

  // Planner
  await delay(400);
  const totalHours = tasks.reduce((s, t) => s + t.estimatedHours - t.completedHours, 0);
  logs.push(
    log("planner", `Decomposed ${tasks.length} commitments into ${totalHours}h execution roadmap`, 412, {
      totalHours,
      phases: 3,
    })
  );

  // Memory + Focus (parallel conceptually, sequential in pipeline)
  await delay(300);
  const patterns: BehaviorPattern = {
    preferredWorkHours: { start: 9, end: 23 },
    productivityTrend: -27,
    recurringDelays: ["Sunday evening", "Post-lunch slump"],
    executionVelocity: VELOCITY,
    focusScore: FOCUS_SCORE,
    procrastinationScore: 68,
    successPatterns: ["Morning deep work", "Deadline proximity bursts"],
    failurePatterns: ["Overcommitment", "Context switching", "Weekend planning skip"],
  };
  logs.push(log("memory", "Loaded behavioral memory — 12 patterns, 3 recurring delays", 298, { patterns }));
  logs.push(log("focus", `Velocity ${VELOCITY}h/day (−27% WoW), focus ${FOCUS_SCORE}/100`, 285));

  // Energy
  await delay(250);
  const energyProfile: EnergyProfile = {
    totalFreeHours: AVAILABLE_HOURS,
    productiveHours: AVAILABLE_HOURS * (ENERGY_SCORE / 100) * (FOCUS_SCORE / 100),
    energyScore: ENERGY_SCORE,
    peakWindows: [
      { start: "09:00", end: "11:30", score: 92 },
      { start: "20:00", end: "22:00", score: 78 },
    ],
    reasoning: `4h free today, but energy model predicts only ${(AVAILABLE_HOURS * 0.35).toFixed(1)} productive hours due to sleep debt and elevated stress.`,
  };
  logs.push(log("energy", `Energy-adjusted capacity: ${energyProfile.productiveHours.toFixed(1)}h / ${AVAILABLE_HOURS}h free`, 248));

  // Risk
  await delay(500);
  const riskAssessments: RiskAssessment[] = tasks.map((task) => {
    const { probability, factors, reasoning } = computeFailureProbability(task, patterns);
    return {
      taskId: task.id,
      taskTitle: task.title,
      failureProbability: probability,
      confidence: 0.87,
      factors,
      reasoning,
      rescueRecommended: probability >= RESCUE_THRESHOLD,
      assessedAt: new Date().toISOString(),
    };
  });
  logs.push(
    log("risk", `Assessed ${tasks.length} tasks — ${riskAssessments.filter((r) => r.rescueRecommended).length} rescue triggers`, 512, {
      critical: riskAssessments.filter((r) => r.failureProbability >= 0.75).map((r) => r.taskTitle),
    })
  );

  // Calendar
  await delay(350);
  const calendarBlocks = buildCalendarBlocks(tasks);
  logs.push(log("calendar", `Generated ${calendarBlocks.length} optimized blocks, reorganized 2 conflicts`, 348));

  // Opportunity
  await delay(300);
  const opportunityImpacts = buildOpportunityImpacts(tasks);
  logs.push(log("opportunity", "Quantified opportunity cost across 4 commitment categories", 295));

  // Negotiation
  await delay(400);
  const negotiationOptions = buildNegotiationOptions();
  logs.push(
    log("negotiation", `Capacity gap: ${54 - AVAILABLE_HOURS}h — 3 trade-off scenarios generated`, 398, {
      gap: 26,
    })
  );

  // Rescue
  await delay(450);
  const rescuePlans = riskAssessments
    .filter((r) => r.rescueRecommended)
    .map((r) => {
      const task = tasks.find((t) => t.id === r.taskId)!;
      return buildRescuePlan(task, r.failureProbability);
    });
  logs.push(log("accountability", `${rescuePlans.length} rescue plans activated, escalation level 2`, 445));

  // Reflection
  await delay(200);
  logs.push(log("reflection", "Updated prediction model — overcommitment pattern reinforced", 198));

  const commitmentScore: CommitmentScore = {
    overall: 64,
    completionRate: 58,
    planningQuality: 72,
    executionConsistency: 51,
    recoveryAbility: 68,
    focus: FOCUS_SCORE,
    reliability: 61,
    trend: "declining",
    history: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
      score: 78 - i * 1.2 + Math.sin(i) * 3,
    })),
  };

  const highestRisk = [...riskAssessments].sort((a, b) => b.failureProbability - a.failureProbability)[0];

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    agentLogs: logs,
    riskAssessments,
    rescuePlans,
    calendarBlocks,
    energyProfile,
    opportunityImpacts,
    negotiationOptions,
    futureSelf: buildFutureSelf(),
    commitmentScore,
    behaviorPatterns: patterns,
    executiveSummary: `Critical execution failure predicted. You have ${AVAILABLE_HOURS} available hours against ${totalHours} required — a ${54 - AVAILABLE_HOURS}-hour deficit. Highest risk: "${highestRisk.taskTitle}" at ${Math.round(highestRisk.failureProbability * 100)}%. I've activated rescue mode, reorganized your calendar, and prepared 3 negotiation scenarios. Acting within the next 4 hours increases success probability by 34%.`,
    voiceCoachMessage: `I've analyzed your commitments. You're facing an execution crisis — but it's recoverable. Your Google interview has the highest opportunity cost at 6 months career delay. I recommend the "Protect Career Path" scenario. Shall we begin tonight's rescue session?`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
