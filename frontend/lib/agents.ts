import { AgentType } from "./types";

// Mock agent responses. Swap each function body for a real Claude/Gemini
// call when API keys are wired up — call signature stays the same.

function gradingAgent(input: string): string {
  return [
    "คะแนนโดยประมาณ: 7.5/10",
    "จุดเด่น: ตอบตรงคำถาม มีตัวอย่างประกอบ",
    "ควรปรับปรุง: อธิบายเหตุผลรองรับคำตอบให้ละเอียดขึ้น",
    "",
    `(อ้างอิงจากคำตอบนักเรียน: "${truncate(input)}")`,
  ].join("\n");
}

function lessonPlanAgent(input: string): string {
  return [
    "แผนการสอน (ร่าง) — 50 นาที",
    "1) นำเข้าสู่บทเรียน (10 นาที) — ตั้งคำถามกระตุ้นความสนใจ",
    "2) กิจกรรมหลัก (25 นาที) — ให้นักเรียนลงมือทำโจทย์เป็นกลุ่ม",
    "3) สรุปและประเมินผล (15 นาที) — quiz ท้ายชั่วโมง",
    "",
    `(อิงหัวข้อ/มาตรฐานที่ระบุ: "${truncate(input)}")`,
  ].join("\n");
}

function reportingAgent(input: string): string {
  return [
    "ร่างข้อความถึงผู้ปกครอง:",
    `เรียนผู้ปกครอง ขอรายงานความก้าวหน้าของนักเรียนโดยสรุปดังนี้ — ${truncate(
      input
    )}`,
    "",
    "กรุณาตรวจทานก่อนส่งจริง (human-in-the-loop)",
  ].join("\n");
}

const AGENTS: Record<AgentType, (input: string) => string> = {
  grading: gradingAgent,
  "lesson-plan": lessonPlanAgent,
  reporting: reportingAgent,
};

export function runAgent(agent: AgentType, input: string): string {
  return AGENTS[agent](input);
}

function truncate(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}
