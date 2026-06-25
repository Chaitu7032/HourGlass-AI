import { NextResponse } from "next/server";
import { chatWithGemini } from "@/lib/agents/gemini";
import type { OrchestrationResult } from "@/types";

export async function POST(request: Request) {
  try {
    const { message, context } = (await request.json()) as {
      message: string;
      context?: OrchestrationResult | null;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const reply = await chatWithGemini(message, context ?? null);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[chat]", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
