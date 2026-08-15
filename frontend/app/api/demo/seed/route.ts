import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/bffAuth";
import { addDraft } from "@/lib/store";
import { Draft } from "@/lib/types";

// BFF proxy to the backend demo-seed endpoint (dev/demo only — the backend
// hard-404s it in production). Demo data is deterministic and clearly
// synthetic (PDPA).
//
// Local fallback (2026-08-15): when the backend is unreachable and the app
// runs in demo mode, seed the in-memory store directly with a mirror of the
// backend dataset (drafts across all workflow states: pending/approved/
// rejected/quarantined + guardrail warnings). Fixed ids (demo-draft-NNN)
// match the backend seed so a later backend recovery never duplicates rows
// (store.addDraft replaces on id conflict).
const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

interface LocalSeedRow {
  agent: Draft["agent"];
  input: string;
  output: string;
  status: Draft["status"];
  warnings: string[];
}

// Mirror of backend/app/seed.py _DEMO_DRAFTS (18 rows, all 4 statuses, every
// agent has approved drafts so the Document Studio has sources for all types).
const LOCAL_DEMO_DRAFTS: LocalSeedRow[] = [
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): 2+2=4 เพราะเรานับนิ้วรวมกันได้ 4",
    output:
      "คะแนนโดยประมาณ: 4/4 — ครบถ้วน (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: อธิบายเหตุผลได้ถูกต้อง\nควรปรับปรุง: เขียนเครื่องหมายเท่ากับให้ชัดขึ้น",
    status: "pending",
    warnings: [],
  },
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): ประเทศไทยมีประชากรประมาณ 66 ล้านคน",
    output:
      "คะแนนโดยประมาณ: 3/4 — ตัวเลขถูกต้องแต่ขาดเหตุผล (ร่าง ตรวจทาน)\nจุดเด่น: จำข้อมูลหลักได้\nควรปรับปรุง: ระบุแหล่งที่มา/ปีของข้อมูล",
    status: "pending",
    warnings: [],
  },
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): สังคมศึกษา — แม่น้ำเจ้าพระยาไหลลงอ่าวไทย",
    output:
      "คะแนนโดยประมาณ: 3/3 — ตอบถูกต้องครบถ้วน (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: ระบุทิศทางการไหลได้ถูกต้อง\nควรปรับปรุง: เพิ่มชื่อจังหวัดที่แม่น้ำไหลผ่าน",
    status: "pending",
    warnings: [],
  },
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): เศษส่วน 1/2 กับ 2/4 เท่ากันเพราะตัดทอนได้",
    output:
      "คะแนนโดยประมาณ: 4/4 — เข้าใจแนวคิดการตัดทอน (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: อธิบายด้วยหลักการ\nควรปรับปรุง: ไม่มีนัยสำคัญ",
    status: "approved",
    warnings: [],
  },
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): พืชหายใจด้วยปากใบ (stomata) บริเวณใต้ใบ",
    output:
      "คะแนนโดยประมาณ: 4/4 — ถูกต้องและใช้ศัพท์วิทยาศาสตร์ (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: ใช้คำศัพท์เฉพาะได้ถูกต้อง\nควรปรับปรุง: อธิบายหน้าที่ของปากใบเพิ่ม",
    status: "approved",
    warnings: [],
  },
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): 5 x 8 = 40 เพราะ 5 x 4 = 20 แล้วคูณสอง",
    output:
      "คะแนนโดยประมาณ: 4/4 — วิธีคิดถูกต้อง (ร่าง ตรวจทานก่อนใช้งาน)\nจุดเด่น: แสดงวิธีคิดเป็นขั้นตอน\nควรปรับปรุง: ไม่มีนัยสำคัญ",
    status: "approved",
    warnings: [],
  },
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): พื้นที่สามเหลี่ยม = ฐาน x สูง",
    output:
      "คะแนนโดยประมาณ: 2/4 — สูตรถูกแต่ลืมหารสอง (ร่าง ตรวจทาน)\nจุดเด่น: จำสูตรได้\nควรปรับปรุง: ตรวจสูตรพื้นที่สามเหลี่ยมอีกครั้ง",
    status: "rejected",
    warnings: [],
  },
  {
    agent: "grading",
    input: "คำตอบนักเรียน (ตัวอย่าง): อักษรไทยมี 44 ตัว",
    output:
      "คะแนนโดยประมาณ: 3/4 — ถูกต้อง (ร่าง ตรวจทานก่อนใช้งาน)\nติดต่อครูผู้ดูแลระบบ: 0812345678 เพื่อสอบถามเกณฑ์เพิ่มเติม",
    status: "quarantined",
    warnings: ["ตรวจพบเบอร์โทรในผลลัพธ์ — ควรตัดออกก่อนใช้งาน"],
  },
  {
    agent: "lesson-plan",
    input:
      "หัวข้อ/ตัวชี้วัด: การบวกเศษส่วนตัวส่วนเท่ากัน\nระดับชั้น: ป.5\nจำนวนนักเรียน: 30\nเวลาที่มี: 60 นาที",
    output:
      "แผนการสอน (ร่าง): 1) นำเข้าบทเรียน 10 นาที 2) กิจกรรมหลัก 35 นาที (จับคู่บวกเศษส่วน) 3) สรุป+วัดผล 15 นาที (แบบฝึกหัดท้ายชั่วโมง) — ตรวจทานก่อนใช้งาน",
    status: "pending",
    warnings: [],
  },
  {
    agent: "lesson-plan",
    input:
      "หัวข้อ/ตัวชี้วัด: สมการเชิงเส้นตัวแปรเดียว\nระดับชั้น: ม.1\nจำนวนนักเรียน: 28\nเวลาที่มี: 100 นาที",
    output:
      "แผนการสอน (ร่าง): 1) ทบทวนสมการ 15 นาที 2) สอนการย้ายข้าง 45 นาที 3) ฝึกทำโจทย์กลุ่ม 30 นาที 4) สรุป+แบบฝึกหัด 10 นาที — ตรวจทานก่อนใช้งาน",
    status: "pending",
    warnings: [],
  },
  {
    agent: "lesson-plan",
    input:
      "หัวข้อ/ตัวชี้วัด: วัฏจักรน้ำ\nระดับชั้น: ป.4\nจำนวนนักเรียน: 25\nเวลาที่มี: 90 นาที",
    output:
      "แผนการสอน (ร่าง): 1) สาธิตการระเหย 15 นาที 2) กิจกรรมกลุ่มวาดวัฏจักร 45 นาที 3) นำเสนอ+อภิปราย 30 นาที — ตรวจทานก่อนใช้งาน",
    status: "approved",
    warnings: [],
  },
  {
    agent: "lesson-plan",
    input:
      "หัวข้อ/ตัวชี้วัด: การอ่านจับใจความสำคัญ\nระดับชั้น: ป.4\nจำนวนนักเรียน: 25\nเวลาที่มี: 60 นาที",
    output:
      "แผนการสอน (ร่าง): 1) อ่านนิทานร่วมกัน 15 นาที 2) ฝึกจับใจความรายกลุ่ม 30 นาที 3) นำเสนอ+สรุป 15 นาที — ตรวจทานก่อนใช้งาน",
    status: "approved",
    warnings: [],
  },
  {
    agent: "lesson-plan",
    input:
      "หัวข้อ/ตัวชี้วัด: ประวัติศาสตร์อยุธยา\nระดับชั้น: ป.5\nจำนวนนักเรียน: 30\nเวลาที่มี: 60 นาที",
    output:
      "แผนการสอน (ร่าง): 1) ดูวิดีโอ 20 นาที 2) บรรยาย 30 นาที 3) ทำแบบทดสอบ 10 นาที — ตรวจทานก่อนใช้งาน",
    status: "rejected",
    warnings: [],
  },
  {
    agent: "reporting",
    input:
      "ผู้รับ: ผู้ปกครอง\nน้ำเสียง: สุภาพ เป็นทางการ\nสรุปความก้าวหน้า: อ่านหนังสือคล่องขึ้น ส่งงานตรงเวลามากขึ้น",
    output:
      "รายงาน (ร่าง): ด.ช.ตัวอย่างมีความก้าวหน้าด้านการอ่านหนังสืออย่างชัดเจน และส่งงานตรงเวลามากขึ้น ขอขอบคุณผู้ปกครองที่สนับสนุน — ตรวจทานก่อนส่ง",
    status: "pending",
    warnings: [],
  },
  {
    agent: "reporting",
    input:
      "ผู้รับ: กรรมการสถานศึกษา\nน้ำเสียง: เป็นทางการ\nสรุปความก้าวหน้า: ห้องสมุดโรงเรียนได้รับการปรับปรุง",
    output:
      "รายงาน (ร่าง): ขอรายงานความคืบหน้าการปรับปรุงห้องสมุดโรงเรียนให้กรรมการสถานศึกษาทราบ — ตรวจทานก่อนส่ง",
    status: "pending",
    warnings: [],
  },
  {
    agent: "reporting",
    input:
      "ผู้รับ: ผู้ปกครอง\nน้ำเสียง: อบอุ่น เป็นกันเอง\nสรุปความก้าวหน้า: กล้าแสดงออกมากขึ้น เข้าร่วมกิจกรรมสม่ำเสมอ",
    output:
      "รายงาน (ร่าง): ด.ญ.ตัวอย่างกล้าแสดงออกมากขึ้นและเข้าร่วมกิจกรรมของห้องอย่างสม่ำเสมอ เป็นที่ชื่นชมของเพื่อนและครู — ตรวจทานก่อนส่ง",
    status: "approved",
    warnings: [],
  },
  {
    agent: "reporting",
    input:
      "ผู้รับ: ผู้บริหาร\nน้ำเสียง: เป็นทางการ\nสรุปความก้าวหน้า: ผลการเรียนห้อง ป.5/1 ดีขึ้นจากมาตรการส่งเสริมการอ่าน",
    output:
      "รายงาน (ร่าง): ห้อง ป.5/1 มีผลการเรียนดีขึ้นอย่างเห็นได้ชัดจากมาตรการส่งเสริมการอ่านที่ดำเนินการในภาคเรียนนี้ — ตรวจทานก่อนส่ง",
    status: "approved",
    warnings: [],
  },
  {
    agent: "reporting",
    input:
      "ผู้รับ: ผู้ปกครอง\nน้ำเสียง: กระชับ\nสรุปความก้าวหน้า: ต้องปรับปรุงเรื่องการบ้าน",
    output:
      "รายงาน (ร่าง): นักเรียนต้องปรับปรุงเรื่องการส่งการบ้าน ขอความร่วมมือผู้ปกครองกำกับดูแลที่บ้าน — ตรวจทานก่อนส่ง",
    status: "rejected",
    warnings: [],
  },
  {
    agent: "reporting",
    input:
      "ผู้รับ: ผู้บริหาร\nน้ำเสียง: เป็นทางการ\nสรุปความก้าวหน้า: ผลการเรียนห้อง ป.5/1 ดีขึ้น",
    output:
      "รายงาน (ร่าง): ห้อง ป.5/1 มีผลการเรียนดีขึ้น สอบถามเพิ่มเติม: demo@example.com — ตรวจทานก่อนส่ง",
    status: "quarantined",
    warnings: ["ตรวจพบอีเมลในผลลัพธ์ — ควรตัดออกก่อนใช้งาน"],
  },
];

