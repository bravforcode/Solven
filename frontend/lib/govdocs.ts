// Mock govdocs (งานสารบรรณ/ราชการ) — deterministic demo data.
// Tries the backend /api/demo/* endpoints first; falls back to the local
// mirrors when the backend is unreachable (demo mode only).
// Also exposes webcryptoSign(): a real browser WebCrypto SHA-256 signature
// demoing ลายเซ็นอิเล็กทรอนิกส์ (พ.ร.บ. ลายเซ็นอิเล็กทรอนิกส์ 2564).

// --- ทะเบียนหนังสือราชการเข้า-ออก ---

export interface DocEntry {
  id: string;
  regNo: string;
  type: "รับ" | "ส่ง";
  from: string;
  to: string;
  subject: string;
  date: string;
  status: "รอลงนาม" | "ลงนามแล้ว" | "ส่งแล้ว";
}

export interface DocRegister {
  entries: DocEntry[];
  summary: {
    total: number;
    incoming: number;
    outgoing: number;
    pendingSign: number;
  };
  generatedBy: string;
}

// --- สารบรรณอิเล็กทรอนิกส์ ---

export interface EdocStep {
  name: string;
  done: boolean;
  by: string;
  date: string;
}

export interface EdocDoc {
  id: string;
  title: string;
  kind: "หนังสือราชการ" | "บันทึก" | "คำสั่ง" | "ประกาศ";
  creator: string;
  status: string;
  steps: EdocStep[];
}

export interface EdocWorkflow {
  docs: EdocDoc[];
  workflowSteps: string[];
  generatedBy: string;
}

// --- รายงาน สพฐ./DMC ---

export interface ObecSummary {
  students: number;
  teachers: number;
  rooms: number;
  budget: number;
}

export interface ObecReport {
  id: string;
  name: string;
  category: "DMC" | "ข้อมูลพื้นฐาน" | "ผลสัมฤทธิ์";
  period: string;
  status: "ยังไม่ส่ง" | "ส่งแล้ว";
  generatedAt: string;
  summary: ObecSummary;
}

export interface ObecReports {
  reports: ObecReport[];
  school: string;
  obecRegion: string;
  generatedBy: string;
}

// --- จัดซื้อจัดจ้าง ---

export interface ProcurementItem {
  id: string;
  name: string;
  category: string;
  qty: number;
  unitPrice: number;
  vendor: string;
  budget: number;
  status: "รอเสนอราคา" | "เปรียบเทียบราคา" | "อนุมัติ" | "จัดซื้อแล้ว";
}

