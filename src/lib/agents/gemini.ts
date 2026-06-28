import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OrchestrationResult, Task } from "@/types";
import { runOrchestration } from "./orchestrator";
import { AGENT_PROMPTS, ORCHESTRATOR_PROMPT } from "./prompts";
import { formatAIContextForPrompt } from "@/lib/ai/ai-context";

const MODEL = "gemini-2.5-flash";

function getGenAI() {
  const key = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

/** Enhance orchestration with Gemini reasoning when API key is available */
export async function runOrchestrationWithGemini(tasks: Task[]): Promise<OrchestrationResult> {
  const base = await runOrchestration(tasks);
  const genAI = getGenAI();

  if (!genAI) return base;

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: ORCHESTRATOR_PROMPT,
    });

    const prompt = `Given this execution analysis, provide an enhanced executive summary and voice coach message.
Be specific, calm, and actionable. Reference actual task names and probabilities.

${formatAIContextForPrompt({
  userProfile: null,
  executionProfile: null,
  currentDate: new Date().toISOString().split("T")[0],
  currentTime: new Date().toTimeString().split(" ")[0],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  currentCapacity: base.energyProfile.totalFreeHours,
  riskScore: base.riskAssessments.reduce((max, r) => Math.max(max, r.failureProbability), 0),
  remainingCapacity: base.energyProfile.totalFreeHours,
  executionHealth: `${Math.round(base.commitmentScore.overall)}/100`,
  missionControlMetrics: {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.completedHours >= t.estimatedHours).length,
    overdueTasks: base.riskAssessments.filter(r => r.failureProbability >= 0.65).length,
    completionRate: tasks.length > 0 ? (tasks.filter(t => t.completedHours >= t.estimatedHours).length / tasks.length) * 100 : 0,
    averageProgress: tasks.length > 0 ? tasks.reduce((sum, t) => sum + (t.completedHours / t.estimatedHours), 0) / tasks.length : 0,
  },
  plannerOutput: {
    suggestions: [],
    executionStrategy: base.executiveSummary,
    recommendedWorkSessions: Math.ceil(base.energyProfile.totalFreeHours / 1.5),
  },
  recentProgress: tasks.slice(0, 5),
  completedTasks: tasks.filter(t => t.completedHours >= t.estimatedHours),
  blockedTasks: tasks.filter(t => t.dependencies && t.dependencies.length > 0),
  historicalCompletion: {
    averageCompletionRate: 0,
    trend: base.commitmentScore.trend,
    velocity: base.behaviorPatterns.executionVelocity,
  },
  conversationHistory: [],
  currentScreen: "orchestration",
  userIntent: "orchestration_enhancement",
})}

Respond as JSON: { "executiveSummary": string, "voiceCoachMessage": string }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const enhanced = JSON.parse(jsonMatch[0]) as {
        executiveSummary?: string;
        voiceCoachMessage?: string;
      };

      return {
        ...base,
        executiveSummary: enhanced.executiveSummary ?? base.executiveSummary,
        voiceCoachMessage: enhanced.voiceCoachMessage ?? base.voiceCoachMessage,
      };
    }
  } catch (err) {
    console.error("[Gemini orchestration enhancement failed]", err);
  }

  return base;
}

export async function chatWithGemini(message: string, context: OrchestrationResult | null): Promise<string> {
  const genAI = getGenAI();

  if (!genAI) {
    return getFallbackChatResponse(message, context);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: `${ORCHESTRATOR_PROMPT}

You are responding in the Hourglass AI chat interface. Be concise (2-4 sentences).
Reference specific tasks, probabilities, and rescue actions when relevant.`,
    });

    const contextBlock = context
      ? `\nCurrent orchestration context:\n${context.executiveSummary}\nRisk: ${context.riskAssessments.map((assessment) => `${assessment.taskTitle}: ${Math.round(assessment.failureProbability * 100)}%`).join(", ")}`
      : "";

    const result = await model.generateContent(`${contextBlock}\n\nUser: ${message}`);
    return result.response.text();
  } catch {
    return getFallbackChatResponse(message, context);
  }
}

function getFallbackChatResponse(message: string, context: OrchestrationResult | null): string {
  const lower = message.toLowerCase();
  const highestRisk = context?.riskAssessments
    ? [...context.riskAssessments].sort((a, b) => b.failureProbability - a.failureProbability)[0]
    : null;
  const recommendedScenario = context?.negotiationOptions.find((option) => option.recommended);

  if (lower.includes("rescue") || lower.includes("help")) {
    return context?.rescuePlans[0]
      ? `Rescue mode is active for ${context.rescuePlans.length} commitment(s). Start with ${context.rescuePlans[0].roadmap[0]?.title ?? "the first rescue step"} and then work through the remaining protected actions.`
      : "No active rescue plans. Add your commitments and I'll analyze failure risk immediately.";
  }

  if (lower.includes("negotiate") || lower.includes("priority")) {
    return recommendedScenario
      ? `I recommend "${recommendedScenario.scenario}": keep ${recommendedScenario.tradeoffs.keep.join(" and ") || "the currently protected commitments"}, defer ${recommendedScenario.tradeoffs.defer.join(", ") || "nothing yet"}. ${recommendedScenario.reasoning}`
      : "Run an orchestration first so I can assess your capacity gap.";
  }

  if (lower.includes("future") || lower.includes("what if")) {
    const currentScenario = context?.futureScenarios.find((scenario) => scenario.mode === "current");
    return context
      ? currentScenario?.projections[0]?.narrative
        ? `${currentScenario.projections[0].narrative} Review the Future Self simulation for the day-by-day forecast.`
        : currentScenario?.summary ?? "I need a fresh execution snapshot before I can project your trajectory."
      : "I can simulate your future trajectory once you add commitments.";
  }

  return context
    ? `${highestRisk ? `${highestRisk.taskTitle} is currently the highest-risk commitment at ${Math.round(highestRisk.failureProbability * 100)}%. ` : ""}${context.executiveSummary} Ask me about rescue plans, negotiation options, or your future self projection.`
    : "I'm Hourglass, your AI Chief of Staff. Add your commitments and I will compute risk, workload pressure, and trade-offs from real data.";
}

export { AGENT_PROMPTS, ORCHESTRATOR_PROMPT };
