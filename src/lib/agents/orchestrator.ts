import type {
  AgentLogEntry,
  BehaviorPattern,
  CalendarBlock,
  CommitmentScore,
  CommitmentScoreDimension,
  EnergyProfile,
  FutureScenario,
  FutureSelfProjection,
  NegotiationOption,
  OpportunityImpact,
  OrchestrationResult,
  RescueAction,
  RescuePlan,
  RiskAssessment,
  RiskFactor,
  Task,
} from "@/types";
import { daysUntil, generateId, hoursUntil } from "@/lib/utils";

const RESCUE_THRESHOLD = 0.65;
const DAY_MS = 86_400_000;

type ExecutionSnapshot = {
  now: Date;
  tasks: Task[];
  totalRemainingHours: number;
  totalCompletedHours: number;
  activeTaskCount: number;
  overdueTasks: number;
  soonTasks: number;
  daysToLastDeadline: number;
  earliestCreatedAt: Date | null;
  latestDeadline: Date | null;
  trackedDays: number;
  observedVelocity: number | null;
  requiredDailyHours: number;
  overloadRatio: number;
  averageProgress: number;
  averageComplexity: number;
  historyConfidence: number;
  hasExecutionHistory: boolean;
  hasCalendarData: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatHours(value: number) {
  const normalized = round(Math.max(0, value), 1);
  return Number.isInteger(normalized) ? `${normalized}h` : `${normalized.toFixed(1)}h`;
}

function formatDays(value: number) {
  if (value <= 1) return "1 day";
  return `${Math.round(value)} days`;
}

function buildConfidence(value: number, reasoning: string): RiskAssessment["confidence"] {
  return {
    value,
    label: value >= 0.75 ? "high" : value >= 0.55 ? "medium" : "low",
    reasoning,
  };
}

function priorityWeight(priority: Task["priority"]) {
  switch (priority) {
    case "critical":
      return 1;
    case "high":
      return 0.8;
    case "medium":
      return 0.55;
    case "low":
      return 0.3;
    default:
      return 0.5;
  }
}

function safeDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildSnapshot(tasks: Task[]): ExecutionSnapshot {
  const now = new Date();
  const totalRemainingHours = tasks.reduce((sum, task) => sum + Math.max(0, task.estimatedHours - task.completedHours), 0);
  const totalCompletedHours = tasks.reduce((sum, task) => sum + Math.max(0, task.completedHours), 0);
  const overdueTasks = tasks.filter((task) => hoursUntil(task.deadline) <= 0 && task.completedHours < task.estimatedHours).length;
  const soonTasks = tasks.filter((task) => hoursUntil(task.deadline) > 0 && daysUntil(task.deadline) <= 3).length;
  const createdDates = tasks.map((task) => safeDate(task.createdAt)).filter((date): date is Date => Boolean(date));
  const deadlineDates = tasks.map((task) => safeDate(task.deadline)).filter((date): date is Date => Boolean(date));
  const earliestCreatedAt = createdDates.length > 0 ? new Date(Math.min(...createdDates.map((date) => date.getTime()))) : null;
  const latestDeadline = deadlineDates.length > 0 ? new Date(Math.max(...deadlineDates.map((date) => date.getTime()))) : null;
  const trackedDays = earliestCreatedAt ? Math.max(1, Math.ceil((now.getTime() - earliestCreatedAt.getTime()) / DAY_MS)) : 1;
  const observedVelocity = totalCompletedHours > 0 ? totalCompletedHours / trackedDays : null;
  const daysToLastDeadline = latestDeadline ? Math.max(1, Math.ceil((latestDeadline.getTime() - now.getTime()) / DAY_MS)) : 1;
  const requiredDailyHours = totalRemainingHours > 0 ? totalRemainingHours / daysToLastDeadline : 0;
  const overloadRatio =
    observedVelocity && observedVelocity > 0 ? totalRemainingHours / Math.max(observedVelocity * daysToLastDeadline, 0.5) : totalRemainingHours > 0 ? 1 : 0;
  const averageProgress =
    tasks.length > 0
      ? tasks.reduce((sum, task) => sum + clamp(task.estimatedHours > 0 ? task.completedHours / task.estimatedHours : 0, 0, 1), 0) / tasks.length
      : 0;
  const averageComplexity = tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.complexity, 0) / tasks.length : 0;
  const historyConfidence = clamp(
    (Math.min(trackedDays, 14) / 14) * 0.55 + Math.min(totalCompletedHours, 12) / 12 * 0.45,
    0,
    1
  );

  return {
    now,
    tasks,
    totalRemainingHours,
    totalCompletedHours,
    activeTaskCount: tasks.length,
    overdueTasks,
    soonTasks,
    daysToLastDeadline,
    earliestCreatedAt,
    latestDeadline,
    trackedDays,
    observedVelocity,
    requiredDailyHours,
    overloadRatio,
    averageProgress,
    averageComplexity,
    historyConfidence,
    hasExecutionHistory: trackedDays >= 2 && totalCompletedHours > 0,
    hasCalendarData: false,
  };
}

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

