/** Execution Profile — Mathematical foundation for all AI calculations */

export type WorkingDays = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type BreakDuration = "15min" | "30min" | "45min" | "1hour" | "custom";

export type DeepWorkWindow = "morning" | "afternoon" | "evening" | "night" | "custom";

export type EnergyProfileType = "morning" | "afternoon" | "night" | "mixed";

export type Chronotype = "early_bird" | "balanced" | "night_owl";

export type WeekendWork = "never" | "saturday_only" | "sunday_only" | "both" | "flexible";

export type InterruptionLevel = "rarely" | "sometimes" | "frequently" | "constantly";

export type WorkStyle = "student" | "software_engineer" | "researcher" | "founder" | "freelancer" | "corporate" | "custom";

export type CommitmentStyle = "optimistically" | "realistically" | "conservatively" | "not_sure";

export type NotificationPreference = "minimal" | "balanced" | "aggressive" | "ai_decides";

export type StressTolerance = 1 | 2 | 3;

export type RecoveryHours = 1 | 2 | 4 | 6 | 8;

export interface ExecutionProfile {
  // Work Schedule
  workingDays: WorkingDays[];
  workStartTime: string; // HH:mm format
  workEndTime: string; // HH:mm format

  // Breaks
  breakDuration: BreakDuration;
  customBreakMinutes?: number;

  // Productivity
  productiveHours: number; // 1-12 slider value

  // Deep Work
  deepWorkWindow: DeepWorkWindow;
  customDeepWorkStart?: string;
  customDeepWorkEnd?: string;

  // Energy
  energyProfileType: EnergyProfileType;
  chronotype: Chronotype;

  // Weekend
  weekendWork: WeekendWork;

  // Sleep
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm

  // Work Environment
  interruptionLevel: InterruptionLevel;
  workStyle: WorkStyle;
  customWorkStyle?: string;

  // Psychology
  commitmentStyle: CommitmentStyle;
  stressTolerance: StressTolerance;
  recoveryHours: RecoveryHours;

  // Notifications
  notificationPreference: NotificationPreference;

  // Integration status
  calendarConnected: boolean;

  // Metadata
  profileComplete: boolean;
  lastUpdated: string;
}

/** Default empty execution profile */
export function createEmptyExecutionProfile(): ExecutionProfile {
  return {
    workingDays: [],
    workStartTime: "09:00",
    workEndTime: "18:00",
    breakDuration: "1hour",
    productiveHours: 5,
    deepWorkWindow: "morning",
    energyProfileType: "morning",
    chronotype: "balanced",
    weekendWork: "never",
    bedtime: "23:00",
    wakeTime: "07:00",
    interruptionLevel: "sometimes",
    workStyle: "software_engineer",
    commitmentStyle: "realistically",
    stressTolerance: 2,
    recoveryHours: 4,
    notificationPreference: "ai_decides",
    calendarConnected: false,
    profileComplete: false,
    lastUpdated: new Date().toISOString(),
  };
}