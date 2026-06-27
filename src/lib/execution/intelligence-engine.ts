/**
 * Execution Intelligence Engine
 *
 * Central analytics compute. Every dashboard page consumes the same computed object.
 * Never computes analytics independently.
 */

import type { Task } from "@/types";
import type { ExecutionProfile } from "@/types/execution-profile";

export interface WeeklyCapacity {
  totalAvailableHours: number;
  productiveHours: number;
  breakHours: number;
  workingDaysCount: number;
  dailyBreakdown: Array<{
    day: string;
    date: string;
    totalHours: number;
    productiveHours: number;
  }>;
}

export interface WorkloadMetrics {
  totalRequiredHours: number;
  totalCompletedHours: number;
  remainingHours: number;
  availableCapacity: number;
  utilization: number; // 0-100%
  overallocated: boolean;
  overallocationAmount: number;
}

export interface DeepWorkSlot {
  day: string;
  date: string;
  start: string;
  end: string;
  durationHours: number;
}

export interface ConfidenceScore {
  value: number; // 0-100
  label: "low" | "medium" | "high";
  reasoning: string[];
}

export interface CapacityAnalysis {
  weeklyCapacity: WeeklyCapacity;
  workload: WorkloadMetrics;
  deepWorkSlots: DeepWorkSlot[];
  recoveryThreshold: number;
  riskOfBurnout: "low" | "moderate" | "high";
  confidence: ConfidenceScore;
  recommendations: string[];
}

export interface ExecutionTimeline {
  tasksByWeek: Array<{
    weekStart: string;
    weekEnd: string;
    tasks: Array<{
      taskId: string;
      title: string;
      estimatedHours: number;
      scheduledHours: number;
      deadline: string;
      onTrack: boolean;
    }>;
    totalHoursScheduled: number;
    totalCapacity: number;
  }>;
  completionDate: string | null;
  totalWeeksRequired: number;
  confidence: ConfidenceScore;
}

export interface RescueAnalysis {
  atRiskTasks: Array<{
    taskId: string;
    title: string;
    failureProbability: number;
    daysUntilDeadline: number;
    requiredHours: number;
    availableBeforeDeadline: number;
    gap: number;
    recommendedAction: string;
  }>;
  confidence: ConfidenceScore;
  overallRiskLevel: "low" | "moderate" | "high" | "critical";
}

export interface IntelligenceReport {
  capacity: CapacityAnalysis;
  timeline: ExecutionTimeline;
  rescue: RescueAnalysis;
  computedAt: string;
}

/** Calculate daily productive hours from profile */
function getDailyProductiveHours(profile: ExecutionProfile): number {
  const workStart = parseTimeToMinutes(profile.workStartTime);
  const workEnd = parseTimeToMinutes(profile.workEndTime);
  const workHours = Math.max(0, (workEnd - workStart) / 60);

  // Break duration in hours
  let breakHours = 1; // default
  switch (profile.breakDuration) {
    case "15min": breakHours = 0.25; break;
    case "30min": breakHours = 0.5; break;
    case "45min": breakHours = 0.75; break;
    case "1hour": breakHours = 1; break;
    case "custom": breakHours = (profile.customBreakMinutes ?? 60) / 60; break;
  }

  // Productive hours is explicitly set by user, but cap it at work hours minus break
  const maxProductive = Math.max(0, workHours - breakHours);
  return Math.min(profile.productiveHours, maxProductive);
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToHour(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

function getDayName(index: number): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[index];
}

function getNextDateForDay(dayName: string): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetIndex = days.indexOf(dayName);
  const today = new Date();
  const currentDay = today.getDay();
  let diff = targetIndex - currentDay;
  if (diff < 0) diff += 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toISOString().split("T")[0];
}