function getTaskProgress(task: Task) {
  return clamp(task.estimatedHours > 0 ? task.completedHours / task.estimatedHours : 0, 0, 1);
}

function getExpectedProgress(task: Task, now: Date) {
  const createdAt = safeDate(task.createdAt);
  const deadline = safeDate(task.deadline);
  if (!createdAt || !deadline || deadline.getTime() <= createdAt.getTime()) {
    return 0;
  }

  const totalWindow = deadline.getTime() - createdAt.getTime();
  const elapsed = clamp(now.getTime() - createdAt.getTime(), 0, totalWindow);
  return clamp(elapsed / totalWindow, 0, 1);
}

function buildBehaviorPatterns(snapshot: ExecutionSnapshot): BehaviorPattern {
  const productivityTrend =
    snapshot.observedVelocity && snapshot.requiredDailyHours > 0
      ? round(((snapshot.observedVelocity - snapshot.requiredDailyHours) / snapshot.requiredDailyHours) * 100, 0)
      : 0;

  const focusScore = round(
    clamp(
      100 -
        (snapshot.activeTaskCount > 0 ? (snapshot.activeTaskCount - 1) * 8 : 0) -
        snapshot.soonTasks * 10 -
        snapshot.overdueTasks * 14,
      18,
      92
    ),
    0
  );

  const recurringDelays: string[] = [];
  if (snapshot.overdueTasks > 0) recurringDelays.push(`${snapshot.overdueTasks} commitment(s) are already overdue`);
  if (snapshot.soonTasks > 0) recurringDelays.push(`${snapshot.soonTasks} commitment(s) are due within 3 days`);
  if (snapshot.overloadRatio > 1.15) recurringDelays.push("Required pace is higher than observed execution pace");
  if (recurringDelays.length === 0) recurringDelays.push("No recurring delay pattern is established yet");

  const successPatterns: string[] = [];
  if (snapshot.averageProgress >= 0.5) successPatterns.push("Several commitments already have meaningful progress logged");
  if ((snapshot.observedVelocity ?? 0) >= snapshot.requiredDailyHours && snapshot.requiredDailyHours > 0) {
    successPatterns.push("Observed execution pace currently matches workload demand");
  }
  if (successPatterns.length === 0) successPatterns.push("More completed work sessions are needed before stable success patterns emerge");

  const failurePatterns: string[] = [];
  if (snapshot.activeTaskCount >= 5) failurePatterns.push("Concurrent commitments are fragmenting execution attention");
  if (snapshot.overdueTasks > 0) failurePatterns.push("Overdue commitments are compounding schedule pressure");
  if ((snapshot.observedVelocity ?? 0) === 0 && snapshot.totalRemainingHours > 0) {
    failurePatterns.push("No completed execution has been logged against the current workload yet");
  }
  if (failurePatterns.length === 0) failurePatterns.push("No dominant failure pattern is established yet");

  return {
    preferredWorkHours: null,
    productivityTrend,
    recurringDelays,
    executionVelocity: round(snapshot.observedVelocity ?? 0, 2),
    focusScore,
    procrastinationScore: round(clamp(snapshot.overloadRatio * 45 + snapshot.overdueTasks * 12, 8, 96), 0),
    successPatterns,
    failurePatterns,
  };
}

