// Mock LLM-judge feedback (feature 13: ระบบให้คะแนนคุณภาพผลลัพธ์).
// Mirrors backend /api/demo/judge. Ratings persist to localStorage so the
// demo shows real usage (teachers rate drafts, ratings accumulate).

export interface JudgeResult {
  score: number; // 0-100
  verdict: "ผ่าน" | "ต้องปรับปรุง";
  reasons: string[];
  suggestions: string[];
  generatedBy: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

const RATINGS_KEY = "solven-feedback-ratings";

export interface FeedbackRating {
  draftId: string;
  stars: number; // 1-5
  comment: string;
  createdAt: string;
}

export function saveRating(rating: FeedbackRating): void {
  if (typeof window === "undefined") return;
  try {
    const all: FeedbackRating[] = JSON.parse(
      localStorage.getItem(RATINGS_KEY) ?? "[]"
    );
    all.push(rating);
    localStorage.setItem(RATINGS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function loadRatings(): FeedbackRating[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? "[]") as FeedbackRating[];
  } catch {
    return [];
  }
}

export function localJudge(output: string): JudgeResult {
  const hasDraft = /ร่าง|ตรวจทาน/.test(output);
  const hasPii = /0\d{8,9}(?!\d)|[\w.+-]+@[\w-]+\.[\w.-]+/.test(output);
  const length = output.length;
  let score = 70;
  const reasons: string[] = [];
  const suggestions: string[] = [];
  if (hasDraft) {
    score += 15;
    reasons.push("มีข้อความเตือนว่าเป็นร่าง (human-in-the-loop)");
  } else {
    suggestions.push("เพิ่มข้อความเตือนว่าเป็นร่างก่อนใช้งาน");
  }
  if (!hasPii) {
    score += 10;
    reasons.push("ไม่พบข้อมูลส่วนบุคคล (PII) ในผลลัพธ์");
  } else {
    suggestions.push("ตัดข้อมูลส่วนบุคคลออกก่อนใช้งาน");
  }
  if (length >= 80) {
    score += 5;
    reasons.push("เนื้อหาครบถ้วนเพียงพอ");
  } else {
    suggestions.push("เพิ่มรายละเอียดให้ครบถ้วนยิ่งขึ้น");
  }
  return {
    score: Math.min(100, score),
    verdict: score >= 80 ? "ผ่าน" : "ต้องปรับปรุง",
    reasons,
    suggestions,
    generatedBy: "mock-llm-judge-v1",
  };
}

export async function judgeOutput(output: string): Promise<JudgeResult> {
  try {
    const res = await fetch(`${API_URL}/api/demo/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ output }),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as JudgeResult;
  } catch {
    if (!DEMO_MODE) throw new Error("backend unreachable");
    return localJudge(output);
  }
}