function seedLocalStore(teacherId: string): number {
  const now = new Date().toISOString();
  LOCAL_DEMO_DRAFTS.forEach((row, idx) => {
    addDraft({
      id: `demo-draft-${String(idx + 1).padStart(3, "0")}`,
      agent: row.agent,
      input: row.input,
      output: row.output,
      status: row.status,
      warnings: row.warnings,
      createdAt: now,
      engine: "mock",
      teacherId,
    });
  });
  return LOCAL_DEMO_DRAFTS.length;
}

export async function POST() {
  const guard = await requirePrincipal();
  if (!guard.ok) return guard.response;

  try {
    const res = await fetch(`${API_URL}/api/demo/seed`, {
      method: "POST",
      headers: {
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        "x-solven-principal": guard.principal.teacherId,
        ...(guard.principal.tenant
          ? { "x-solven-tenant": guard.principal.tenant }
          : {}),
        ...(guard.principal.role
          ? { "x-solven-role": guard.principal.role }
          : {}),
        ...(guard.principal.orgName
          ? { "x-solven-org-name": guard.principal.orgName }
          : {}),
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `backend ${res.status}` },
        { status: res.status }
      );
    }
    const body = (await res.json()) as { seeded?: number };
    return NextResponse.json({ seeded: body.seeded ?? 0 });
  } catch {
    // backend unreachable — in demo mode seed the local store so the queue
    // still shows the full workflow (pending/approved/rejected/quarantined);
    // otherwise surface the backend failure (fail closed).
    if (!DEMO_MODE) {
      return NextResponse.json({ error: "backend unavailable" }, { status: 502 });
    }
    const seeded = seedLocalStore(guard.principal.teacherId);
    return NextResponse.json({ seeded, engine: "mock" });
  }
}
