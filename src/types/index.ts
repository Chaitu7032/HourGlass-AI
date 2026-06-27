/** Hourglass AI — Core domain types */

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskCategory =
  | "exam"
  | "interview"
  | "hackathon"
  | "assignment"
  | "project"
  | "meeting"
  | "personal"
  | "research"
  | "coding_project"
  | "startup"
  | "open_source"
  | "health"
  | "finance"
  | "learning"
  | "work"
  | "career"
  | "side_project"
  | "other";

export type AgentName =
  | "orchestrator"
  | "planner"
  | "risk"
  | "calendar"
  | "focus"
  | "accountability"
  | "reflection"
  | "memory"
  | "energy"
  | "opportunity"
  | "negotiation";

export type AgentStatus = "idle" | "running" | "complete" | "error";

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  estimatedHours: number;
  completedHours: number;
  priority: TaskPriority;
  category: TaskCategory;
  dependencies?: string[];
  complexity: number; // 1-10
  createdAt: string;
  updatedAt: string;
}

export interface PlannerSuggestion {
  source: "Gemini" | "Heuristic";
  confidence: number;
  estimatedHours: number;
  estimatedHoursConfidence: number;
  complexity: number;
  complexityLabel: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadlineRisk: "low" | "moderate" | "elevated" | "high" | "critical";
  subtaskCount: number;
  subtasks: string[];
  executionStrategy: string;
  suggestedWorkSessions: number;
  availableCapacityHours: number;
  firstStep: string;
  executionHealth: string;
  reasoning: string;
  assumptions: string[];
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  tasks: string[];
  status: "active" | "completed" | "at_risk" | "failed";
}

export interface RiskFactor {
  name: string;
  impact: number; // 0-100 contribution to failure probability
  description: string;
}

export type DataStatus = "ready" | "insufficient_data";

export interface ConfidenceScore {
  value: number;
  label: "low" | "medium" | "high";
  reasoning: string;
}

export interface RiskAssessment {
  taskId: string;
  taskTitle: string;
  failureProbability: number;
  confidence: ConfidenceScore;
  dataStatus: DataStatus;
  factors: RiskFactor[];
  reasoning: string;
  rescueRecommended: boolean;
  assessedAt: string;
}

export interface RescueAction {
  id: string;
  type:
    | "reschedule"
    | "break_down"
    | "pomodoro"
    | "delegate"
    | "postpone"
    | "reallocate";
  title: string;
  description: string;
  impact: string;
  priority: number;
}

export interface RescuePlan {
  id: string;
  taskId: string;
  triggeredAt: string;
  failureProbability: number;
  actions: RescueAction[];
  roadmap: RescueRoadmapStep[];
  voiceMessage: string;
}

export interface RescueRoadmapStep {
  step: number;
  title: string;
  duration: string;
  completed: boolean;
}

export interface CalendarBlock {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "focus" | "meeting" | "break" | "commute" | "free";
  taskId?: string;
}

export interface EnergyProfile {
  dataStatus: DataStatus;
  totalFreeHours: number;
  productiveHours: number;
  energyScore: number; // 0-100
  peakWindows: { start: string; end: string; score: number }[];
  reasoning: string;
  insufficientDataReasons: string[];
}

export interface OpportunityImpact {
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  impactType: string;
  magnitude: string;
  emotionalWeight: number; // 1-10
  description: string;
}

export interface NegotiationOption {
  id: string;
  scenario: string;
  tradeoffs: { keep: string[]; defer: string[]; risk: string };
  recommended: boolean;
  reasoning: string;
}

export interface FutureSelfProjection {
  date: string;
  commitmentScore: number;
  missedDeadlines: number;
  stressLevel: number;
  opportunityLoss: string;
  careerImpact: string;
  academicImpact: string;
  narrative: string;
}

export interface FutureScenario {
  id: string;
  label: string;
  mode: "current" | "rescue" | "optimized";
  dataStatus: DataStatus;
  summary: string;
  adjustments: string[];
  projections: FutureSelfProjection[];
}

export interface CommitmentScoreDimension {
  key:
    | "completionRate"
    | "planningQuality"
    | "executionConsistency"
    | "recoveryAbility"
    | "focus"
    | "reliability";
  label: string;
  value: number;
  weight: number;
  weightedContribution: number;
  reasoning: string;
}

export interface CommitmentScore {
  overall: number;
  completionRate: number;
  planningQuality: number;
  executionConsistency: number;
  recoveryAbility: number;
  focus: number;
  reliability: number;
  trend: "improving" | "stable" | "declining";
  dataStatus: DataStatus;
  historyUnavailableReason?: string;
  scoreBreakdown: CommitmentScoreDimension[];
  history: { date: string; score: number }[];
}

export interface BehaviorPattern {
  preferredWorkHours: { start: number; end: number } | null;
  productivityTrend: number; // % change week over week
  recurringDelays: string[];
  executionVelocity: number; // hours/day
  focusScore: number;
  procrastinationScore: number;
  successPatterns: string[];
  failurePatterns: string[];
}

export interface AgentLogEntry {
  id: string;
  agent: AgentName;
  status: AgentStatus;
  message: string;
  timestamp: string;
  durationMs?: number;
  output?: Record<string, unknown>;
}

export interface OrchestrationResult {
  id: string;
  timestamp: string;
  agentLogs: AgentLogEntry[];
  riskAssessments: RiskAssessment[];
  rescuePlans: RescuePlan[];
  calendarBlocks: CalendarBlock[];
  energyProfile: EnergyProfile;
  opportunityImpacts: OpportunityImpact[];
  negotiationOptions: NegotiationOption[];
  futureSelf: FutureSelfProjection[];
  futureScenarios: FutureScenario[];
  commitmentScore: CommitmentScore;
  behaviorPatterns: BehaviorPattern;
  executiveSummary: string;
  voiceCoachMessage: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  authProvider?: "google" | "password";
  commitmentScore: number;
  onboardingComplete: boolean;
  timezone?: string;
  primaryGoal?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  agentContext?: AgentName;
}

export interface DemoScenario {
  tasks: Task[];
  label: string;
  description: string;
}