function buildRiskAssessment(task: Task, snapshot: ExecutionSnapshot): RiskAssessment {
  const remainingHours = Math.max(0, task.estimatedHours - task.completedHours);
  const daysRemaining = Math.max(0, daysUntil(task.deadline));
  const requiredDailyHours = remainingHours > 0 ? remainingHours / Math.max(daysRemaining, 1) : 0;
  const observedVelocity = snapshot.observedVelocity ?? 0;
  const progress = getTaskProgress(task);
  const expectedProgress = getExpectedProgress(task, snapshot.now);
  const progressLag = clamp(expectedProgress - progress, 0, 1);
  const taskShare = snapshot.totalRemainingHours > 0 ? remainingHours / snapshot.totalRemainingHours : 0;
  const dependencyCount = task.dependencies?.length ?? 0;

  const factors: RiskFactor[] = [];
  let probability = 0.04;

  const pacePressure =
    snapshot.observedVelocity && snapshot.observedVelocity > 0
      ? clamp((requiredDailyHours - snapshot.observedVelocity) / snapshot.observedVelocity, 0, 2)
      : requiredDailyHours > 0
        ? 1
        : 0;
  const paceImpact = round(Math.min(30, pacePressure * 18), 0);
  if (paceImpact > 0) {
    probability += paceImpact / 100;
    factors.push({
      name: "Execution velocity",
      impact: paceImpact,
      description:
        observedVelocity > 0
          ? `${formatHours(requiredDailyHours)} per day is required while observed execution pace is ${formatHours(observedVelocity)} per day`
          : "No completed work has been logged yet, so Hourglass cannot verify a sustainable execution pace",
    });
  }

  const deadlineImpact = round(clamp((4 - Math.min(daysRemaining, 4)) * 5, 0, 20), 0);
  if (deadlineImpact > 0) {
    probability += deadlineImpact / 100;
    factors.push({
      name: "Deadline proximity",
      impact: deadlineImpact,
      description:
        daysRemaining > 0
          ? `${formatHours(remainingHours)} still remains with ${formatDays(daysRemaining)} until the deadline`
          : "The deadline has already passed while work remains incomplete",
    });
  }

  const progressImpact = round(progressLag * 20, 0);
  if (progressImpact > 0) {
    probability += progressImpact / 100;
    factors.push({
      name: "Progress lag",
      impact: progressImpact,
      description: `${Math.round(progress * 100)}% progress logged versus ${Math.round(expectedProgress * 100)}% expected by this point in the task window`,
    });
  }

  const complexityImpact = round((task.complexity / 10) * 10, 0);
  probability += complexityImpact / 100;
  factors.push({
    name: "Task complexity",
    impact: complexityImpact,
    description: `Complexity ${task.complexity}/10 increases the time needed to finish ${task.title}`,
  });

  const portfolioImpact = round(clamp(taskShare * snapshot.overloadRatio * 16, 0, 16), 0);
  if (portfolioImpact > 0) {
    probability += portfolioImpact / 100;
    factors.push({
      name: "Portfolio pressure",
      impact: portfolioImpact,
      description: `${task.title} accounts for ${Math.round(taskShare * 100)}% of remaining workload across active commitments`,
    });
  }

  const priorityImpact = round(priorityWeight(task.priority) * 8, 0);
  if (priorityImpact > 0) {
    probability += priorityImpact / 100;
    factors.push({
      name: "Priority sensitivity",
      impact: priorityImpact,
      description: `${task.priority} priority commitments are less tolerant of slippage`,
    });
  }

  if (dependencyCount > 0) {
    const dependencyImpact = Math.min(12, dependencyCount * 4);
    probability += dependencyImpact / 100;
    factors.push({
      name: "Dependency chain",
      impact: dependencyImpact,
      description: `${dependencyCount} dependency link(s) can block completion if upstream work slips`,
    });
  }

  const protectiveImpact = round(
    clamp(progress * 10 + Math.max(0, ((snapshot.observedVelocity ?? requiredDailyHours) - requiredDailyHours) * 6), 0, 18),
    0
  );
  if (protectiveImpact > 0) {
    probability -= protectiveImpact / 100;
    factors.push({
      name: "Protective factors",
      impact: -protectiveImpact,
      description: `${Math.round(progress * 100)}% of the task is already complete, which reduces execution risk`,
    });
  }

  probability = clamp(probability, 0.03, 0.98);

  const confidenceValue = clamp(
    0.38 + snapshot.historyConfidence * 0.35 + (snapshot.activeTaskCount > 0 ? 0.1 : 0) + (dependencyCount > 0 ? 0.03 : 0),
    0.38,
    0.92
  );
  const confidenceReasoning = snapshot.hasExecutionHistory
    ? `Confidence is ${confidenceValue >= 0.75 ? "high" : confidenceValue >= 0.55 ? "moderate" : "limited"} because Hourglass has ${snapshot.trackedDays} tracked day(s) and ${formatHours(snapshot.totalCompletedHours)} of logged completed work to compare against remaining workload.`
    : "Confidence is limited because Hourglass does not yet have enough historical execution data to validate whether the current pace is stable.";

  const primaryRisk = factors.find((factor) => factor.impact > 0);
  const reasoning =
    confidenceValue < 0.55
      ? `${Math.round(probability * 100)}% modeled risk for "${task.title}". This estimate is based on workload, deadline, progress, and complexity signals, but confidence is limited because Hourglass has little historical execution data yet.`
      : `${Math.round(probability * 100)}% modeled risk for "${task.title}" because ${primaryRisk?.description.toLowerCase() ?? "the current workload is compressed"}.
Observed execution pace is ${observedVelocity > 0 ? `${formatHours(observedVelocity)} per day` : "not established yet"}, and ${formatHours(remainingHours)} remain before the deadline.`;

  return {
    taskId: task.id,
    taskTitle: task.title,
    failureProbability: probability,
    confidence: buildConfidence(confidenceValue, confidenceReasoning),
    dataStatus: "ready",
    factors,
    reasoning,
    rescueRecommended: probability >= RESCUE_THRESHOLD,
    assessedAt: snapshot.now.toISOString(),
  };
}

