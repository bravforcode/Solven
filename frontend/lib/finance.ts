// Mock finance (ค่าเทอม / QR PromptPay / กองทุน / เงินเดือน / รายงานการเงิน)
// — deterministic demo data. Tries the backend /api/demo/* first; falls back
// to the local mirror when the backend is unreachable (demo mode only).

export interface TuitionItem {
  name: string;
  amount: number;
}

export interface TuitionInvoice {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  term: string;
  items: TuitionItem[];
  total: number;
  paid: number;
  remaining: number;
  dueDate: string;
  status: string; // ชำระแล้ว / รอชำระ / ค้างชำระ
}

export interface PromptpayPayload {
  payload: string;
  amount: number;
  ref: string;
  generatedBy?: string;
}

export interface CoopLoan {
  amount: number;
  remaining: number;
  interestPct: number;
  dueDate: string;
}

export interface CoopMember {
  id: string;
  name: string;
  savings: number;
  shares: number;
  loans: CoopLoan[];
  status: string;
}

export interface CoopAccount {
  members: CoopMember[];
  totalSavings: number;
  generatedAt?: string;
  generatedBy?: string;
}

export interface PayrollAllowance {
  name: string;
  amount: number;
}

export interface PayrollDeduction {
  name: string;
  amount: number;
}

export interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
  allowances: PayrollAllowance[];
  allowanceTotal: number;
  deductions: PayrollDeduction[];
  deductionTotal: number;
  net: number;
  status: string; // จ่ายแล้ว / รอจ่าย
}

export interface Payroll {
  employees: PayrollEmployee[];
  totals: { base: number; allowances: number; deductions: number; net: number };
  month: string;
  generatedAt?: string;
  generatedBy?: string;
}

export interface FinanceCategory {
  category: string;
  amount: number;
}

export interface FinanceMonth {
  month: string;
  income: number;
  expense: number;
}

export interface FinanceSummary {
  period: string;
  income: FinanceCategory[];
  expense: FinanceCategory[];
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  months: FinanceMonth[];
  generatedAt?: string;
  generatedBy?: string;
}

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";

const DEMO_MODE = process.env.NEXT_PUBLIC_SOLVEN_MODE === "demo";

// ---------------------------------------------------------------------------
// Local mirrors (deterministic — must match backend demo_features_finance.py)
// ---------------------------------------------------------------------------

