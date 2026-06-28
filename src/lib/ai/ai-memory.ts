import type { ChatMessage, Task } from "@/types";

export interface AIMemory {
  conversationHistory: ChatMessage[];
  recentDecisions: string[];
  plannerHistory: Array<{
    timestamp: string;
    tasks: string[];
    strategy: string;
  }>;
  previousRecommendations: Array<{
    timestamp: string;
    recommendation: string;
    context: string;
  }>;
  completedActions: Array<{
    timestamp: string;
    action: string;
    taskId?: string;
  }>;
  userPreferences: {
    preferredWorkStyle: string | null;
    commonBlockers: string[];
    successfulStrategies: string[];
  };
}

const MEMORY_KEY_PREFIX = "hourglass:ai:memory:";

export function loadAIMemory(userId: string): AIMemory {
  if (typeof window === "undefined") {
    return getDefaultMemory();
  }

  try {
    const raw = window.localStorage.getItem(`${MEMORY_KEY_PREFIX}${userId}`);
    if (!raw) return getDefaultMemory();
    return JSON.parse(raw) as AIMemory;
  } catch {
    return getDefaultMemory();
  }
}

export function saveAIMemory(userId: string, memory: AIMemory): void {
  if (typeof window === "undefined") return;

  try {
    // Limit memory size
    const trimmed = {
      ...memory,
      conversationHistory: memory.conversationHistory.slice(-20),
      recentDecisions: memory.recentDecisions.slice(-10),
      plannerHistory: memory.plannerHistory.slice(-5),
      previousRecommendations: memory.previousRecommendations.slice(-10),
      completedActions: memory.completedActions.slice(-15),
    };

    window.localStorage.setItem(`${MEMORY_KEY_PREFIX}${userId}`, JSON.stringify(trimmed));
  } catch {
    // Best-effort cache only
  }
}

export function clearAIMemory(userId?: string): void {
  if (typeof window === "undefined") return;

  try {
    if (userId) {
      window.localStorage.removeItem(`${MEMORY_KEY_PREFIX}${userId}`);
    } else {
      // Clear all AI memory
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(MEMORY_KEY_PREFIX))
        .forEach((key) => window.localStorage.removeItem(key));
    }
  } catch {
    // Best-effort cleanup
  }
}

function getDefaultMemory(): AIMemory {
  return {
    conversationHistory: [],
    recentDecisions: [],
    plannerHistory: [],
    previousRecommendations: [],
    completedActions: [],
    userPreferences: {
      preferredWorkStyle: null,
      commonBlockers: [],
      successfulStrategies: [],
    },
  };
}

export function addConversationMessage(
  memory: AIMemory,
  message: ChatMessage
): AIMemory {
  return {
    ...memory,
    conversationHistory: [...memory.conversationHistory.slice(-19), message],
  };
}

export function addDecision(memory: AIMemory, decision: string): AIMemory {
  return {
    ...memory,
    recentDecisions: [...memory.recentDecisions.slice(-9), `${new Date().toISOString()}: ${decision}`],
  };
}

export function addPlannerResult(
  memory: AIMemory,
  tasks: Task[],
  strategy: string
): AIMemory {
  return {
    ...memory,
    plannerHistory: [
      ...memory.plannerHistory.slice(-4),
      {
        timestamp: new Date().toISOString(),
        tasks: tasks.map((t) => t.title),
        strategy,
      },
    ],
  };
}

export function addRecommendation(
  memory: AIMemory,
  recommendation: string,
  context: string
): AIMemory {
  return {
    ...memory,
    previousRecommendations: [
      ...memory.previousRecommendations.slice(-9),
      {
        timestamp: new Date().toISOString(),
        recommendation,
        context,
      },
    ],
  };
}

export function addCompletedAction(
  memory: AIMemory,
  action: string,
  taskId?: string
): AIMemory {
  return {
    ...memory,
    completedActions: [
      ...memory.completedActions.slice(-14),
      {
        timestamp: new Date().toISOString(),
        action,
        taskId,
      },
    ],
  };
}

export function updateUserPreferences(
  memory: AIMemory,
  updates: Partial<AIMemory["userPreferences"]>
): AIMemory {
  return {
    ...memory,
    userPreferences: {
      ...memory.userPreferences,
      ...updates,
    },
  };
}

export function formatMemoryForPrompt(memory: AIMemory): string {
  const sections: string[] = [];

  // Conversation History
  if (memory.conversationHistory.length > 0) {
    sections.push(`# RECENT CONVERSATION
${memory.conversationHistory.slice(-5).map((msg) => `[${msg.role}]: ${msg.content}`).join("\n")}`);
  }

  // Recent Decisions
  if (memory.recentDecisions.length > 0) {
    sections.push(`# RECENT DECISIONS
${memory.recentDecisions.slice(-5).join("\n")}`);
  }

  // Planner History
  if (memory.plannerHistory.length > 0) {
    sections.push(`# PLANNER HISTORY
${memory.plannerHistory.slice(-3).map((p) => `[${new Date(p.timestamp).toLocaleDateString()}]: ${p.strategy} (${p.tasks.length} tasks)`).join("\n")}`);
  }

  // Previous Recommendations
  if (memory.previousRecommendations.length > 0) {
    sections.push(`# PREVIOUS RECOMMENDATIONS
${memory.previousRecommendations.slice(-3).map((r) => `[${new Date(r.timestamp).toLocaleDateString()}]: ${r.recommendation}`).join("\n")}`);
  }

  // Completed Actions
  if (memory.completedActions.length > 0) {
    sections.push(`# COMPLETED ACTIONS
${memory.completedActions.slice(-5).map((a) => `[${new Date(a.timestamp).toLocaleDateString()}]: ${a.action}`).join("\n")}`);
  }

  // User Preferences
  if (memory.userPreferences.preferredWorkStyle || memory.userPreferences.successfulStrategies.length > 0) {
    sections.push(`# USER PREFERENCES
Preferred Work Style: ${memory.userPreferences.preferredWorkStyle || "Not established"}
Successful Strategies: ${memory.userPreferences.successfulStrategies.join(", ") || "None yet"}`);
  }

  return sections.join("\n\n");
}
