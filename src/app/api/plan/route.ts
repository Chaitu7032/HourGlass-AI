import { NextResponse } from "next/server";
import { analyzeCommitmentDraft } from "@/lib/agents/planner-server";
import type { CommitmentDraft } from "@/lib/agents/planner-core";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<CommitmentDraft>;
    const draft: CommitmentDraft = {
      title: body.title ?? "",
      description: body.description ?? "",
      deadline: body.deadline,
      estimatedHours: body.estimatedHours ?? null,
      priority: body.priority ?? null,
      category: body.category ?? null,
      complexity: body.complexity ?? null,
    };

    if (!draft.title.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const suggestion = await analyzeCommitmentDraft(draft);
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("[plan]", error);
    return NextResponse.json({ error: "Planning failed" }, { status: 500 });
  }
}

