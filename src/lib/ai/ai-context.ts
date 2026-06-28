import type {
  UserProfile,
  OrchestrationResult,
  Task,
  ChatMessage,
} from "@/types";
import type { ExecutionProfile } from "@/types/execution-profile";

export interface AIContext {
  // User Context
  userProfile: UserProfile | null;
  executionProfile: ExecutionProfile | null;
  
  // Temporal Context
  currentDate: string;
  currentTime: string;
  timezone: string;
  
  // Execution State
  currentCapacity: number;
  riskScore: number;
  remainingCapacity: number;
  executionHealth: string;
  
  // Mission Control Metrics
  missionControlMetrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageProgress: number;
  };
  
  // Planning Context
  plannerOutput: {
    suggestions: Array<Record<string, unknown>>;
    executionStrategy: string;
    recommendedWorkSessions: number;
  } | null;
  
  // Progress Tracking
  recentProgress: Task[];
  completedTasks: Task[];
  blockedTasks: Task[];
  historicalCompletion: {
    averageCompletionRate: number;
    trend: "improving" | "stable" | "declining";
    velocity: number;
  };
  
  // Conversation Context
  conversationHistory: ChatMessage[];
  
  // UI Context
  currentScreen: string;
  userIntent: string | null;
}

export function buildAIContext(
  userProfile: UserProfile | null,
  executionProfile: ExecutionProfile | null,
  orchestration: OrchestrationResult | null,
  tasks: Task[],
  chatHistory: ChatMessage[],
  currentScreen: string,
  userIntent: string | null
): AIContext {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().split(" ")[0];
  const timezone = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const completedTasks = tasks.filter((t) => t.completedHours >= t.estimatedHours);
  const overdueTasks = tasks.filter(
    (t) => new Date(t.deadline) < now && t.completedHours < t.estimatedHours
  );
  const blockedTasks = tasks.filter((t) => t.dependencies && t.dependencies.length > 0);

  const totalRemainingHours = tasks.reduce(
    (sum, t) => sum + Math.max(0, t.estimatedHours - t.completedHours),
    0
  );

  const riskScore = orchestration
    ? orchestration.riskAssessments.reduce((max, r) => Math.max(max, r.failureProbability), 0)
    : 0;

  const executionHealth = orchestration?.commitmentScore
    ? `${Math.round(orchestration.commitmentScore.overall)}/100`
    : "Not calculated";

  const missionControlMetrics = {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    overdueTasks: overdueTasks.length,
    completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
    averageProgress:
      tasks.length > 0
        ? tasks.reduce((sum, t) => sum + (t.completedHours / t.estimatedHours), 0) / tasks.length
        : 0,
  };

  const plannerOutput = orchestration
    ? {
        suggestions: [],
        executionStrategy: orchestration.executiveSummary,
        recommendedWorkSessions: Math.ceil(totalRemainingHours / 1.5),
      }
    : null;

  const historicalCompletion = {
    averageCompletionRate: missionControlMetrics.completionRate,
    trend: orchestration?.commitmentScore.trend || "stable",
    velocity: orchestration?.behaviorPatterns.executionVelocity || 0,
  };

  return {
    userProfile,
    executionProfile,
    currentDate,
    currentTime,
    timezone,
    currentCapacity: totalRemainingHours,
    riskScore,
    remainingCapacity: totalRemainingHours,
    executionHealth,
    missionControlMetrics,
    plannerOutput,
    recentProgress: tasks.slice(0, 5),
    completedTasks,
    blockedTasks,
    historicalCompletion,
    conversationHistory: chatHistory.slice(-10), // Last 10 messages
    currentScreen,
    userIntent,
  };
}

