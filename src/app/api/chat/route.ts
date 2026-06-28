import { NextResponse } from "next/server";
import { chatWithChiefOfStaff } from "@/lib/ai/ai-chief-of-staff";
import type { OrchestrationResult, Task, UserProfile } from "@/types";
import type { ExecutionProfile } from "@/types/execution-profile";

export async function POST(request: Request) {
  try {
    const { message, context } = (await request.json()) as {
      message: string;
      context?: {
        orchestration?: OrchestrationResult | null;
        tasks?: Task[];
        userProfile?: UserProfile | null;
        executionProfile?: ExecutionProfile | null;
        conversationHistory?: Array<{
          id: string;
          role: "user" | "assistant" | "system";
          content: string;
          timestamp: string;
        }>;
        currentScreen?: string;
      };
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const reply = await chatWithChiefOfStaff(
      message,
      context?.userProfile ?? null,
      context?.executionProfile ?? null,
      context?.orchestration ?? null,
      context?.tasks ?? [],
      context?.currentScreen ?? "dashboard_chat",
      context?.conversationHistory ?? []
    );

    return NextResponse.json({
      reply: [
        reply.summary,
        `Top priorities: ${reply.topPriorities.join(", ") || "None"}`,
        `Risk: ${reply.riskAnalysis}`,
        `Next action: ${reply.nextAction}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      structuredReply: reply,
    });
  } catch (error) {
    console.error("[chat]", error);
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