/** Compute weekly capacity from execution profile */
export function computeWeeklyCapacity(profile: ExecutionProfile): WeeklyCapacity {
  const dailyProductive = getDailyProductiveHours(profile);
  const workStart = parseTimeToMinutes(profile.workStartTime);
  const workEnd = parseTimeToMinutes(profile.workEndTime);
  const dailyTotal = Math.max(0, (workEnd - workStart) / 60);

  const workingDays = profile.workingDays.filter(Boolean) as string[];
  const daysCount = workingDays.length;

  if (daysCount === 0) {
    return {
      totalAvailableHours: 0,
      productiveHours: 0,
      breakHours: 0,
      workingDaysCount: 0,
      dailyBreakdown: [],
    };
  }

  const dailyBreakdown = workingDays.map((day) => {
    const date = getNextDateForDay(day);
    return {
      day,
      date,
      totalHours: dailyTotal,
      productiveHours: dailyProductive,
    };
  });

  return {
    totalAvailableHours: Math.round(dailyTotal * daysCount * 10) / 10,
    productiveHours: Math.round(dailyProductive * daysCount * 10) / 10,
    breakHours: Math.round((dailyTotal - dailyProductive) * daysCount * 10) / 10,
    workingDaysCount: daysCount,
    dailyBreakdown,
  };
}

/** Compute workload metrics */
export function computeWorkload(
  tasks: Task[],
  weeklyCapacity: WeeklyCapacity
): WorkloadMetrics {
  const totalRequiredHours = tasks.reduce((sum, t) => sum + Math.max(0, t.estimatedHours - t.completedHours), 0);
  const totalCompletedHours = tasks.reduce((sum, t) => sum + t.completedHours, 0);
  const remainingHours = Math.max(0, totalRequiredHours);
  const availableCapacity = weeklyCapacity.productiveHours;
  const utilization = availableCapacity > 0
    ? Math.min(100, Math.round((remainingHours / availableCapacity) * 100))
    : 0;

  return {
    totalRequiredHours,
    totalCompletedHours,
    remainingHours,
    availableCapacity,
    utilization,
    overallocated: utilization > 100,
    overallocationAmount: utilization > 100 ? remainingHours - availableCapacity : 0,
  };
}

/** Compute deep work slots from profile */
export function computeDeepWorkSlots(profile: ExecutionProfile): DeepWorkSlot[] {
  const workingDays = profile.workingDays.filter(Boolean) as string[];

  let dwStart: string;
  let dwEnd: string;

  switch (profile.deepWorkWindow) {
    case "morning":
      dwStart = "06:00";
      dwEnd = "10:00";
      break;
    case "afternoon":
      dwStart = "13:00";
      dwEnd = "16:00";
      break;
    case "evening":
      dwStart = "17:00";
      dwEnd = "20:00";
      break;
    case "night":
      dwStart = "21:00";
      dwEnd = "23:00";
      break;
    case "custom":
      dwStart = profile.customDeepWorkStart ?? "09:00";
      dwEnd = profile.customDeepWorkEnd ?? "12:00";
      break;
    default:
      dwStart = "09:00";
      dwEnd = "12:00";
  }

  const dwStartMin = parseTimeToMinutes(dwStart);
  const dwEndMin = parseTimeToMinutes(dwEnd) || (parseTimeToMinutes(dwStart) + 180);
  const durationHours = Math.max(1, formatMinutesToHour(dwEndMin - dwStartMin));

  return workingDays.map((day) => ({
    day,
    date: getNextDateForDay(day),
    start: dwStart,
    end: dwEnd,
    durationHours,
  }));
}

/** Compute confidence score based on data completeness */
export function computeConfidence(
  profile: ExecutionProfile,
  tasks: Task[],
  hasCalendar: boolean,
  taskHistoryDays: number
): ConfidenceScore {
  const reasons: string[] = [];
  let score = 0;

  // Execution Profile completeness (up to 40 points)
  if (profile.profileComplete) {
    score += 40;
    reasons.push("Execution Profile complete");
  } else if (profile.workingDays.length > 0) {
    score += 20;
    reasons.push("Execution Profile partially complete");
  } else {
    reasons.push("Execution Profile incomplete");
  }

  // Task data (up to 30 points)
  if (tasks.length >= 10) {
    score += 30;
    reasons.push(`${tasks.length} commitments loaded`);
  } else if (tasks.length >= 5) {
    score += 20;
    reasons.push(`${tasks.length} commitments loaded`);
  } else if (tasks.length > 0) {
    score += 10;
    reasons.push(`${tasks.length} commitments loaded`);
  } else {
    reasons.push("No commitments yet");
  }

  // Calendar integration (up to 15 points)
  if (hasCalendar) {
    score += 15;
    reasons.push("Calendar connected");
  } else {
    reasons.push("Calendar not connected");
  }

  // Historical data (up to 15 points)
  if (taskHistoryDays >= 30) {
    score += 15;
    reasons.push(`${taskHistoryDays} days of historical data`);
  } else if (taskHistoryDays >= 14) {
    score += 10;
    reasons.push(`${taskHistoryDays} days of historical data`);
  } else if (taskHistoryDays >= 7) {
    score += 5;
    reasons.push(`${taskHistoryDays} days of historical data`);
  } else if (taskHistoryDays > 0) {
    reasons.push(`${taskHistoryDays} days of historical data`);
  } else {
    reasons.push("No historical data yet");
  }

  score = Math.min(100, Math.max(0, score));

  let label: "low" | "medium" | "high";
  if (score >= 70) label = "high";
  else if (score >= 40) label = "medium";
  else label = "low";

  return { value: score, label, reasoning: reasons };
}

