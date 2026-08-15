// Mock notification feed (feature 3: ศูนย์แจ้งเตือน) — deterministic demo data.
// Mirrors backend /api/demo/notifications. Read state is kept in localStorage
// so the demo shows real interaction (mark-as-read persists).

export interface Notification {
  id: string;
  type: "draft_ready" | "guardrail" | "quota" | "billing" | "system";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

const READ_KEY = "solven-notifications-read";

function localNotifications(): Notification[] {
  const now = Date.now();
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  return [
    { id: "ntf-001", type: "draft_ready", title: "ร่างผลการตรวจงานพร้อมตรวจทาน", body: "งานตรวจการบ้านวิชาคณิตศาสตร์ ป.5/1 เสร็จแล้ว 1 รายการ รอการอนุมัติ", createdAt: ago(12), read: false, link: "/drafts?agent=grading" },
    { id: "ntf-002", type: "guardrail", title: "การ์ดกันความผิดพลาดแจ้งเตือน", body: "ตรวจพบเบอร์โทรในผลลัพธ์การตรวจงาน — ถูกกักกัน (quarantine) รอการแก้ไข", createdAt: ago(45), read: false, link: "/drafts?status=quarantined" },
    { id: "ntf-003", type: "quota", title: "โควตาการใช้งานใกล้เต็ม", body: "โควตาเดือนนี้ใช้ไป 80% (400/500 หน่วย) — ติดต่อผู้ดูแลเพื่อเพิ่มแพ็กเกจ", createdAt: ago(300), read: false, link: "/settings" },
    { id: "ntf-004", type: "billing", title: "ใบแจ้งหนี้ประจำเดือนออกแล้ว", body: "ใบแจ้งหนี้เดือนนี้: 0 บาท (โหมดสาธิต) — ดูรายละเอียดได้ที่หน้าการเงิน", createdAt: ago(1560), read: true, link: "/settings" },
    { id: "ntf-005", type: "system", title: "อัปเดตระบบ Solven v0.9", body: "เพิ่มศูนย์แจ้งเตือน, ระบบรายชื่อนักเรียน, คลังข้อสอบ และอื่นๆ อีกมากมาย", createdAt: ago(2940), read: true, link: "/about" },
  ];
}

function applyReadState(items: Notification[]): Notification[] {
  if (typeof window === "undefined") return items;
  try {
    const read = new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
    return items.map((n) => ({ ...n, read: read.has(n.id) || n.read }));
  } catch {
    return items;
  }
}

export function markNotificationRead(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const read = new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
    read.add(id);
    localStorage.setItem(READ_KEY, JSON.stringify([...read]));
  } catch {
    /* ignore */
  }
}

export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/notifications`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return applyReadState((await res.json()) as Notification[]);
  } catch {
    if (!DEMO_MODE) return [];
    return applyReadState(localNotifications());
  }
}