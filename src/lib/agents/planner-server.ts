import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PlannerSuggestion } from "@/types";
import type { CommitmentDraft } from "./planner-core";
import { buildPlannerSuggestion } from "./planner-core";

const MODEL = "gemini-2.5-flash";

function getGenAI() {
  const key = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

function safeJsonParse(value: string): Partial<PlannerSuggestion> | null {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]) as Partial<PlannerSuggestion>;
  } catch {
    return null;
  }
}

export async function analyzeCommitmentDraft(draft: CommitmentDraft): Promise<PlannerSuggestion> {
  const fallback = buildPlannerSuggestion(draft);
  const genAI = getGenAI();

  if (!genAI) return fallback;

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: `You are the Planner Agent for Hourglass AI.
Transform a commitment draft into a clear planning recommendation.
Return JSON only with these keys:
source, confidence, estimatedHours, estimatedHoursConfidence, complexity, complexityLabel, priority, category, deadlineRisk, subtaskCount, subtasks, executionStrategy, suggestedWorkSessions, availableCapacityHours, firstStep, executionHealth, reasoning, assumptions.
Never invent certainty. If data is missing, state assumptions explicitly. Suggestions must be editable and clearly framed as recommendations.`,
    });

    const prompt = `Draft: ${JSON.stringify(draft)}

Generate an editable planning recommendation. Use the existing draft fields when present, and improve the rest only when the evidence is strong.
Return strictly valid JSON.`;

    const result = await model.generateContent(prompt);
    const parsed = safeJsonParse(result.response.text());

    if (!parsed) return fallback;

    return {
      ...fallback,
      ...parsed,
      source: "Gemini",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : fallback.confidence,
      estimatedHours: typeof parsed.estimatedHours === "number" ? parsed.estimatedHours : fallback.estimatedHours,
      estimatedHoursConfidence:
        typeof parsed.estimatedHoursConfidence === "number"
          ? parsed.estimatedHoursConfidence
          : fallback.estimatedHoursConfidence,
      complexity: typeof parsed.complexity === "number" ? parsed.complexity : fallback.complexity,
      subtaskCount:
        typeof parsed.subtaskCount === "number" ? parsed.subtaskCount : parsed.subtasks?.length ?? fallback.subtaskCount,
      subtasks: Array.isArray(parsed.subtasks) && parsed.subtasks.length ? parsed.subtasks : fallback.subtasks,
      assumptions: Array.isArray(parsed.assumptions) && parsed.assumptions.length ? parsed.assumptions : fallback.assumptions,
    };
  } catch (error) {
    console.error("[planner] Gemini enhancement failed", error);
    return fallback;
  }
}