/** Compute capacity analysis */
export function computeCapacityAnalysis(
  profile: ExecutionProfile,
  tasks: Task[],
  hasCalendar: boolean,
  taskHistoryDays: number
): CapacityAnalysis {
  const weeklyCapacity = computeWeeklyCapacity(profile);
  const workload = computeWorkload(tasks, weeklyCapacity);
  const deepWorkSlots = computeDeepWorkSlots(profile);
  const confidence = computeConfidence(profile, tasks, hasCalendar, taskHistoryDays);

  const recoveryThreshold = profile.recoveryHours;

  // Burnout risk assessment
  let riskOfBurnout: "low" | "moderate" | "high" = "low";
  if (workload.utilization > 100) {
    riskOfBurnout = "high";
  } else if (workload.utilization > 80) {
    riskOfBurnout = "moderate";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (workload.overallocated) {
    recommendations.push(
      `You are overallocated by ${Math.round(workload.overallocationAmount)} hours. Consider reducing scope or pushing deadlines.`
    );
  }
  if (profile.productiveHours < 4) {
    recommendations.push("Your productive capacity is low. Try time-blocking to protect focus.");
  }
  if (profile.interruptionLevel === "frequently" || profile.interruptionLevel === "constantly") {
    recommendations.push("High interruption levels detected. Consider blocking deep work windows with 'Do Not Disturb'.");
  }
  if (riskOfBurnout === "high") {
    recommendations.push(`High burnout risk. Ensure ${recoveryThreshold}h recovery between intense work sessions.`);
  }
  if (recommendations.length === 0) {
    recommendations.push("Your workload looks manageable. Stay consistent with your schedule.");
  }

  return {
    weeklyCapacity,
    workload,
    deepWorkSlots,
    recoveryThreshold,
    riskOfBurnout,
    confidence,
    recommendations,
  };
}

/** Compute execution timeline */
export function computeExecutionTimeline(
  tasks: Task[],
  weeklyCapacity: WeeklyCapacity,
  profile: ExecutionProfile,
  hasCalendar: boolean,
  taskHistoryDays: number
): ExecutionTimeline {
  const confidence = computeConfidence(profile, tasks, hasCalendar, taskHistoryDays);
  const weeklyProductive = weeklyCapacity.productiveHours;

  // Sort tasks by deadline
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  const tasksByWeek: ExecutionTimeline["tasksByWeek"] = [];
  let currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start from Sunday
  currentWeekStart.setHours(0, 0, 0, 0);

  let remainingToSchedule = sortedTasks
    .filter((t) => t.estimatedHours > t.completedHours)
    .map((t) => ({
      ...t,
      remainingHours: t.estimatedHours - t.completedHours,
    }));

  let weeksRequired = 0;
  const maxWeeks = 52; // Cap at 1 year

  while (remainingToSchedule.length > 0 && weeksRequired < maxWeeks) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekTasks: ExecutionTimeline["tasksByWeek"][0]["tasks"] = [];
    let weekCapacityUsed = 0;

    for (const task of remainingToSchedule) {
      if (weekCapacityUsed >= weeklyProductive) break;

      const canAllocate = Math.min(task.remainingHours, weeklyProductive - weekCapacityUsed);
      if (canAllocate <= 0) continue;

      weekTasks.push({
        taskId: task.id,
        title: task.title,
        estimatedHours: task.remainingHours,
        scheduledHours: Math.round(canAllocate * 10) / 10,
        deadline: task.deadline,
        onTrack: new Date(task.deadline).getTime() >= weekEnd.getTime(),
      });

      weekCapacityUsed += canAllocate;
      task.remainingHours -= canAllocate;
    }

    if (weekTasks.length > 0) {
      tasksByWeek.push({
        weekStart: currentWeekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        tasks: weekTasks,
        totalHoursScheduled: Math.round(weekCapacityUsed * 10) / 10,
        totalCapacity: weeklyProductive,
      });
    }

    // Move to next week
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weeksRequired++;
    remainingToSchedule = remainingToSchedule.filter((t) => t.remainingHours > 0.5); // > 30 min remaining
  }

  // Determine completion date
  const lastWeek = tasksByWeek[tasksByWeek.length - 1];
  const completionDate = lastWeek ? lastWeek.weekEnd : null;

  return {
    tasksByWeek,
    completionDate,
    totalWeeksRequired: tasksByWeek.length,
    confidence,
  };
}

