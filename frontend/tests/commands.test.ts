import { describe, expect, it, vi } from "vitest";
import {
  buildCommands,
  filterCommands,
  type CommandActions,
} from "@/lib/commands";

function actions(): CommandActions {
  return {
    goCreate: vi.fn(),
    goQueue: vi.fn(),
    goDocs: vi.fn(),
    goSettings: vi.fn(),
    printCurrent: vi.fn(),
    setStatusFilter: vi.fn(),
    setAgentFilter: vi.fn(),
    resetFilters: vi.fn(),
    seedDemo: vi.fn(),
  };
}

describe("filterCommands (pure)", () => {
  const items = buildCommands(actions());

  it("empty query returns everything", () => {
    expect(filterCommands(items, "  ")).toHaveLength(items.length);
  });

  it("matches label text", () => {
    const res = filterCommands(items, "คิวตรวจ");
    expect(res.map((c) => c.id)).toContain("go-queue");
  });

  it("matches keywords (english)", () => {
    const res = filterCommands(items, "approved");
    expect(res.map((c) => c.id)).toEqual(["filter-approved"]);
  });

  it("is case-insensitive and trims", () => {
    const res = filterCommands(items, "  SETTINGS ");
    expect(res.map((c) => c.id)).toContain("go-settings");
  });

  it("no match → empty", () => {
    expect(filterCommands(items, "zzz-not-a-command")).toEqual([]);
  });
});

describe("buildCommands", () => {
  it("covers all groups and fires actions", () => {
    const a = actions();
    const items = buildCommands(a);
    expect(items).toHaveLength(13);
    const groups = new Set(items.map((c) => c.group));
    expect(groups).toEqual(new Set(["ไปยังหน้า", "เอกสาร", "สร้างงาน", "กรองคิว", "ข้อมูล"]));

    items.find((c) => c.id === "create-grading")!.onSelect();
    expect(a.goCreate).toHaveBeenCalledWith("grading");

    items.find((c) => c.id === "filter-pending")!.onSelect();
    expect(a.setStatusFilter).toHaveBeenCalledWith("pending");
  });
});
