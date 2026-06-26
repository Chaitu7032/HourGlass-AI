import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { runOrchestrationWithGemini } from "@/lib/agents/gemini";
import { SESSION_COOKIE_NAME, verifyFirebaseToken } from "@/lib/auth/firebase-token";
import { saveOrchestrationToFirestore } from "@/lib/firebase/sync";
import type { Task } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tasks: Task[] = body.tasks?.length ? body.tasks : [];
    const userId: string | undefined = body.userId;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyFirebaseToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userId && userId !== session.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await runOrchestrationWithGemini(tasks);

    try {
      await saveOrchestrationToFirestore(session.uid, result);
    } catch (persistError) {
      console.error("[orchestrate] Failed to persist to Firestore:", persistError);
      // Non-fatal - return result even if persistence fails
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
