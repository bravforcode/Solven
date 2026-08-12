import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { runAgent } from "@/lib/backend";
import { addDraft } from "@/lib/store";
import { AgentType } from "@/lib/types";

const VALID_AGENTS: AgentType[] = ["grading", "lesson-plan", "reporting"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agent, input, rubric, client_task_id } = body as {
    agent: AgentType;
    input: string;
    rubric?: string;
    client_task_id?: string;
  };

  if (!VALID_AGENTS.includes(agent)) {
    return NextResponse.json({ error: "unknown agent" }, { status: 400 });
  }
  if (!input || !input.trim()) {
    return NextResponse.json({ error: "input required" }, { status: 400 });
  }

  const result = await runAgent(
    agent,
    input.trim(),
    rubric?.trim() || undefined,
    client_task_id || undefined
  );
  const draft = {
    ...result.draft,
    id: result.engine === "backend" ? result.draft.id : randomUUID(),
    engine: result.engine,
  };
  addDraft({ ...draft, warnings: draft.warnings ?? [] });

  return NextResponse.json({
    ...draft,
    engineError: result.error ?? null,
  });
}
