import type { ReactNode } from "react";
import { AGENT_LABEL } from "@/lib/types";
import type { AgentType } from "@/lib/types";

export interface CommandItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export type StatusFilter = "all" | "pending" | "approved" | "rejected";

export interface CommandActions {
  goCreate: (agent?: AgentType) => void;
  goQueue: () => void;
  setStatusFilter: (s: StatusFilter) => void;
  setAgentFilter: (a: "all" | AgentType) => void;
  resetFilters: () => void;
  seedDemo: () => void;
}

const STATUS_LABEL: Record<Exclude<StatusFilter, "all">, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
};

/** Builds the ⌘K palette command list (group-ordered; icons optional) */
export function buildCommands(actions: CommandActions): CommandItem[] {
  const agents: AgentType[] = ["grading", "lesson-plan", "reporting"];
  return [
    {
      id: "go-create",
      group: "ไปยังหน้า",
      label: "สร้างงาน",
      hint: "1",
      keywords: "สร้าง งาน create หน้าแรก",
      onSelect: () => actions.goCreate(),
    },
    {
      id: "go-queue",
      group: "ไปยังหน้า",
      label: "คิวตรวจ",
      hint: "2",
      keywords: "คิว ตรวจ queue รออนุมัติ ร่าง",
      onSelect: () => actions.goQueue(),
    },
    ...agents.map((a): CommandItem => ({
      id: `create-${a}`,
      group: "สร้างงาน",
      label: `สร้าง: ${AGENT_LABEL[a]}`,
      keywords: `สร้าง ${AGENT_LABEL[a]} ${a}`,
      onSelect: () => actions.goCreate(a),
    })),
    {
      id: "filter-pending",
      group: "กรองคิว",
      label: "กรอง: รออนุมัติ",
      keywords: "กรอง รออนุมัติ pending",
      onSelect: () => actions.setStatusFilter("pending"),
    },
    {
      id: "filter-approved",
      group: "กรองคิว",
      label: "กรอง: อนุมัติแล้ว",
      keywords: "กรอง อนุมัติแล้ว approved",
      onSelect: () => actions.setStatusFilter("approved"),
    },
    {
      id: "filter-rejected",
      group: "กรองคิว",
      label: "กรอง: ปฏิเสธ",
      keywords: "กรอง ปฏิเสธ rejected",
      onSelect: () => actions.setStatusFilter("rejected"),
    },
    {
      id: "reset-filters",
      group: "กรองคิว",
      label: "ล้างตัวกรองทั้งหมด",
      keywords: "ล้าง กรอง reset",
      onSelect: () => actions.resetFilters(),
    },
    {
      id: "seed-demo",
      group: "ข้อมูล",
      label: "โหลดข้อมูลตัวอย่าง",
      keywords: "โหลด ข้อมูล ตัวอย่าง demo seed",
      onSelect: () => actions.seedDemo(),
    },
  ];
}

/** Pure filter — case-insensitive match on label + keywords; preserves group order */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => `${it.label} ${it.keywords ?? ""}`.toLowerCase().includes(q));
}

export { STATUS_LABEL };
