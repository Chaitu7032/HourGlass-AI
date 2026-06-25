import { NextResponse } from "next/server";
import { runOrchestrationWithGemini } from "@/lib/agents/gemini";
import { DEMO_TASKS } from "@/lib/demo-data";
import type { Task } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tasks: Task[] = body.tasks?.length ? body.tasks : DEMO_TASKS;

    const result = await runOrchestrationWithGemini(tasks);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[orchestrate]", error);
    return NextResponse.json({ error: "Orchestration failed" }, { status: 500 });
  }
}

export async function GET() {
  const result = await runOrchestrationWithGemini(DEMO_TASKS);
  return NextResponse.json(result);
}