export const LOCAL_TUITION: TuitionInvoice[] = [
  {
    id: "inv-001",
    studentId: "s-001",
    studentName: "เด็กชายสมชาย ใจดี",
    className: "ป.4/1",
    term: "ภาคเรียนที่ 1/2569",
    items: [
      { name: "ค่าเล่าเรียน", amount: 4000 },
      { name: "ค่าหนังสือเรียน", amount: 800 },
      { name: "ค่าเครื่องแบบ", amount: 600 },
      { name: "ค่ากิจกรรมเสริม", amount: 500 },
      { name: "ค่าประกันอุบัติเหตุ", amount: 100 },
    ],
    total: 6000,
    paid: 6000,
    remaining: 0,
    dueDate: "2569-05-15",
    status: "ชำระแล้ว",
  },
  {
    id: "inv-002",
    studentId: "s-002",
    studentName: "เด็กหญิงสมหญิง รักเรียน",
    className: "ป.4/1",
    term: "ภาคเรียนที่ 1/2569",
    items: [
      { name: "ค่าเล่าเรียน", amount: 4000 },
      { name: "ค่าหนังสือเรียน", amount: 800 },
      { name: "ค่าเครื่องแบบ", amount: 600 },
      { name: "ค่ากิจกรรมเสริม", amount: 500 },
      { name: "ค่าประกันอุบัติเหตุ", amount: 100 },
    ],
    total: 6000,
    paid: 6000,
    remaining: 0,
    dueDate: "2569-05-15",
    status: "ชำระแล้ว",
  },
  {
    id: "inv-003",
    studentId: "s-003",
    studentName: "เด็กชายอนุชา แซ่ลี้",
    className: "ป.4/1",
    term: "ภาคเรียนที่ 1/2569",
    items: [
      { name: "ค่าเล่าเรียน", amount: 4000 },
      { name: "ค่าหนังสือเรียน", amount: 800 },
      { name: "ค่าเครื่องแบบ", amount: 600 },
      { name: "ค่ากิจกรรมเสริม", amount: 500 },
      { name: "ค่าประกันอุบัติเหตุ", amount: 100 },
    ],
    total: 6000,
    paid: 3500,
    remaining: 2500,
    dueDate: "2569-06-15",
    status: "รอชำระ",
  },
  {
    id: "inv-004",
    studentId: "s-006",
    studentName: "เด็กหญิงกนกพร ทองดี",
    className: "ป.5/1",
    term: "ภาคเรียนที่ 1/2569",
    items: [
      { name: "ค่าเล่าเรียน", amount: 4200 },
      { name: "ค่าหนังสือเรียน", amount: 850 },
      { name: "ค่าเครื่องแบบ", amount: 650 },
      { name: "ค่ากิจกรรมเสริม", amount: 500 },
      { name: "ค่าประกันอุบัติเหตุ", amount: 100 },
    ],
    total: 6300,
    paid: 2000,
    remaining: 4300,
    dueDate: "2569-06-15",
    status: "รอชำระ",
  },
  {
    id: "inv-005",
    studentId: "s-007",
    studentName: "เด็กชายวรเมธ กล้าหาญ",
    className: "ป.5/1",
    term: "ภาคเรียนที่ 1/2569",
    items: [
      { name: "ค่าเล่าเรียน", amount: 4200 },
      { name: "ค่าหนังสือเรียน", amount: 850 },
      { name: "ค่าเครื่องแบบ", amount: 650 },
      { name: "ค่ากิจกรรมเสริม", amount: 500 },
      { name: "ค่าประกันอุบัติเหตุ", amount: 100 },
    ],
    total: 6300,
    paid: 0,
    remaining: 6300,
    dueDate: "2569-04-30",
    status: "ค้างชำระ",
  },
  {
    id: "inv-006",
    studentId: "s-011",
    studentName: "เด็กชายกิตติพงษ์ แก้วใส",
    className: "ม.1/1",
    term: "ภาคเรียนที่ 1/2569",
    items: [
      { name: "ค่าเล่าเรียน", amount: 4500 },
      { name: "ค่าหนังสือเรียน", amount: 950 },
      { name: "ค่าเครื่องแบบ", amount: 700 },
      { name: "ค่ากิจกรรมเสริม", amount: 550 },
      { name: "ค่าประกันอุบัติเหตุ", amount: 100 },
    ],
    total: 6800,
    paid: 0,
    remaining: 6800,
    dueDate: "2569-04-30",
    status: "ค้างชำระ",
  },
];

// --- EMVCo-style PromptPay QR builder (mirrors backend promptpay_payload) ---

