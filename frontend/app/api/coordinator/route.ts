import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { runAgent } from "@/lib/agents";
import { addDraft } from "@/lib/store";
import { AgentType, Draft } from "@/lib/types";

const VALID_AGENTS: AgentType[] = ["grading", "lesson-plan", "reporting"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agent, input } = body as { agent: AgentType; input: string };

  if (!VALID_AGENTS.includes(agent)) {
    return NextResponse.json({ error: "unknown agent" }, { status: 400 });
  }
  if (!input || !input.trim()) {
    return NextResponse.json({ error: "input required" }, { status: 400 });
  }

  const draft: Draft = {
    id: randomUUID(),
    agent,
    input,
    output: runAgent(agent, input),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  addDraft(draft);

  return NextResponse.json(draft);
}
