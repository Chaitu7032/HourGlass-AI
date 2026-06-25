/** Hourglass AI — Core domain types */

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskCategory =
  | "exam"
  | "interview"
  | "hackathon"
  | "assignment"
  | "project"
  | "meeting"
  | "personal";

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

export interface RiskAssessment {
  taskId: string;
  taskTitle: string;
  failureProbability: number;
  confidence: number;
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
  totalFreeHours: number;
  productiveHours: number;
  energyScore: number; // 0-100
  peakWindows: { start: string; end: string; score: number }[];
  reasoning: string;
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

export interface CommitmentScore {
  overall: number;
  completionRate: number;
  planningQuality: number;
  executionConsistency: number;
  recoveryAbility: number;
  focus: number;
  reliability: number;
  trend: "improving" | "stable" | "declining";
  history: { date: string; score: number }[];
}

export interface BehaviorPattern {
  preferredWorkHours: { start: number; end: number };
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