function buildEnergyProfile(snapshot: ExecutionSnapshot, patterns: BehaviorPattern): EnergyProfile {
  const insufficientDataReasons = snapshot.hasCalendarData
    ? []
    : ["Connect a calendar or working-hours source to unlock capacity and deep-work window calculations."];
  const reasoning =
    snapshot.hasCalendarData
      ? "Calendar-backed capacity analysis is available."
      : "Capacity analysis is unavailable because no calendar or working-hours feed is connected yet. Hourglass can model workload pressure, but it will not invent free-time estimates.";

  return {
    dataStatus: snapshot.hasCalendarData ? "ready" : "insufficient_data",
    totalFreeHours: 0,
    productiveHours: 0,
    energyScore: patterns.focusScore,
    peakWindows: [],
    reasoning,
    insufficientDataReasons,
  };
}

function buildCalendarBlocks(): CalendarBlock[] {
  return [];
}

function buildOpportunityImpacts(tasks: Task[], riskAssessments: RiskAssessment[]): OpportunityImpact[] {
  const riskByTaskId = new Map(riskAssessments.map((assessment) => [assessment.taskId, assessment]));
  return tasks.map((task) => {
    const remainingHours = Math.max(0, task.estimatedHours - task.completedHours);
    const daysRemaining = Math.max(0, daysUntil(task.deadline));
    const risk = riskByTaskId.get(task.id);
    const urgencyLabel = daysRemaining === 0 ? "overdue" : `due in ${formatDays(daysRemaining)}`;
    const importance = round(priorityWeight(task.priority) * 10, 0);

    return {
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      impactType: "Execution pressure",
      magnitude: `${formatHours(remainingHours)} outstanding`,
      emotionalWeight: Math.max(1, importance),
      description: risk
        ? `${task.title} is ${urgencyLabel} with ${formatHours(remainingHours)} still open and ${Math.round(risk.failureProbability * 100)}% modeled failure risk.`
        : `${task.title} is ${urgencyLabel} with ${formatHours(remainingHours)} still open.`,
    };
  });
}

function buildNegotiationOptions(tasks: Task[], riskAssessments: RiskAssessment[], snapshot: ExecutionSnapshot): NegotiationOption[] {
  const ranked = [...tasks].sort((a, b) => {
    const riskA = riskAssessments.find((assessment) => assessment.taskId === a.id)?.failureProbability ?? 0;
    const riskB = riskAssessments.find((assessment) => assessment.taskId === b.id)?.failureProbability ?? 0;
    return riskB - riskA;
  });

  const keepNow = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2)));
  const deferNow = ranked.slice(keepNow.length);
  const mostStable = [...ranked]
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))
    .slice(0, Math.max(1, Math.floor(ranked.length / 2)));
  const deadlineFirst = [...ranked].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const observedCapacityText =
    snapshot.observedVelocity && snapshot.latestDeadline
      ? `${formatHours(snapshot.observedVelocity * Math.max(1, Math.ceil((snapshot.latestDeadline.getTime() - snapshot.now.getTime()) / DAY_MS)))} of historical throughput before the last deadline`
      : "historical throughput is not established yet";

  const options: NegotiationOption[] = [
    {
      id: generateId(),
      scenario: "Protect highest-risk commitments",
      tradeoffs: {
        keep: keepNow.map((task) => task.title),
        defer: deferNow.map((task) => task.title),
        risk:
          deferNow.length > 0
            ? `Deferring ${deferNow.map((task) => task.title).join(", ")} leaves ${formatHours(
                deferNow.reduce((sum, task) => sum + Math.max(0, task.estimatedHours - task.completedHours), 0)
              )} of lower-ranked work outside the protected plan`
            : "No lower-ranked commitments are available to defer",
      },
      recommended: true,
      reasoning: `This option keeps the commitments carrying the most current risk while acknowledging that ${observedCapacityText}.`,
    },
    {
      id: generateId(),
      scenario: "Protect nearest deadlines",
      tradeoffs: {
        keep: deadlineFirst.slice(0, Math.max(1, Math.ceil(deadlineFirst.length / 2))).map((task) => task.title),
        defer: deadlineFirst.slice(Math.max(1, Math.ceil(deadlineFirst.length / 2))).map((task) => task.title),
        risk: "Lower-urgency commitments may accumulate more backlog later if they are deferred now",
      },
      recommended: false,
      reasoning: "This option minimizes near-term deadline misses but may leave larger projects under-served.",
    },
    {
      id: generateId(),
      scenario: "Reduce fragmentation",
      tradeoffs: {
        keep: ranked.filter((task) => !mostStable.some((stable) => stable.id === task.id)).map((task) => task.title),
        defer: mostStable.map((task) => task.title),
        risk: "Deferring stable work improves focus now but can increase later context-switching if not rescheduled deliberately",
      },
      recommended: false,
      reasoning: "This option reduces concurrent work-in-progress to improve execution focus on the remaining queue.",
    },
  ];

  return options;
}

