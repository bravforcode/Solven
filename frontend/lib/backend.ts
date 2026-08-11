import { AgentType, Draft } from "./types";

// Try the real Solven backend first (Appendix A architecture); fall back to
// the deterministic local mock so the demo always works (e.g. demo without
// the Python server running). The engine actually used is returned honestly
// and displayed in the UI.

const API_URL =
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ?? "http://localhost:8000";

// Bearer token for the backend — server-side only (Next.js API routes).
// Never shipped to the browser.
const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

export interface RunResult {
  draft: Draft;
  engine: "backend" | "mock";
  error?: string;
}

export async function runAgent(
  agent: AgentType,
  input: string,
  rubric?: string
): Promise<RunResult> {
  try {
    const res = await fetch(`${API_URL}/api/coordinator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ agent, input, rubric: rubric || undefined }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    const d = await res.json();
    return {
      engine: "backend",
      draft: {
        id: d.id,
        agent: d.agent,
        input: d.input,
        output: d.output,
        status: d.status,
        warnings: d.warnings ?? [],
        createdAt: d.createdAt,
      },
    };
  } catch (err) {
    // local fallback: deterministic mock, same shape
    return {
      engine: "mock",
      error: err instanceof Error ? err.message : String(err),
      draft: {
        id: crypto.randomUUID(),
        agent,
        input,
        output: localMock(agent, input),
        status: "pending",
        warnings: ["รันด้วย mock ในเครื่อง (ไม่พบ backend)"],
        createdAt: new Date().toISOString(),
      },
    };
  }
}

export function localMock(agent: AgentType, input: string): string {
  if (agent === "grading") {
    return [
      "คะแนนโดยประมาณ: 7.5/10",
      "จุดเด่น: ตอบตรงคำถาม มีตัวอย่างประกอบ",
      "ควรปรับปรุง: อธิบายเหตุผลรองรับคำตอบให้ละเอียดขึ้น",
      "",
      `(อ้างอิงจากคำตอบนักเรียน: "${truncate(input)}")`,
    ].join("\n");
  }
  if (agent === "lesson-plan") {
    return [
      "แผนการสอน (ร่าง) — 50 นาที",
      "1) นำเข้าสู่บทเรียน (10 นาที) — ตั้งคำถามกระตุ้นความสนใจ",
      "2) กิจกรรมหลัก (25 นาที) — ให้นักเรียนลงมือทำโจทย์เป็นกลุ่ม",
      "3) สรุปและประเมินผล (15 นาที) — quiz ท้ายชั่วโมง",
      "",
      `(อิงหัวข้อ/มาตรฐานที่ระบุ: "${truncate(input)}")`,
    ].join("\n");
  }
  return [
    "ร่างข้อความถึงผู้ปกครอง:",
    `เรียนผู้ปกครอง ขอรายงานความก้าวหน้าของนักเรียนโดยสรุปดังนี้ — ${truncate(
      input
    )}`,
    "",
    "กรุณาตรวจทานก่อนส่งจริง (human-in-the-loop)",
  ].join("\n");
}

function truncate(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}
