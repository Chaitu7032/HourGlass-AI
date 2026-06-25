import { NextResponse } from "next/server";
import { runOrchestrationWithGemini } from "@/lib/agents/gemini";
import { saveOrchestrationToFirestore } from "@/lib/firebase/sync";
import type { Task } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tasks: Task[] = body.tasks?.length ? body.tasks : [];
    const userId: string | undefined = body.userId;

    const result = await runOrchestrationWithGemini(tasks);

    // Persist to Firestore if we have a userId
    if (userId) {
      try {
        await saveOrchestrationToFirestore(userId, result);
      } catch (persistError) {
        console.error("[orchestrate] Failed to persist to Firestore:", persistError);
        // Non-fatal — return result even if persistence fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[orchestrate]", error);
    return NextResponse.json({ error: "Orchestration failed" }, { status: 500 });
  }
}

export async function GET() {
  const result = await runOrchestrationWithGemini([]);
  return NextResponse.json(result);
}
