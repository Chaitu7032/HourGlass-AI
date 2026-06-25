import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Task, OrchestrationResult } from "@/types";
import { runOrchestration } from "./orchestrator";
import { ORCHESTRATOR_PROMPT, AGENT_PROMPTS } from "./prompts";

const MODEL = "gemini-2.5-flash";

function getGenAI() {
  const key = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

/** Enhance orchestration with Gemini reasoning when API key is available */
export async function runOrchestrationWithGemini(
  tasks: Task[]
): Promise<OrchestrationResult> {
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

Tasks: ${JSON.stringify(tasks.map((t) => ({ title: t.title, deadline: t.deadline, hours: t.estimatedHours - t.completedHours })))}
Risk assessments: ${JSON.stringify(base.riskAssessments.map((r) => ({ task: r.taskTitle, prob: r.failureProbability, reasoning: r.reasoning })))}
Capacity: ${base.energyProfile.totalFreeHours}h available, ${base.energyProfile.productiveHours.toFixed(1)}h productive
Negotiation: ${base.negotiationOptions.find((n) => n.recommended)?.scenario}

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

export async function chatWithGemini(
  message: string,
  context: OrchestrationResult | null
): Promise<string> {
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
      ? `\nCurrent orchestration context:\n${context.executiveSummary}\nRisk: ${context.riskAssessments.map((r) => `${r.taskTitle}: ${Math.round(r.failureProbability * 100)}%`).join(", ")}`
      : "";

    const result = await model.generateContent(`${contextBlock}\n\nUser: ${message}`);
    return result.response.text();
  } catch {
    return getFallbackChatResponse(message, context);
  }
}

function getFallbackChatResponse(message: string, context: OrchestrationResult | null): string {
  const lower = message.toLowerCase();
  if (lower.includes("rescue") || lower.includes("help")) {
    return context?.rescuePlans[0]
      ? `Rescue mode is active for ${context.rescuePlans.length} task(s). Start with tonight's 90-minute focus block on your highest-risk commitment. I've cleared your calendar from 8–10 PM.`
      : "No active rescue plans. Add your commitments and I'll analyze failure risk immediately.";
  }
  if (lower.includes("negotiate") || lower.includes("priority")) {
    const rec = context?.negotiationOptions.find((n) => n.recommended);
    return rec
      ? `I recommend "${rec.scenario}": keep ${rec.tradeoffs.keep.join(" and ")}, defer ${rec.tradeoffs.defer.join(", ")}. ${rec.reasoning}`
      : "Run an orchestration first so I can assess your capacity gap.";
  }
  if (lower.includes("future") || lower.includes("what if")) {
    return context
      ? "If current behavior continues, you'll miss 2+ deadlines within 7 days and your commitment score drops to 42. Activating rescue now prevents the cascade."
      : "I can simulate your future trajectory once you add commitments.";
  }
  return context
    ? `${context.executiveSummary.slice(0, 200)}... Ask me about rescue plans, negotiation options, or your future self projection.`
    : "I'm Hourglass — your AI Chief of Staff. I predict missed deadlines before they happen. Add your commitments or run the demo to begin.";
}

export { AGENT_PROMPTS, ORCHESTRATOR_PROMPT };