/** Compute rescue analysis */
export function computeRescueAnalysis(
  tasks: Task[],
  weeklyCapacity: WeeklyCapacity,
  profile: ExecutionProfile,
  hasCalendar: boolean,
  taskHistoryDays: number
): RescueAnalysis {
  const confidence = computeConfidence(profile, tasks, hasCalendar, taskHistoryDays);

  const dailyProductive = weeklyCapacity.workingDaysCount > 0
    ? weeklyCapacity.productiveHours / weeklyCapacity.workingDaysCount
    : 0;

  const atRiskTasks = tasks
    .filter((t) => t.estimatedHours > t.completedHours)
    .map((task) => {
      const remainingHours = task.estimatedHours - task.completedHours;
      const msUntilDeadline = new Date(task.deadline).getTime() - Date.now();
      const daysUntilDeadline = Math.max(0, Math.ceil(msUntilDeadline / 86_400_000));
      const availableBeforeDeadline = daysUntilDeadline * dailyProductive;
      const gap = Math.max(0, remainingHours - availableBeforeDeadline);
      const failureProbability = availableBeforeDeadline > 0
        ? Math.min(1, gap / remainingHours)
        : 1;

      let recommendedAction: string;
      if (gap <= 0) {
        recommendedAction = "On track. Continue current pace.";
      } else if (gap < remainingHours * 0.3) {
        recommendedAction = "Slight risk. Consider adding focus hours.";
      } else if (gap < remainingHours * 0.5) {
        recommendedAction = "Moderate risk. Break task into smaller pieces and re-estimate.";
      } else if (gap < remainingHours * 0.75) {
        recommendedAction = "High risk. Negotiate deadline extension or reduce scope.";
      } else {
        recommendedAction = "Critical. Escalate immediately. Consider dropping or radically rescheduling.";
      }

      return {
        taskId: task.id,
        title: task.title,
        failureProbability: Math.round(failureProbability * 100),
        daysUntilDeadline,
        requiredHours: remainingHours,
        availableBeforeDeadline,
        gap: Math.round(gap * 10) / 10,
        recommendedAction,
      };
    })
    .sort((a, b) => b.failureProbability - a.failureProbability);

  // Overall risk level
  const maxRisk = atRiskTasks.length > 0 ? atRiskTasks[0].failureProbability : 0;
  let overallRiskLevel: "low" | "moderate" | "high" | "critical";
  if (maxRisk >= 75) overallRiskLevel = "critical";
  else if (maxRisk >= 50) overallRiskLevel = "high";
  else if (maxRisk >= 25) overallRiskLevel = "moderate";
  else overallRiskLevel = "low";

  return {
    atRiskTasks,
    confidence,
    overallRiskLevel,
  };
}

/** Main intelligence engine: compute everything from profile + tasks */
export function computeIntelligenceReport(
  profile: ExecutionProfile,
  tasks: Task[],
  hasCalendar: boolean = false,
  taskHistoryDays: number = 0
): IntelligenceReport {
  const capacity = computeCapacityAnalysis(profile, tasks, hasCalendar, taskHistoryDays);
  const timeline = computeExecutionTimeline(tasks, capacity.weeklyCapacity, profile, hasCalendar, taskHistoryDays);
  const rescue = computeRescueAnalysis(tasks, capacity.weeklyCapacity, profile, hasCalendar, taskHistoryDays);

  return {
    capacity,
    timeline,
    rescue,
    computedAt: new Date().toISOString(),
  };
}