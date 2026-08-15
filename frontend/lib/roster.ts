// Mock roster (feature 8: ห้องเรียน/รายชื่อนักเรียน) — deterministic demo data.
// Tries the backend /api/demo/roster first; falls back to the local mirror
// when the backend is unreachable (demo mode only).

export interface Student {
  id: string;
  name: string;
  gender: string;
  parentPhone: string;
}

export interface RosterClass {
  id: string;
  name: string;
  room: string;
  teacher: string;
  students: Student[];
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export const LOCAL_ROSTER: RosterClass[] = [
  {
    id: "class-p4-1",
    name: "ป.4/1",
    room: "ห้อง 1",
    teacher: "นางสาวสมหญิง ใจดี",
    students: [
      { id: "s-001", name: "เด็กชายสมชาย ใจดี", gender: "ช", parentPhone: "081-234-0001" },
      { id: "s-002", name: "เด็กหญิงสมหญิง รักเรียน", gender: "ญ", parentPhone: "081-234-0002" },
      { id: "s-003", name: "เด็กชายอนุชา แซ่ลี้", gender: "ช", parentPhone: "081-234-0003" },
      { id: "s-004", name: "เด็กหญิงพิมพ์ชนก ศรีสุข", gender: "ญ", parentPhone: "081-234-0004" },
      { id: "s-005", name: "เด็กชายธนกร วงษ์คำ", gender: "ช", parentPhone: "081-234-0005" },
    ],
  },
  {
    id: "class-p5-1",
    name: "ป.5/1",
    room: "ห้อง 2",
    teacher: "นายสมชาย มากมี",
    students: [
      { id: "s-006", name: "เด็กหญิงกนกพร ทองดี", gender: "ญ", parentPhone: "081-234-0006" },
      { id: "s-007", name: "เด็กชายวรเมธ กล้าหาญ", gender: "ช", parentPhone: "081-234-0007" },
      { id: "s-008", name: "เด็กหญิงสุชาดา พรมมา", gender: "ญ", parentPhone: "081-234-0008" },
      { id: "s-009", name: "เด็กชายณัฐพล ขันทอง", gender: "ช", parentPhone: "081-234-0009" },
      { id: "s-010", name: "เด็กหญิงมณีรัตน์ สุขสันต์", gender: "ญ", parentPhone: "081-234-0010" },
    ],
  },
  {
    id: "class-m1-1",
    name: "ม.1/1",
    room: "ห้อง 3",
    teacher: "นายประเสริฐ สุขสันต์",
    students: [
      { id: "s-011", name: "เด็กชายกิตติพงษ์ แก้วใส", gender: "ช", parentPhone: "081-234-0011" },
      { id: "s-012", name: "เด็กหญิงอรอุมา ใจบุญ", gender: "ญ", parentPhone: "081-234-0012" },
      { id: "s-013", name: "เด็กชายพีรพัฒน์ ทรัพย์เจริญ", gender: "ช", parentPhone: "081-234-0013" },
      { id: "s-014", name: "เด็กหญิงจิดาภา วัฒนา", gender: "ญ", parentPhone: "081-234-0014" },
      { id: "s-015", name: "เด็กชายศุภกร หมื่นแก้ว", gender: "ช", parentPhone: "081-234-0015" },
    ],
  },
];

export async function fetchRoster(): Promise<RosterClass[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/roster`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as RosterClass[];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_ROSTER;
  }
}