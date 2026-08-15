import { AgentType, Draft } from "./types";

// Try the real Solven backend first (Appendix A architecture). Production
// (default) fails closed: backend errors surface as errors and never create a
// draft. The deterministic local mock is available ONLY when
// NEXT_PUBLIC_SOLVEN_MODE=demo (build-time constant for NEXT_PUBLIC_* vars).

// SOLVEN_BACKEND_URL is server-only and read at RUNTIME (compose sets
// http://backend:8000 — service DNS). NEXT_PUBLIC_* is baked at build time
// and kept as a fallback for local dev without compose.
const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

// Demo mode is the ONLY mode that may fabricate local mock drafts when the
// backend is unreachable.
const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

// Bearer token for the backend — server-side only (Next.js API routes).
// Never shipped to the browser.
const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

export type RunResult =
  | { ok: true; engine: "backend" | "mock"; draft: Draft; error?: string }
  | { ok: false; error: string };

export interface BackendPrincipal {
  teacherId: string;
  tenant?: string;
  role?: string;
  orgName?: string;
}

/** Forward the verified BFF principal to the backend (server-to-server). */
function principalHeaders(principal?: BackendPrincipal): Record<string, string> {
  if (!principal) return {};
  const headers: Record<string, string> = {
    "x-solven-principal": principal.teacherId,
  };
  if (principal.tenant) headers["x-solven-tenant"] = principal.tenant;
  if (principal.role) headers["x-solven-role"] = principal.role;
  if (principal.orgName) headers["x-solven-org-name"] = principal.orgName;
  return headers;
}

export async function runAgent(
  agent: AgentType,
  input: string,
  rubric?: string,
  clientTaskId?: string,
  principal?: BackendPrincipal
): Promise<RunResult> {
  try {
    const res = await fetch(`${API_URL}/api/coordinator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        ...principalHeaders(principal),
      },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        agent,
        input,
        rubric: rubric || undefined,
        client_task_id: clientTaskId || undefined,
      }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    const d = await res.json();
    return {
      ok: true,
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
    const message = err instanceof Error ? err.message : String(err);
    if (!DEMO_MODE) {
      // fail closed: surface backend failure, never fabricate a draft
      return { ok: false, error: message };
    }
    // local fallback: deterministic mock, same shape (demo mode only)
    return {
      ok: true,
      engine: "mock",
      error: message,
      draft: {
        id: crypto.randomUUID(),
        agent,
        input,
        output: localMock(agent, input),
        status: "pending",
        warnings: ["รันด้วย mock ในเครื่อง (ไม่พบ backend)", ...mockGuardrailWarnings(localMock(agent, input))],
        createdAt: new Date().toISOString(),
      },
    };
  }
}

/** Mirror of backend guardrail.py PII rules so the offline/mock demo shows real trust signals. */
export function mockGuardrailWarnings(output: string): string[] {
  const warnings: string[] = [];
  if (/0\d{8,9}(?!\d)/.test(output)) warnings.push("ตรวจพบเบอร์โทรในผลลัพธ์ — ควรตัดออกก่อนใช้งาน");
  if (/\d{13}(?!\d)/.test(output)) warnings.push("ตรวจพบเลขบัตรประชาชนในผลลัพธ์ — ควรตัดออกก่อนใช้งาน");
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(output)) warnings.push("ตรวจพบอีเมลในผลลัพธ์ — ควรตัดออกก่อนใช้งาน");
  if (!/ร่าง|ตรวจทาน/.test(output)) warnings.push("ผลลัพธ์ไม่มีข้อความเตือนว่าเป็นร่าง (human-in-the-loop)");
  return warnings;
}

export async function patchDraft(
  id: string,
  status: "approved" | "rejected",
  principal?: BackendPrincipal
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/drafts/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        ...principalHeaders(principal),
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** T1-03: read drafts from the authoritative backend (scoped by principal). */
export async function listBackendDrafts(
  principal: BackendPrincipal
): Promise<Draft[]> {
  const res = await fetch(`${API_URL}/api/drafts`, {
    method: "GET",
    headers: {
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...principalHeaders(principal),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const rows = (await res.json()) as Array<{
    id: string;
    agent: AgentType;
    input: string;
    output: string;
    status: Draft["status"];
    warnings?: string[];
    createdAt: string;
  }>;
  return rows.map((d) => ({
    id: d.id,
    agent: d.agent,
    input: d.input,
    output: d.output,
    status: d.status,
    warnings: d.warnings ?? [],
    createdAt: d.createdAt,
    engine: "backend" as const,
    teacherId: principal.teacherId,
  }));
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
