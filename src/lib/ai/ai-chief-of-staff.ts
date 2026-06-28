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

function formatChiefConfidence(orchestration: OrchestrationResult | null): "high" | "medium" | "low" {
  if (!orchestration) return "low";
  const evidence = [
    orchestration.riskAssessments.length > 0,
    orchestration.rescuePlans.length > 0,
    orchestration.commitmentScore?.overall !== undefined,
    orchestration.behaviorPatterns?.executionVelocity > 0,
  ].filter(Boolean).length;

  if (evidence >= 4) return "high";
  if (evidence >= 2) return "medium";
  return "low";
}

function buildExecutiveSections(args: {
  assessment: string;
  reasoning: string[];
  recommendations: string[];
  nextAction: string;
  confidence: "high" | "medium" | "low";
}) {
  return {
    summary: `Assessment: ${args.assessment}`,
    topPriorities: args.recommendations.slice(0, 3),
    riskAnalysis: args.reasoning.join(" "),
    recommendedSchedule: args.recommendations[0] ?? args.nextAction,
    warnings: args.reasoning.slice(0, 3),
    nextAction: args.nextAction,
    confidence: args.confidence,
  };
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
  const confidence = formatChiefConfidence(orchestration);

  if (lower.includes("rescue") || lower.includes("help")) {
    return buildExecutiveSections({
      assessment: orchestration?.rescuePlans.length
        ? `${orchestration.rescuePlans.length} commitment(s) require intervention`
        : "No active rescue plans. The current workload appears manageable.",
      reasoning: [
        highestRisk
          ? `${highestRisk.taskTitle} is the highest-risk item at ${Math.round(highestRisk.failureProbability * 100)}% failure probability.`
          : "No task has crossed the intervention threshold.",
        orchestration?.rescuePlans.length
          ? `${orchestration.rescuePlans.length} rescue plan(s) are already available.`
          : "No rescue plan evidence is present yet.",
      ],
      recommendations: orchestration?.rescuePlans.slice(0, 3).map((p) => p.taskId) || ["Protect the next focused work block"],
      nextAction: orchestration?.rescuePlans[0]
        ? "Execute the first rescue roadmap step"
        : "Review the highest-risk commitment and confirm whether intervention is needed",
      confidence,
    });
  }

  if (lower.includes("priority") || lower.includes("what should")) {
    const remaining = tasks.reduce((sum, t) => sum + Math.max(0, t.estimatedHours - t.completedHours), 0);
    return buildExecutiveSections({
      assessment: `You have ${tasks.length} active commitment(s) and ${remaining.toFixed(1)} hours remaining.`,
      reasoning: [
        highestRisk
          ? `${highestRisk.taskTitle} is currently the highest-risk item at ${Math.round(highestRisk.failureProbability * 100)}%.`
          : "No risk assessment is available yet.",
        `${tasks.filter((t) => new Date(t.deadline) < new Date() && t.completedHours < t.estimatedHours).length} commitment(s) are overdue or due now.`,
      ],
      recommendations: highestRisk ? [highestRisk.taskTitle, ...tasks.slice(0, 2).map((t) => t.title)] : tasks.slice(0, 3).map((t) => t.title),
      nextAction: highestRisk ? `Prioritize ${highestRisk.taskTitle}` : "Start with the commitment nearest its deadline",
      confidence,
    });
  }

  return buildExecutiveSections({
    assessment: `You have ${tasks.length} active commitment(s). ${orchestration ? "Shared orchestration data is available." : "No orchestration data has been computed yet."}`,
    reasoning: [
      highestRisk
        ? `${highestRisk.taskTitle} is the current highest-risk commitment at ${Math.round(highestRisk.failureProbability * 100)}%.`
        : "No risk data is available yet.",
      orchestration
        ? `Execution health is ${Math.round(orchestration.commitmentScore.overall)}/100.`
        : "Execution health has not been calculated yet.",
    ],
    recommendations: tasks.slice(0, 3).map((t) => t.title),
    nextAction: "Add deadlines, estimated hours, and progress data to improve planning accuracy",
    confidence,
  });
}