function buildRescuePlan(task: Task, assessment: RiskAssessment, snapshot: ExecutionSnapshot): RescuePlan {
  const remainingHours = Math.max(0, task.estimatedHours - task.completedHours);
  const sessionCount = Math.max(1, Math.ceil(remainingHours / 1.5));
  const dailyHoursNeeded = Math.max(0.5, remainingHours / Math.max(1, daysUntil(task.deadline)));

  const actions: RescueAction[] = [
    {
      id: generateId(),
      type: "break_down",
      title: "Convert remaining work into protected focus sessions",
      description: `Split ${formatHours(remainingHours)} of remaining work into ${sessionCount} focused session(s).`,
      impact: `Makes the ${formatHours(remainingHours)} workload schedulable instead of abstract`,
      priority: 1,
    },
    {
      id: generateId(),
      type: "reallocate",
      title: "Protect the daily pace requirement",
      description: `Reserve at least ${formatHours(dailyHoursNeeded)} per day for ${task.title} until the deadline.`,
      impact: "Aligns required pace with visible daily execution targets",
      priority: 2,
    },
    {
      id: generateId(),
      type: "postpone",
      title: "Defer lower-ranked commitments if needed",
      description: "Shift lower-priority or lower-risk work out of the active queue before cutting protected work on this task.",
      impact: "Reduces fragmentation pressure on the critical path",
      priority: 3,
    },
  ];

  return {
    id: generateId(),
    taskId: task.id,
    triggeredAt: snapshot.now.toISOString(),
    failureProbability: assessment.failureProbability,
    actions,
    roadmap: [
      { step: 1, title: `Protect the first ${formatHours(Math.min(remainingHours, 1.5))} session for ${task.title}`, duration: "90 min", completed: false },
      { step: 2, title: `Clear enough workload to preserve ${formatHours(dailyHoursNeeded)} per day`, duration: "20 min", completed: false },
      { step: 3, title: "Review progress again after the next logged work block", duration: "5 min", completed: false },
    ],
    voiceMessage: `${task.title} is currently at ${Math.round(assessment.failureProbability * 100)}% modeled failure risk. Start by protecting the next focused session and reducing competing work around the deadline.`,
  };
}