export function formatAIContextForPrompt(context: AIContext): string {
  const sections: string[] = [];

  // Role
  sections.push(`# ROLE
You are Hourglass AI's Chief of Staff — a strategic execution advisor that helps users complete their commitments with precision and calm authority.`);

  // Current User State
  sections.push(`# CURRENT USER STATE
Name: ${context.userProfile?.displayName || "User"}
Email: ${context.userProfile?.email || "Not provided"}
Primary Goal: ${context.userProfile?.primaryGoal || "Not set"}
Onboarding Complete: ${context.userProfile?.onboardingComplete ? "Yes" : "No"}`);

  // Execution Profile
  if (context.executionProfile) {
    sections.push(`# EXECUTION PROFILE
Work Style: ${context.executionProfile.workStyle}
Working Days: ${context.executionProfile.workingDays.join(", ")}
Work Hours: ${context.executionProfile.workStartTime} - ${context.executionProfile.workEndTime}
Productive Hours/Day: ${context.executionProfile.productiveHours}
Deep Work Window: ${context.executionProfile.deepWorkWindow}
Chronotype: ${context.executionProfile.chronotype}
Commitment Style: ${context.executionProfile.commitmentStyle}
Stress Tolerance: ${context.executionProfile.stressTolerance}/3
Calendar Connected: ${context.executionProfile.calendarConnected ? "Yes" : "No"}`);
  }

  // Temporal Context
  sections.push(`# TEMPORAL CONTEXT
Current Date: ${context.currentDate}
Current Time: ${context.currentTime}
Timezone: ${context.timezone}`);

  // Current Capacity
  sections.push(`# CURRENT CAPACITY
Total Remaining Work: ${context.currentCapacity.toFixed(1)} hours
Risk Score: ${(context.riskScore * 100).toFixed(0)}%
Execution Health: ${context.executionHealth}`);

  // Mission Control Metrics
  sections.push(`# MISSION CONTROL METRICS
Total Tasks: ${context.missionControlMetrics.totalTasks}
Completed: ${context.missionControlMetrics.completedTasks}
Overdue: ${context.missionControlMetrics.overdueTasks}
Completion Rate: ${context.missionControlMetrics.completionRate.toFixed(0)}%
Average Progress: ${(context.missionControlMetrics.averageProgress * 100).toFixed(0)}%`);

  // Deadlines
  const upcomingDeadlines = context.recentProgress
    .filter((t) => new Date(t.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  if (upcomingDeadlines.length > 0) {
    sections.push(`# UPCOMING DEADLINES
${upcomingDeadlines.map((t) => `- ${t.title}: ${new Date(t.deadline).toLocaleDateString()} (${t.estimatedHours - t.completedHours}h remaining)`).join("\n")}`);
  }

  // Planner Output
  if (context.plannerOutput) {
    sections.push(`# PLANNER OUTPUT
Execution Strategy: ${context.plannerOutput.executionStrategy}
Recommended Work Sessions: ${context.plannerOutput.recommendedWorkSessions}`);
  }

  // Recent Progress
  if (context.recentProgress.length > 0) {
    sections.push(`# RECENT PROGRESS
${context.recentProgress.map((t) => `- ${t.title}: ${Math.round((t.completedHours / t.estimatedHours) * 100)}% complete`).join("\n")}`);
  }

  // Completed Tasks
  if (context.completedTasks.length > 0) {
    sections.push(`# COMPLETED TASKS
${context.completedTasks.slice(-5).map((t) => `- ${t.title}`).join("\n")}`);
  }

  // Blocked Tasks
  if (context.blockedTasks.length > 0) {
    sections.push(`# BLOCKED TASKS
${context.blockedTasks.map((t) => `- ${t.title} (dependencies: ${t.dependencies?.join(", ")})`).join("\n")}`);
  }

  // Historical Completion
  sections.push(`# HISTORICAL COMPLETION
Average Completion Rate: ${context.historicalCompletion.averageCompletionRate.toFixed(0)}%
Trend: ${context.historicalCompletion.trend}
Execution Velocity: ${context.historicalCompletion.velocity.toFixed(2)} hours/day`);

  // Conversation History
  if (context.conversationHistory.length > 0) {
    sections.push(`# RECENT CONVERSATION
${context.conversationHistory.slice(-5).map((msg) => `[${msg.role}]: ${msg.content}`).join("\n")}`);
  }

  // UI Context
  sections.push(`# CURRENT CONTEXT
Screen: ${context.currentScreen}
User Intent: ${context.userIntent || "General inquiry"}`);

  return sections.join("\n\n");
}
