import { describe, expect, it } from "vitest";
import { runAgent } from "@/lib/agents";

describe("runAgent (deterministic local mocks)", () => {
  it("grading output contains a score and references the student answer", () => {
    const out = runAgent("grading", "2+2=4 เพราะนับนิ้ว");
    expect(out).toContain("คะแนนโดยประมาณ");
    expect(out).toContain("2+2=4 เพราะนับนิ้ว");
  });

  it("lesson-plan output is a structured draft", () => {
    const out = runAgent("lesson-plan", "การบวกเศษส่วน ป.5");
    expect(out).toContain("แผนการสอน");
    expect(out).toContain("50 นาที");
  });

  it("reporting output targets parents with human-in-the-loop reminder", () => {
    const out = runAgent("reporting", "อ่านหนังสือคล่องขึ้น");
    expect(out).toContain("ผู้ปกครอง");
    expect(out).toContain("ตรวจทาน");
  });

  it("truncates long inputs to 120 chars", () => {
    const long = "ก".repeat(300);
    const out = runAgent("grading", long);
    expect(out).toContain("…");
    expect(out).not.toContain(long);
  });
});