function buildScenarioProjections(
  tasks: Task[],
  riskAssessments: RiskAssessment[],
  snapshot: ExecutionSnapshot,
  startingScore: number,
  effectiveDailyVelocity: number
): FutureSelfProjection[] {
  const riskByTaskId = new Map(riskAssessments.map((assessment) => [assessment.taskId, assessment.failureProbability]));
  const simulatedTasks = tasks.map((task) => ({
    ...task,
    remainingHours: Math.max(0, task.estimatedHours - task.completedHours),
  }));
  const projections: FutureSelfProjection[] = [];

  for (let day = 1; day <= 14; day += 1) {
    const date = new Date(snapshot.now.getTime() + day * DAY_MS);
    let remainingCapacity = effectiveDailyVelocity;

    const byUrgency = [...simulatedTasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    for (const task of byUrgency) {
      if (remainingCapacity <= 0) break;
      const allocation = Math.min(task.remainingHours, remainingCapacity);
      task.remainingHours -= allocation;
      remainingCapacity -= allocation;
    }

    const missedDeadlines = simulatedTasks.filter(
      (task) => task.remainingHours > 0 && new Date(task.deadline).getTime() <= date.getTime()
    ).length;
    const remainingHours = simulatedTasks.reduce((sum, task) => sum + task.remainingHours, 0);
    const daysLeft = snapshot.latestDeadline ? Math.max(1, Math.ceil((snapshot.latestDeadline.getTime() - date.getTime()) / DAY_MS)) : 1;
    const requiredDailyHours = remainingHours / daysLeft;
    const pressure = effectiveDailyVelocity > 0 ? requiredDailyHours / effectiveDailyVelocity : remainingHours > 0 ? 2 : 0;
    const stressLevel = round(clamp(28 + pressure * 24 + missedDeadlines * 14 + snapshot.activeTaskCount * 4, 18, 96), 0);
    const score = clamp(
      startingScore - missedDeadlines * 10 - Math.max(0, pressure - 1) * 18 - Math.max(0, day - 1) * 0.4,
      10,
      100
    );

    const highestOpenRisk = [...simulatedTasks]
      .filter((task) => task.remainingHours > 0)
      .sort((a, b) => (riskByTaskId.get(b.id) ?? 0) - (riskByTaskId.get(a.id) ?? 0))[0];

    projections.push({
      date: date.toISOString(),
      commitmentScore: round(score, 0),
      missedDeadlines,
      stressLevel,
      opportunityLoss:
        missedDeadlines > 0
          ? `${missedDeadlines} commitment(s) projected to slip`
          : `${formatHours(remainingHours)} still open`,
      careerImpact:
        highestOpenRisk?.category === "career" || highestOpenRisk?.category === "interview"
          ? `Career-sensitive work still open: ${highestOpenRisk.title}`
          : "No career-specific loss isolated from current data",
      academicImpact:
        highestOpenRisk?.category === "exam" || highestOpenRisk?.category === "assignment"
          ? `Academic-sensitive work still open: ${highestOpenRisk.title}`
          : "No academic-specific loss isolated from current data",
      narrative:
        effectiveDailyVelocity <= 0 && remainingHours > 0
          ? "No execution velocity is currently logged, so unfinished work carries forward unchanged."
          : missedDeadlines > 0
            ? "Current throughput is not clearing the workload before one or more deadlines land."
            : pressure > 1
              ? "The plan remains technically possible, but the required pace is rising each day."
              : "Current throughput is still covering the modeled workload.",
    });
  }

  return projections;
}

function buildFutureScenarios(
  tasks: Task[],
  riskAssessments: RiskAssessment[],
  snapshot: ExecutionSnapshot,
  commitmentScore: CommitmentScore
): FutureScenario[] {
  if (!snapshot.hasExecutionHistory || !snapshot.observedVelocity || snapshot.observedVelocity <= 0) {
    return [
      {
        id: generateId(),
        label: "Current Trajectory",
        mode: "current",
        dataStatus: "insufficient_data",
        summary: "Future simulation is unavailable because Hourglass needs more logged completed work to measure execution velocity.",
        adjustments: ["Log at least two tracked days of completed work before requesting a trajectory forecast."],
        projections: [],
      },
    ];
  }

  const fragmentationPenalty = snapshot.activeTaskCount > 1 ? Math.min(0.2, (snapshot.activeTaskCount - 1) * 0.03) : 0;
  const baseVelocity = Math.max(0, snapshot.observedVelocity * (1 - fragmentationPenalty));
  const rescueVelocity = baseVelocity * 1.18;
  const optimizedVelocity = baseVelocity * 1.32;

  return [
    {
      id: generateId(),
      label: "Current Trajectory",
      mode: "current",
      dataStatus: "ready",
      summary: "Projects the next 14 days using current observed execution velocity and the existing workload queue.",
      adjustments: ["No intervention applied."],
      projections: buildScenarioProjections(tasks, riskAssessments, snapshot, commitmentScore.overall, baseVelocity),
    },
    {
      id: generateId(),
      label: "Rescue Activated",
      mode: "rescue",
      dataStatus: "ready",
      summary: "Assumes the rescue plan reduces fragmentation and protects the next execution block.",
      adjustments: ["Execution velocity increased by 18% from the current observed baseline.", "Competing work is reduced by prioritizing the highest-risk queue first."],
      projections: buildScenarioProjections(tasks, riskAssessments, snapshot, Math.min(100, commitmentScore.overall + 6), rescueVelocity),
    },
    {
      id: generateId(),
      label: "Optimized Execution",
      mode: "optimized",
      dataStatus: "ready",
      summary: "Assumes the user protects focus, preserves urgency order, and executes above the current observed baseline.",
      adjustments: ["Execution velocity increased by 32% from the current observed baseline.", "Focus fragmentation is treated as actively managed."],
      projections: buildScenarioProjections(tasks, riskAssessments, snapshot, Math.min(100, commitmentScore.overall + 10), optimizedVelocity),
    },
  ];
}

function buildCommitmentScore(snapshot: ExecutionSnapshot, patterns: BehaviorPattern): CommitmentScore {
  const completionRate = round(snapshot.averageProgress * 100, 0);
  const planningQuality = round(
    clamp(
      88 -
        snapshot.overdueTasks * 10 -
        snapshot.soonTasks * 4 -
        Math.max(0, snapshot.averageComplexity - 6) * 3,
      28,
      95
    ),
    0
  );

  const executionConsistency = round(
    clamp(
      snapshot.tasks.length === 0
        ? 0
        : snapshot.tasks.reduce((sum, task) => {
            const actual = getTaskProgress(task);
            const expected = getExpectedProgress(task, snapshot.now);
            const adherence = expected === 0 ? (actual > 0 ? 1 : 0.65) : clamp(actual / expected, 0, 1);
            return sum + adherence * 100;
          }, 0) / snapshot.tasks.length,
      0,
      100
    ),
    0
  );

  const recoveryAbility = round(
    clamp(
      82 -
        snapshot.overloadRatio * 18 -
        snapshot.overdueTasks * 12 +
        (snapshot.observedVelocity ? 6 : -6),
      12,
      92
    ),
    0
  );

  const focus = round(patterns.focusScore, 0);
  const reliability = round(
    clamp(
      executionConsistency * 0.45 +
        completionRate * 0.2 +
        Math.max(0, 100 - snapshot.overdueTasks * 20 - snapshot.soonTasks * 6) * 0.35,
      0,
      100
    ),
    0
  );

  const dimensionSpecs: Array<Omit<CommitmentScoreDimension, "weightedContribution">> = [
    {
      key: "completionRate",
      label: "Completion Rate",
      value: completionRate,
      weight: 0.18,
      reasoning: "Based on completed hours divided by estimated hours across active commitments.",
    },
    {
      key: "planningQuality",
      label: "Planning Quality",
      value: planningQuality,
      weight: 0.14,
      reasoning: "Reduced by overdue work, compressed deadlines, and elevated complexity.",
    },
    {
      key: "executionConsistency",
      label: "Execution Consistency",
      value: executionConsistency,
      weight: 0.2,
      reasoning: "Measures how closely logged progress tracks expected progress through each commitment window.",
    },
    {
      key: "recoveryAbility",
      label: "Recovery Ability",
      value: recoveryAbility,
      weight: 0.14,
      reasoning: "Penalized by overload and overdue work, with a small lift when observed velocity exists.",
    },
    {
      key: "focus",
      label: "Focus",
      value: focus,
      weight: 0.16,
      reasoning: "Derived from fragmentation pressure, near-term deadlines, and overdue commitments.",
    },
    {
      key: "reliability",
      label: "Reliability",
      value: reliability,
      weight: 0.18,
      reasoning: "Blends consistency, completion progress, and deadline adherence into a stable delivery signal.",
    },
  ];

  const scoreBreakdown = dimensionSpecs.map((dimension) => ({
    ...dimension,
    weightedContribution: round(dimension.value * dimension.weight, 1),
  }));
  const overall = round(scoreBreakdown.reduce((sum, dimension) => sum + dimension.weightedContribution, 0), 0);

  const trendScore =
    snapshot.overdueTasks * 10 + Math.max(0, snapshot.overloadRatio - 1) * 20 - Math.min(snapshot.averageProgress * 40, 20);
  const trend = trendScore >= 20 ? "declining" : trendScore <= 4 ? "improving" : "stable";
  return {
    overall,
    completionRate,
    planningQuality,
    executionConsistency,
    recoveryAbility,
    focus,
    reliability,
    trend,
    dataStatus: "ready",
    historyUnavailableReason:
      "Historical commitment score is unavailable because Hourglass has not yet stored prior execution snapshots. The current score is still deterministic from live task data.",
    scoreBreakdown,
    history: [],
  };
}

function buildExecutiveSummary(
  snapshot: ExecutionSnapshot,
  riskAssessments: RiskAssessment[],
  rescuePlans: RescuePlan[],
  commitmentScore: CommitmentScore
) {
  if (snapshot.tasks.length === 0) {
    return {
      executiveSummary: "Hourglass does not have any active commitments to analyze yet. Add a commitment with a deadline and estimated work before requesting execution intelligence.",
      voiceCoachMessage: "Add your first commitment and I will compute risk, workload pressure, and the next recommended action from real data.",
    };
  }

  const highestRisk = [...riskAssessments].sort((a, b) => b.failureProbability - a.failureProbability)[0];
  const backlog = formatHours(snapshot.totalRemainingHours);
  const velocityText =
    snapshot.observedVelocity && snapshot.observedVelocity > 0
      ? `${formatHours(snapshot.observedVelocity)} per day observed across ${snapshot.trackedDays} tracked day(s)`
      : "no reliable execution velocity has been established yet";
  const rescueText =
    rescuePlans.length > 0 ? `${rescuePlans.length} commitment(s) are above the rescue threshold.` : "No commitment currently crosses the rescue threshold.";
  const capacityText =
    snapshot.hasCalendarData
      ? "Calendar-backed capacity data is connected."
      : "Calendar-backed capacity analysis is still locked because no availability source is connected.";

  return {
    executiveSummary: `${snapshot.tasks.length} active commitment(s) contain ${backlog} of remaining work. ${
      highestRisk
        ? `"${highestRisk.taskTitle}" carries the highest modeled failure risk at ${Math.round(highestRisk.failureProbability * 100)}%.`
        : "No risk ranking is available yet."
    } Hourglass is using workload, progress, deadline, and complexity signals only; ${velocityText}. ${capacityText} ${rescueText} Commitment score is ${Math.round(commitmentScore.overall)}/100.`,
    voiceCoachMessage: highestRisk
      ? `Top priority is ${highestRisk.taskTitle}. It has ${Math.round(highestRisk.failureProbability * 100)}% modeled risk, and the fastest way to improve that is to protect the next focused work block and reduce competing commitments around its deadline.`
      : "Once you add commitments with deadlines and estimated work, I can give you a precise execution brief.",
  };
}

/** Deterministic orchestration engine backed only by saved user task data. */
export async function runOrchestration(tasks: Task[] = []): Promise<OrchestrationResult> {
  const logs: AgentLogEntry[] = [];
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    completedHours: Math.max(0, task.completedHours),
    estimatedHours: Math.max(task.completedHours, task.estimatedHours),
  }));
  const snapshot = buildSnapshot(normalizedTasks);

  await delay(180);
  logs.push(
    log("planner", `Mapped ${snapshot.activeTaskCount} commitment(s) with ${formatHours(snapshot.totalRemainingHours)} remaining`, 184, {
      totalRemainingHours: snapshot.totalRemainingHours,
      overdueTasks: snapshot.overdueTasks,
    })
  );

  await delay(160);
  const behaviorPatterns = buildBehaviorPatterns(snapshot);
  logs.push(
    log("memory", `Built behavior model from ${snapshot.trackedDays} tracked day(s) and ${formatHours(snapshot.totalCompletedHours)} completed work`, 167, {
      historyConfidence: snapshot.historyConfidence,
    })
  );
  logs.push(
    log(
      "focus",
      behaviorPatterns.executionVelocity > 0
        ? `Observed execution velocity ${formatHours(behaviorPatterns.executionVelocity)} per day; focus pressure ${Math.round(behaviorPatterns.focusScore)}/100`
        : `No historical execution velocity yet; focus pressure ${Math.round(behaviorPatterns.focusScore)}/100 is based on workload fragmentation only`,
      151
    )
  );

  await delay(150);
  const energyProfile = buildEnergyProfile(snapshot, behaviorPatterns);
  logs.push(log("energy", energyProfile.reasoning, 149));

  await delay(220);
  const riskAssessments = normalizedTasks.map((task) => buildRiskAssessment(task, snapshot));
  logs.push(
    log("risk", `Scored ${riskAssessments.length} commitment(s); ${riskAssessments.filter((assessment) => assessment.rescueRecommended).length} crossed rescue threshold`, 228, {
      highestRiskTask: [...riskAssessments].sort((a, b) => b.failureProbability - a.failureProbability)[0]?.taskTitle ?? null,
    })
  );

  await delay(120);
  const calendarBlocks = buildCalendarBlocks();
  logs.push(log("calendar", "No calendar-backed timeline was generated because availability data is not connected yet", 123));

  await delay(140);
  const opportunityImpacts = buildOpportunityImpacts(normalizedTasks, riskAssessments);
  logs.push(log("opportunity", `Quantified execution pressure for ${opportunityImpacts.length} commitment(s)`, 138));

  await delay(140);
  const negotiationOptions = buildNegotiationOptions(normalizedTasks, riskAssessments, snapshot);
  logs.push(log("negotiation", "Generated trade-off scenarios from current risk ranking and workload share", 143));

  await delay(170);
  const rescuePlans = riskAssessments
    .filter((assessment) => assessment.rescueRecommended)
    .map((assessment) => {
      const task = normalizedTasks.find((candidate) => candidate.id === assessment.taskId);
      return task ? buildRescuePlan(task, assessment, snapshot) : null;
    })
    .filter((plan): plan is RescuePlan => Boolean(plan));
  logs.push(log("accountability", `${rescuePlans.length} rescue plan(s) prepared from current workload constraints`, 176));

  await delay(90);
  logs.push(log("reflection", "Stored deterministic execution snapshot for future comparisons", 96));

  const commitmentScore = buildCommitmentScore(snapshot, behaviorPatterns);
  const futureScenarios = buildFutureScenarios(normalizedTasks, riskAssessments, snapshot, commitmentScore);
  const futureSelf = futureScenarios[0]?.projections ?? [];
  const summary = buildExecutiveSummary(snapshot, riskAssessments, rescuePlans, commitmentScore);

  return {
    id: generateId(),
    timestamp: snapshot.now.toISOString(),
    agentLogs: logs,
    riskAssessments,
    rescuePlans,
    calendarBlocks,
    energyProfile,
    opportunityImpacts,
    negotiationOptions,
    futureSelf,
    futureScenarios,
    commitmentScore,
    behaviorPatterns,
    executiveSummary: summary.executiveSummary,
    voiceCoachMessage: summary.voiceCoachMessage,
  };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