export interface ProcurementData {
  items: ProcurementItem[];
  totalBudget: number;
  fiscalYear: string;
  generatedBy: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

export const LOCAL_DOC_REGISTER: DocRegister = {
  entries: [
    { id: "reg-001", regNo: "ที่ ศธ 04001/2501", type: "รับ", from: "สพป.สุโขทัย เขต 2", to: "ผู้อำนวยการโรงเรียนบ้านสวนฝั่งสุข", subject: "แจ้งกำหนดการประชุมผู้บริหารสถานศึกษา ครั้งที่ 8/2569", date: "2026-08-14", status: "ลงนามแล้ว" },
    { id: "reg-002", regNo: "ที่ ศธ 04001/2502", type: "รับ", from: "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)", to: "โรงเรียนบ้านสวนฝั่งสุข", subject: "แนวปฏิบัติการกรอกข้อมูลนักเรียนในระบบ DMC ปีการศึกษา 2569", date: "2026-08-13", status: "รอลงนาม" },
    { id: "reg-003", regNo: "ที่ ศธ 04001/2503", type: "ส่ง", from: "โรงเรียนบ้านสวนฝั่งสุข", to: "สพป.สุโขทัย เขต 2", subject: "ส่งรายงานการใช้อินเทอร์เน็ตในสถานศึกษา ประจำเดือนกรกฎาคม 2569", date: "2026-08-12", status: "ส่งแล้ว" },
    { id: "reg-004", regNo: "ที่ ศธ 04001/2504", type: "รับ", from: "องค์การบริหารส่วนจังหวัดสุโขทัย", to: "ผู้อำนวยการโรงเรียนบ้านสวนฝั่งสุข", subject: "ขอความอนุเคราะห์สถานที่จัดกิจกรรมกีฬาเยาวชนระดับจังหวัด", date: "2026-08-11", status: "ลงนามแล้ว" },
    { id: "reg-005", regNo: "ที่ ศธ 04001/2505", type: "ส่ง", from: "โรงเรียนบ้านสวนฝั่งสุข", to: "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)", subject: "ส่งแบบรายงานข้อมูลอาคารเรียนและสิ่งก่อสร้าง (ป.ย.1)", date: "2026-08-08", status: "ส่งแล้ว" },
    { id: "reg-006", regNo: "ที่ ศธ 04001/2506", type: "รับ", from: "สพป.สุโขทัย เขต 2", to: "ครูธุรการโรงเรียนบ้านสวนฝั่งสุข", subject: "ขอให้จัดส่งสำเนาคำสั่งแต่งตั้งคณะกรรมการดำเนินงานวันเด็กแห่งชาติ 2569", date: "2026-08-07", status: "รอลงนาม" },
  ],
  summary: { total: 6, incoming: 4, outgoing: 2, pendingSign: 2 },
  generatedBy: "mock-doc-register-v1",
};

export const LOCAL_EDOC_WORKFLOW: EdocWorkflow = {
  workflowSteps: ["ร่าง", "เสนอ", "อนุมัติ", "ส่ง"],
  generatedBy: "mock-edoc-workflow-v1",
  docs: [
    {
      id: "edoc-001",
      title: "คำสั่งแต่งตั้งคณะกรรมการจัดทำแผนพัฒนาการศึกษา ปี 2570",
      kind: "คำสั่ง",
      creator: "นางสาวสมหญิง ใจดี (หัวหน้ากลุ่มงานบริหารวิชาการ)",
      status: "อนุมัติแล้ว",
      steps: [
        { name: "ร่าง", done: true, by: "นางสาวสมหญิง ใจดี", date: "2026-08-10" },
        { name: "เสนอ", done: true, by: "นางสาวสมหญิง ใจดี", date: "2026-08-11" },
        { name: "อนุมัติ", done: true, by: "นายประเสริฐ สุขสันต์ (ผู้อำนวยการ)", date: "2026-08-12" },
        { name: "ส่ง", done: true, by: "นางสาววิไลลักษณ์ ทองดี (ธุรการ)", date: "2026-08-13" },
      ],
    },
    {
      id: "edoc-002",
      title: "บันทึกข้อความขออนุมัติจัดซื้อเครื่องปรับอากาศ ห้องสมุด",
      kind: "บันทึก",
      creator: "นายสมชาย มากมี (หัวหน้ากลุ่มงานงบประมาณ)",
      status: "รออนุมัติ",
      steps: [
        { name: "ร่าง", done: true, by: "นายสมชาย มากมี", date: "2026-08-12" },
        { name: "เสนอ", done: true, by: "นายสมชาย มากมี", date: "2026-08-13" },
        { name: "อนุมัติ", done: false, by: "", date: "" },
        { name: "ส่ง", done: false, by: "", date: "" },
      ],
    },
    {
      id: "edoc-003",
      title: "ประกาศโรงเรียนเรื่อง การเปิดเรียนภาคเรียนที่ 2 ปีการศึกษา 2569",
      kind: "ประกาศ",
      creator: "นายประเสริฐ สุขสันต์ (ผู้อำนวยการ)",
      status: "รอลงนาม",
      steps: [
        { name: "ร่าง", done: true, by: "นางสาววิไลลักษณ์ ทองดี (ธุรการ)", date: "2026-08-14" },
        { name: "เสนอ", done: true, by: "นางสาววิไลลักษณ์ ทองดี (ธุรการ)", date: "2026-08-14" },
        { name: "อนุมัติ", done: false, by: "", date: "" },
        { name: "ส่ง", done: false, by: "", date: "" },
      ],
    },
    {
      id: "edoc-004",
      title: "หนังสือเชิญประชุมคณะกรรมการสถานศึกษาขั้นพื้นฐาน ครั้งที่ 3/2569",
      kind: "หนังสือราชการ",
      creator: "นางสาววิไลลักษณ์ ทองดี (ธุรการ)",
      status: "ส่งแล้ว",
      steps: [
        { name: "ร่าง", done: true, by: "นางสาววิไลลักษณ์ ทองดี", date: "2026-08-05" },
        { name: "เสนอ", done: true, by: "นางสาววิไลลักษณ์ ทองดี", date: "2026-08-06" },
        { name: "อนุมัติ", done: true, by: "นายประเสริฐ สุขสันต์ (ผู้อำนวยการ)", date: "2026-08-07" },
        { name: "ส่ง", done: true, by: "นางสาววิไลลักษณ์ ทองดี", date: "2026-08-08" },
      ],
    },
  ],
};

export const LOCAL_OBEC_REPORTS: ObecReports = {
  school: "โรงเรียนบ้านสวนฝั่งสุข",
  obecRegion: "สพป.สุโขทัย เขต 2",
  generatedBy: "mock-obec-reports-v1",
  reports: [
    { id: "rep-001", name: "รายงานข้อมูลนักเรียนรายบุคคล (DMC) ภาคเรียนที่ 1/2569", category: "DMC", period: "ภาคเรียนที่ 1/2569", status: "ยังไม่ส่ง", generatedAt: "2026-08-15T09:00:00+07:00", summary: { students: 15, teachers: 9, rooms: 6, budget: 1250000 } },
    { id: "rep-002", name: "ข้อมูลพื้นฐานสถานศึกษา (ป.ย.1) ปีการศึกษา 2569", category: "ข้อมูลพื้นฐาน", period: "ปีการศึกษา 2569", status: "ส่งแล้ว", generatedAt: "2026-07-20T10:30:00+07:00", summary: { students: 15, teachers: 9, rooms: 6, budget: 1250000 } },
    { id: "rep-003", name: "รายงานผลสัมฤทธิ์ทางการเรียน ภาคเรียนที่ 1/2569", category: "ผลสัมฤทธิ์", period: "ภาคเรียนที่ 1/2569", status: "ยังไม่ส่ง", generatedAt: "2026-08-16T08:00:00+07:00", summary: { students: 15, teachers: 9, rooms: 6, budget: 1250000 } },
    { id: "rep-004", name: "รายงานการใช้จ่ายงบประมาณรายหัว ประจำปี 2569", category: "ข้อมูลพื้นฐาน", period: "ปีการศึกษา 2569", status: "ส่งแล้ว", generatedAt: "2026-07-05T14:00:00+07:00", summary: { students: 15, teachers: 9, rooms: 6, budget: 1250000 } },
  ],
};

export const LOCAL_PROCUREMENT: ProcurementData = {
  fiscalYear: "2569",
  generatedBy: "mock-procurement-v1",
  totalBudget: 153540,
  items: [
    { id: "prc-001", name: "เครื่องปรับอากาศ ขนาด 18,000 BTU", category: "ครุภัณฑ์", qty: 2, unitPrice: 24900, vendor: "หจก.สุโขทัยแอร์เซอร์วิส", budget: 49800, status: "เปรียบเทียบราคา" },
    { id: "prc-002", name: "คอมพิวเตอร์โน้ตบุ๊ก สำหรับห้องสมุด", category: "ครุภัณฑ์", qty: 3, unitPrice: 18900, vendor: "บริษัท ไทยไอทีซัพพลาย จำกัด", budget: 56700, status: "รอเสนอราคา" },
    { id: "prc-003", name: "กระดาษ A4 80 แกรม (รีม)", category: "วัสดุสำนักงาน", qty: 60, unitPrice: 110, vendor: "ร้านสุขใจเครื่องเขียน", budget: 6600, status: "จัดซื้อแล้ว" },
    { id: "prc-004", name: "หมึกพิมพ์เลเซอร์ (ตลับ)", category: "วัสดุคอมพิวเตอร์", qty: 8, unitPrice: 1450, vendor: "บริษัท ไทยไอทีซัพพลาย จำกัด", budget: 11600, status: "อนุมัติ" },
    { id: "prc-005", name: "โต๊ะนักเรียนปรับระดับ เก้าอี้คู่", category: "ครุภัณฑ์", qty: 10, unitPrice: 2350, vendor: "หจก.เฟอร์นิเจอร์สุโขทัย", budget: 23500, status: "รอเสนอราคา" },
    { id: "prc-006", name: "พัดลมติดผนัง 16 นิ้ว", category: "วัสดุ", qty: 6, unitPrice: 890, vendor: "ร้านสุขใจเครื่องเขียน", budget: 5340, status: "จัดซื้อแล้ว" },
  ],
};

export async function fetchDocRegister(): Promise<DocRegister> {
  try {
    const res = await fetch(`${API_URL}/api/demo/doc-register`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as DocRegister;
  } catch {
    if (!DEMO_MODE) throw new Error("doc-register backend unavailable");
    return LOCAL_DOC_REGISTER;
  }
}

export async function fetchEdocWorkflow(): Promise<EdocWorkflow> {
  try {
    const res = await fetch(`${API_URL}/api/demo/edoc-workflow`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as EdocWorkflow;
  } catch {
    if (!DEMO_MODE) throw new Error("edoc-workflow backend unavailable");
    return LOCAL_EDOC_WORKFLOW;
  }
}

export async function fetchObecReports(): Promise<ObecReports> {
  try {
    const res = await fetch(`${API_URL}/api/demo/obec-reports`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as ObecReports;
  } catch {
    if (!DEMO_MODE) throw new Error("obec-reports backend unavailable");
    return LOCAL_OBEC_REPORTS;
  }
}

export async function fetchProcurement(): Promise<ProcurementData> {
  try {
    const res = await fetch(`${API_URL}/api/demo/procurement`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as ProcurementData;
  } catch {
    if (!DEMO_MODE) throw new Error("procurement backend unavailable");
    return LOCAL_PROCUREMENT;
  }
}

/** ลายเซ็นอิเล็กทรอนิกส์ — real browser WebCrypto SHA-256 digest (hex).
 * Deterministic per content; returns "N/A" if WebCrypto is unavailable. */
export async function webcryptoSign(content: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(content);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "N/A";
  }
}
