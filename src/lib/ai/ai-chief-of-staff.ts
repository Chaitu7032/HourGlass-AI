import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OrchestrationResult, Task, ChatMessage } from "@/types";
import { buildAIContext, formatAIContextForPrompt } from "./ai-context";
import { loadAIMemory, saveAIMemory, addConversationMessage, formatMemoryForPrompt } from "./ai-memory";
import type { UserProfile } from "@/types";
import type { ExecutionProfile } from "@/types/execution-profile";

const MODEL = "gemini-2.5-flash";

function getGenAI() {
  const key = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export interface StructuredAIResponse {
  summary: string;
  topPriorities: string[];
  riskAnalysis: string;
  recommendedSchedule: string;
  warnings: string[];
  nextAction: string;
  confidence: "high" | "medium" | "low";
}

export async function chatWithChiefOfStaff(
  message: string,
  userProfile: UserProfile | null,
  executionProfile: ExecutionProfile | null,
  orchestration: OrchestrationResult | null,
  tasks: Task[],
  currentScreen: string,
  conversationHistory: ChatMessage[] = []
): Promise<StructuredAIResponse> {
  const genAI = getGenAI();
  const userId = userProfile?.id || "anonymous";

  // Load AI memory
  const memory = loadAIMemory(userId);

  // Build complete AI context
  const aiContext = buildAIContext(
    userProfile,
    executionProfile,
    orchestration,
    tasks,
    conversationHistory.length > 0 ? conversationHistory : memory.conversationHistory,
    currentScreen,
    message
  );

  // Format context for prompt
  const contextPrompt = formatAIContextForPrompt(aiContext);
  const memoryPrompt = formatMemoryForPrompt(memory);

  if (!genAI) {
    throw new Error("Gemini API key is not configured.");
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: `You are Hourglass AI's Chief of Staff — a strategic execution advisor.

${contextPrompt}

${memoryPrompt}

# RESPONSE FORMAT
You MUST respond with valid JSON matching this exact structure:
{
  "summary": "2-3 sentence executive summary of the situation",
  "topPriorities": ["priority 1", "priority 2", "priority 3"],
  "riskAnalysis": "1-2 sentences about current risk level and factors",
  "recommendedSchedule": "specific time-blocked recommendation for next 24 hours",
  "warnings": ["warning 1", "warning 2"],
  "nextAction": "single most important immediate action",
  "confidence": "high" | "medium" | "low"
}

Rules:
- Be specific and reference actual task names and numbers
- Never use generic advice
- Always lead with the highest-risk finding
- Confidence should reflect data availability: "high" if you have full context, "medium" if partial, "low" if insufficient data
- Keep summary under 3 sentences
- Limit topPriorities to exactly 3 items
- Limit warnings to 2-3 items maximum`,
    });

    const result = await model.generateContent(`User Question: ${message}`);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as StructuredAIResponse;

      // Save to memory
      const updatedMemory = addConversationMessage(memory, {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });
      saveAIMemory(userId, updatedMemory);

      // Add AI response to memory
      const memoryWithResponse = addConversationMessage(updatedMemory, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: parsed.summary,
        timestamp: new Date().toISOString(),
      });
      saveAIMemory(userId, memoryWithResponse);

      return parsed;
    }

    throw new Error("Gemini returned an unparseable response.");
  } catch (err) {
    console.error("[ChiefOfStaff] Error:", err);
    throw err instanceof Error ? err : new Error("Gemini chat request failed.");
  }
}

export function generateFallbackResponse(
  message: string,
  orchestration: OrchestrationResult | null,
  tasks: Task[]
): StructuredAIResponse {
  const lower = message.toLowerCase();
  const highestRisk = orchestration?.riskAssessments
    ? [...orchestration.riskAssessments].sort((a, b) => b.failureProbability - a.failureProbability)[0]
    : null;

  if (lower.includes("rescue") || lower.includes("help")) {
    return {
      summary: orchestration?.rescuePlans.length
        ? `${orchestration.rescuePlans.length} commitment(s) need immediate attention`
        : "No active rescue plans. Add commitments to enable risk analysis.",
      topPriorities: orchestration?.rescuePlans.slice(0, 3).map((p) => p.taskId) || [],
      riskAnalysis: highestRisk
        ? `Highest risk: ${highestRisk.taskTitle} at ${Math.round(highestRisk.failureProbability * 100)}%`
        : "No risk data available",
      recommendedSchedule: "Start with the highest-risk commitment and protect 90 minutes of focused work",
      warnings: orchestration?.rescuePlans.map((p) => `${p.taskId} requires rescue plan`) || [],
      nextAction: "Review rescue plans and execute the first action item",
      confidence: "medium",
    };
  }

  if (lower.includes("priority") || lower.includes("what should")) {
    return {
      summary: `You have ${tasks.length} active commitment(s) with ${tasks.reduce((sum, t) => sum + Math.max(0, t.estimatedHours - t.completedHours), 0).toFixed(1)} hours remaining`,
      topPriorities: highestRisk ? [highestRisk.taskTitle] : tasks.slice(0, 3).map((t) => t.title),
      riskAnalysis: highestRisk
        ? `${highestRisk.taskTitle} has ${Math.round(highestRisk.failureProbability * 100)}% failure probability`
        : "No risk assessments available yet",
      recommendedSchedule: "Focus on the highest-priority commitment during your peak energy window",
      warnings: tasks.filter((t) => new Date(t.deadline) < new Date() && t.completedHours < t.estimatedHours).map((t) => `${t.title} is overdue`),
      nextAction: "Complete the most critical commitment first",
      confidence: "medium",
    };
  }

  return {
    summary: `You have ${tasks.length} active commitments. ${orchestration ? "Orchestration analysis is available." : "Run orchestration for detailed insights."}`,
    topPriorities: tasks.slice(0, 3).map((t) => t.title),
    riskAnalysis: highestRisk
      ? `${highestRisk.taskTitle} at ${Math.round(highestRisk.failureProbability * 100)}% risk`
      : "No risk data yet",
    recommendedSchedule: "Protect focused work blocks for your highest-priority commitments",
    warnings: [],
    nextAction: "Add deadlines and estimated hours to enable intelligent planning",
    confidence: "low",
  };
}
