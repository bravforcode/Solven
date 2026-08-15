import { describe, expect, it } from "vitest";
import { mockGuardrailWarnings } from "@/lib/backend";

describe("mockGuardrailWarnings (mirror of backend guardrail.py)", () => {
  it("flags Thai phone numbers", () => {
    const w = mockGuardrailWarnings("ติดต่อ 0812345678 ได้เลย (ร่าง)");
    expect(w.some((x) => x.includes("เบอร์โทร"))).toBe(true);
  });

  it("flags 13-digit citizen IDs", () => {
    const w = mockGuardrailWarnings("เลขบัตร 1100700123456 ครับ (ร่าง)");
    expect(w.some((x) => x.includes("บัตรประชาชน"))).toBe(true);
  });

  it("flags email addresses", () => {
    const w = mockGuardrailWarnings("อีเมล a@b.co.th (ร่าง)");
    expect(w.some((x) => x.includes("อีเมล"))).toBe(true);
  });

  it("flags missing human-in-the-loop reminder", () => {
    const w = mockGuardrailWarnings("ผลการตรวจยอดเยี่ยมมาก");
    expect(w.some((x) => x.includes("ร่าง"))).toBe(true);
  });

  it("clean output with reminder → no warnings", () => {
    expect(mockGuardrailWarnings("คะแนนโดยประมาณ: 7/10 (ร่าง ตรวจทานก่อนใช้งาน)")).toEqual([]);
  });
});
