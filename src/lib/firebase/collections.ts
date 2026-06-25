/** Firestore collection paths and document shapes */
export const COLLECTIONS = {
  users: "users",
  goals: "goals",
  tasks: "tasks",
  plans: "plans",
  riskAssessments: "riskAssessments",
  rescuePlans: "rescuePlans",
  calendarEvents: "calendarEvents",
  behaviorPatterns: "behaviorPatterns",
  agentLogs: "agentLogs",
  predictions: "predictions",
  simulations: "simulations",
  analytics: "analytics",
  interventions: "interventions",
  memory: "memory",
  reflection: "reflection",
  sessions: "sessions",
  notifications: "notifications",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** Subcollection helpers */
export function userTasksPath(userId: string) {
  return `${COLLECTIONS.users}/${userId}/${COLLECTIONS.tasks}`;
}

export function userAgentLogsPath(userId: string) {
  return `${COLLECTIONS.users}/${userId}/${COLLECTIONS.agentLogs}`;
}

export function userMemoryPath(userId: string) {
  return `${COLLECTIONS.users}/${userId}/${COLLECTIONS.memory}`;
}
