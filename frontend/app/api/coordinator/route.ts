import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { runAgent } from "@/lib/backend";
import { addDraft } from "@/lib/store";
import { AgentType } from "@/lib/types";

const VALID_AGENTS: AgentType[] = ["grading", "lesson-plan", "reporting"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agent, input, rubric } = body as {
    agent: AgentType;
    input: string;
    rubric?: string;
  };

  if (!VALID_AGENTS.includes(agent)) {
    return NextResponse.json({ error: "unknown agent" }, { status: 400 });
  }
  if (!input || !input.trim()) {
    return NextResponse.json({ error: "input required" }, { status: 400 });
  }

  const result = await runAgent(agent, input.trim(), rubric?.trim() || undefined);
  const draft = {
    ...result.draft,
    id: result.engine === "backend" ? result.draft.id : randomUUID(),
  };
  addDraft({ ...draft, warnings: draft.warnings ?? [] });

  return NextResponse.json({
    ...draft,
    engine: result.engine,
    engineError: result.error ?? null,
  });
}
