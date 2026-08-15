import { describe, expect, it } from "vitest";
import { loadSchool, saveSchool, SCHOOL_DEFAULTS } from "@/lib/school";

describe("school settings (localStorage-backed, node-safe)", () => {
  it("returns defaults when no storage exists (SSR/node)", () => {
    expect(loadSchool()).toEqual(SCHOOL_DEFAULTS);
  });

  it("saveSchool merges patches and never throws without window", () => {
    const next = saveSchool({ teacherName: "นายสมชาย ตั้งใจ" });
    expect(next.teacherName).toBe("นายสมชาย ตั้งใจ");
    expect(next.schoolName).toBe(SCHOOL_DEFAULTS.schoolName); // untouched field
  });
});