function crc16ccitt(data: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function tlv(tag: string, value: string): string {
  const byteLength = new TextEncoder().encode(value).length;
  return `${tag}${byteLength.toString().padStart(2, "0")}${value}`;
}

export function buildPromptpayPayload(amount: number, ref: string): string {
  const amountStr = amount.toFixed(2);
  const mobile = "0066812345678"; // synthetic (PDPA-safe)
  const merchant = "โรงเรียนสวนฝั่งสุข";
  const city = "กรุงเทพมหานคร";
  const billerId = "0994000567891"; // synthetic TAX ID (PDPA-safe)
  const tag29 = tlv("29", "0016A000000677010111" + "0113" + mobile);
  const tag54 = tlv("54", amountStr);
  const tag59 = tlv("59", merchant);
  const tag60 = tlv("60", city);
  const tag62 = tlv("62", tlv("01", billerId) + tlv("07", ref));
  const body =
    "000201010211" + tag29 + "5303764" + tag54 + "5802TH" + tag59 + tag60 + tag62;
  const crc = crc16ccitt(new TextEncoder().encode(body + "6304"));
  return body + "6304" + crc.toString(16).toUpperCase().padStart(4, "0");
}

export const LOCAL_COOP: CoopAccount = {
  totalSavings: 266500,
  generatedBy: "local-mirror",
  members: [
    {
      id: "c-001",
      name: "นายสมชาย มากมี",
      savings: 85000,
      shares: 120,
      loans: [
        { amount: 50000, remaining: 32000, interestPct: 6.5, dueDate: "2569-12-20" },
      ],
      status: "ปกติ",
    },
    {
      id: "c-002",
      name: "นางสาวสมหญิง ใจดี",
      savings: 64000,
      shares: 90,
      loans: [],
      status: "ปกติ",
    },
    {
      id: "c-003",
      name: "นายประเสริฐ สุขสันต์",
      savings: 92000,
      shares: 150,
      loans: [
        { amount: 30000, remaining: 12500, interestPct: 6.5, dueDate: "2569-11-15" },
        { amount: 20000, remaining: 20000, interestPct: 7.0, dueDate: "2569-09-30" },
      ],
      status: "ปกติ",
    },
    {
      id: "c-004",
      name: "นางกนกพร ทองดี",
      savings: 21000,
      shares: 40,
      loans: [
        { amount: 25000, remaining: 18000, interestPct: 6.5, dueDate: "2569-10-10" },
      ],
      status: "สมาชิกใหม่",
    },
    {
      id: "c-005",
      name: "นายวรเมธ กล้าหาญ",
      savings: 4500,
      shares: 5,
      loans: [],
      status: "รออนุมัติ",
    },
  ],
};

export const LOCAL_PAYROLL: Payroll = {
  month: "กรกฎาคม 2569",
  generatedBy: "local-mirror",
  totals: { base: 131500, allowances: 15300, deductions: 16750, net: 130050 },
  employees: [
    {
      id: "e-001",
      name: "นายสวัสดิ์ ผู้อำนวยการ",
      position: "ผู้อำนวยการ",
      baseSalary: 35000,
      allowances: [
        { name: "เงินเพิ่มค่าครองชีพ", amount: 2000 },
        { name: "ค่าวิทยฐานะ", amount: 2500 },
      ],
      allowanceTotal: 4500,
      deductions: [
        { name: "ภาษีเงินได้", amount: 4200 },
        { name: "ประกันสังคม", amount: 750 },
      ],
      deductionTotal: 4950,
      net: 34550,
      status: "จ่ายแล้ว",
    },
    {
      id: "e-002",
      name: "นายสมชาย มากมี",
      position: "ครูชำนาญการ",
      baseSalary: 28000,
      allowances: [
        { name: "เงินเพิ่มค่าครองชีพ", amount: 1800 },
        { name: "ค่าวิทยฐานะ", amount: 2500 },
      ],
      allowanceTotal: 4300,
      deductions: [
        { name: "ภาษีเงินได้", amount: 2900 },
        { name: "ประกันสังคม", amount: 750 },
      ],
      deductionTotal: 3650,
      net: 28650,
      status: "จ่ายแล้ว",
    },
    {
      id: "e-003",
      name: "นายประเสริฐ สุขสันต์",
      position: "ครูชำนาญการ",
      baseSalary: 28000,
      allowances: [
        { name: "เงินเพิ่มค่าครองชีพ", amount: 1800 },
        { name: "ค่าวิทยฐานะ", amount: 2000 },
      ],
      allowanceTotal: 3800,
      deductions: [
        { name: "ภาษีเงินได้", amount: 2900 },
        { name: "ประกันสังคม", amount: 750 },
      ],
      deductionTotal: 3650,
      net: 28150,
      status: "จ่ายแล้ว",
    },
    {
      id: "e-004",
      name: "นางสาวสมหญิง ใจดี",
      position: "ครูผู้ช่วย",
      baseSalary: 22000,
      allowances: [{ name: "เงินเพิ่มค่าครองชีพ", amount: 1500 }],
      allowanceTotal: 1500,
      deductions: [
        { name: "ภาษีเงินได้", amount: 1800 },
        { name: "ประกันสังคม", amount: 750 },
      ],
      deductionTotal: 2550,
      net: 20950,
      status: "รอจ่าย",
    },
    {
      id: "e-005",
      name: "นางสาวบุญช่วย งานดี",
      position: "เจ้าหน้าที่ธุรการ",
      baseSalary: 18500,
      allowances: [{ name: "เงินเพิ่มค่าครองชีพ", amount: 1200 }],
      allowanceTotal: 1200,
      deductions: [
        { name: "ภาษีเงินได้", amount: 1200 },
        { name: "ประกันสังคม", amount: 750 },
      ],
      deductionTotal: 1950,
      net: 17750,
      status: "รอจ่าย",
    },
  ],
};

export const LOCAL_FINANCE: FinanceSummary = {
  period: "ไตรมาส 3/2569 (มี.ค.–พ.ค. 2569)",
  generatedBy: "local-mirror",
  income: [
    { category: "ค่าเทอม", amount: 320000 },
    { category: "ค่าธรรมเนียมการศึกษา", amount: 45000 },
    { category: "เงินบริจาค", amount: 20000 },
    { category: "รายได้อื่น", amount: 8500 },
  ],
  expense: [
    { category: "เงินเดือนบุคลากร", amount: 210000 },
    { category: "ค่าวัสดุการเรียน", amount: 35000 },
    { category: "ค่าสาธารณูปโภค", amount: 28000 },
    { category: "ซ่อมแซมอาคารสถานที่", amount: 12000 },
  ],
  incomeTotal: 385500,
  expenseTotal: 285000,
  balance: 100500,
  months: [
    { month: "มี.ค. 2569", income: 61000, expense: 45500 },
    { month: "เม.ย. 2569", income: 42500, expense: 51000 },
    { month: "พ.ค. 2569", income: 68000, expense: 47000 },
    { month: "มิ.ย. 2569", income: 72000, expense: 52000 },
    { month: "ก.ค. 2569", income: 71500, expense: 48000 },
    { month: "ส.ค. 2569", income: 70500, expense: 41500 },
  ],
};

// ---------------------------------------------------------------------------
// Fetch helpers (backend first, local fallback in demo mode)
// ---------------------------------------------------------------------------

export async function fetchTuition(): Promise<TuitionInvoice[]> {
  try {
    const res = await fetch(`${API_URL}/api/demo/tuition`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as TuitionInvoice[];
  } catch {
    if (!DEMO_MODE) return [];
    return LOCAL_TUITION;
  }
}

export async function fetchPromptpay(
  amount: number,
  ref: string
): Promise<PromptpayPayload> {
  try {
    const res = await fetch(`${API_URL}/api/demo/promptpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, ref }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as PromptpayPayload;
  } catch {
    if (!DEMO_MODE) throw new Error("PromptPay backend unreachable");
    return {
      payload: buildPromptpayPayload(amount, ref),
      amount,
      ref,
      generatedBy: "local-mirror",
    };
  }
}

export async function fetchCoop(): Promise<CoopAccount> {
  try {
    const res = await fetch(`${API_URL}/api/demo/coop`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as CoopAccount;
  } catch {
    if (!DEMO_MODE) throw new Error("coop backend unreachable");
    return LOCAL_COOP;
  }
}

export async function fetchPayroll(): Promise<Payroll> {
  try {
    const res = await fetch(`${API_URL}/api/demo/payroll`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as Payroll;
  } catch {
    if (!DEMO_MODE) throw new Error("payroll backend unreachable");
    return LOCAL_PAYROLL;
  }
}

export async function fetchFinance(): Promise<FinanceSummary> {
  try {
    const res = await fetch(`${API_URL}/api/demo/finance-summary`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as FinanceSummary;
  } catch {
    if (!DEMO_MODE) throw new Error("finance-summary backend unreachable");
    return LOCAL_FINANCE;
  }
}
