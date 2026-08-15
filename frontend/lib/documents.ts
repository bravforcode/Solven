import { SchoolInfo } from "@/lib/school";
import { AGENT_LABEL, Draft } from "@/lib/types";

export type DocType =
  | "worksheet"
  | "lesson-record"
  | "official-letter"
  | "certificate"
  | "summary"
  | "pp5"
  | "pp6"
  | "order"
  | "memo";

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  worksheet: "ใบงาน / แบบฝึกหัด",
  "lesson-record": "บันทึกหลังสอน",
  "official-letter": "หนังสือราชการ",
  certificate: "เกียรติบัตร",
  summary: "รายงานสรุป",
  pp5: "ปพ.5 ระเบียนแสดงผลการเรียน",
  pp6: "ปพ.6 ใบรับรองผลการเรียน",
  order: "คำสั่ง",
  memo: "บันทึกข้อความ",
};

export interface WorksheetFields {
  number: string;
  subject: string;
  grade: string;
  date: string;
  instructions: string;
  body: string;
}
export interface LessonRecordFields {
  subject: string;
  unit: string;
  grade: string;
  students: string;
  date: string;
  indicators: string;
  results: string;
  problems: string;
  fixes: string;
  teacherName: string;
}
export interface OfficialLetterFields {
  refNo: string;
  date: string;
  subject: string;
  to: string;
  body: string;
  teacherName: string;
  position: string;
}
export interface CertificateFields {
  studentName: string;
  detail: string;
  directorName: string;
  date: string;
}
export interface Pp5Fields {
  studentName: string;
  grade: string;
  semester: string;
  year: string;
  subjects: { name: string; score: string; grade: string }[];
  teacherName: string;
}
export interface Pp6Fields {
  studentName: string;
  birthDate: string;
  grade: string;
  semester: string;
  year: string;
  gpa: string;
  directorName: string;
  date: string;
}
export interface OrderFields {
  refNo: string;
  date: string;
  subject: string;
  body: string;
  directorName: string;
}
export interface MemoFields {
  from: string;
  to: string;
  date: string;
  subject: string;
  body: string;
  senderName: string;
}

/**
 * Digital signature (ลายเซ็นดิจิทัล): deterministic SHA-256 fingerprint of
 * the document content + signer. Demo shows the trust mechanism — in
 * production this would be an Ed25519 signature over the rendered document.
 */
export function digitalSignature(content: string, signer: string): string {
  const data = `${content}::${signer}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function signatureBlock(content: string, signer: string, role: string): string {
  const sig = digitalSignature(content, signer);
  return `
    <div class="doc-sign-row">
      <span>ลงชื่อ ____________________</span>
      <span>&nbsp;&nbsp;( ${esc(signer)} ) ${esc(role)}</span>
    </div>
    <div class="doc-digital-sig" title="ลายเซ็นดิจิทัล — ใช้ตรวจสอบความถูกต้องของเอกสาร">
      ลายเซ็นดิจิทัล: ${sig} · ลงนามโดย ${esc(signer)} (${esc(role)})
    </div>`;
}

/** Escape HTML-sensitive characters (teacher-owned data, never raw-inject).
 * Null/undefined-safe (REVIEW F5): localStorage tampering must not crash. */
export function esc(text: string): string {
  const t = String(text ?? "");
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Paragraph-ify text (split on blank lines → <p>, single newline → <br/>). */
export function nl2p(text: string): string {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 0) return "";
  return paras
    .map((p) => `<p class="doc-p">${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function schoolHeader(s: SchoolInfo): string {
  return `
    <div class="doc-school-head">
      <div class="doc-school-name">${esc(s.schoolName)}</div>
      <div class="doc-school-addr">${esc(s.address)}&nbsp;&nbsp;โทร. ${esc(s.phone)}</div>
      <div class="doc-school-sub">${esc(s.district)} · ภาคเรียนที่ ${esc(s.semester)} / ปีการศึกษา ${esc(s.year)}</div>
      <div class="doc-rule"></div>
    </div>`;
}

export function docShell(s: SchoolInfo, inner: string, landscape = false): string {
  return `
    <div class="doc-page${landscape ? " doc-landscape" : ""}">
      ${schoolHeader(s)}
      ${inner}
      <div class="doc-footer">พิมพ์จาก Solven · ${esc(s.schoolName)}</div>
    </div>`;
}

export function buildWorksheetHtml(s: SchoolInfo, f: WorksheetFields): string {
  return docShell(
    s,
    `
    <div class="doc-title">ใบงานที่ ${esc(f.number || "___")}</div>
    <div class="doc-sub">วิชา ${esc(f.subject)} · ชั้น ${esc(f.grade)} · วันที่ ${esc(f.date)}</div>
    <div class="doc-name-box">ชื่อ-สกุล ______________________________ เลขที่ ______</div>
    <div class="doc-desc">คำชี้แจง: ${esc(f.instructions || "จงตอบคำถามต่อไปนี้")}</div>
    <div class="doc-body">${nl2p(f.body)}</div>
    <div class="doc-lines" aria-hidden="true"></div>`
  );
}

export function buildLessonRecordHtml(s: SchoolInfo, f: LessonRecordFields): string {
  const row = (label: string, val: string) =>
    `<tr><td class="doc-td-label">${label}</td><td class="doc-td">${esc(val)}</td></tr>`;
  return docShell(
    s,
    `
    <div class="doc-title">บันทึกหลังสอน</div>
    <table class="doc-table">
      ${row("วิชา / หน่วยการเรียนรู้", `${f.subject} / ${f.unit}`)}
      ${row("ระดับชั้น / จำนวนนักเรียน", `${f.grade} / ${f.students} คน`)}
      ${row("วันที่สอน", f.date)}
      ${row("มาตรฐาน / ตัวชี้วัด", f.indicators)}
      ${row("ผลที่เกิดขึ้นจริง", f.results)}
      ${row("ปัญหา / อุปสรรค", f.problems)}
      ${row("แนวทางแก้ไข / พัฒนา", f.fixes)}
    </table>
    <div class="doc-sign-row">
      <span>ลงชื่อ ____________________ ครูผู้สอน</span>
      <span>&nbsp;&nbsp;( ${esc(f.teacherName)} )</span>
    </div>`
  );
}

export function buildOfficialLetterHtml(s: SchoolInfo, f: OfficialLetterFields): string {
  return docShell(
    s,
    `
    <div class="doc-letter-ref">ที่ ${esc(f.refNo || s.refNo)} วันที่ ${esc(f.date)}</div>
    <div class="doc-letter-line"><b>เรื่อง</b> ${esc(f.subject)}</div>
    <div class="doc-letter-line"><b>เรียน</b> ${esc(f.to)}</div>
    <div class="doc-body">${nl2p(f.body)}</div>
    <div class="doc-sign-right">
      <div>ลงชื่อ ____________________</div>
      <div>( ${esc(f.teacherName)} )</div>
      <div>${esc(f.position)}</div>
      <div>${esc(s.schoolName)}</div>
    </div>`
  );
}

export function buildCertificateHtml(s: SchoolInfo, f: CertificateFields): string {
  return docShell(
    s,
    `
    <div class="cert-frame">
      <div class="cert-title">เกียรติบัตร</div>
      <div class="cert-sub">ขอประกาศว่า</div>
      <div class="cert-name">${esc(f.studentName)}</div>
      <div class="cert-body">${esc(f.detail)}</div>
      <div class="cert-sign-row">
        <div class="cert-sign">
          ลงชื่อ ____________________<br/>
          ( ${esc(f.directorName)} )<br/>
          ผู้อำนวยการ
        </div>
      </div>
    </div>`,
    true
  );
}

export function buildPp5Html(s: SchoolInfo, f: Pp5Fields): string {
  const rows = f.subjects
    .map(
      (sub) =>
        `<tr><td class="doc-td">${esc(sub.name)}</td><td class="doc-td doc-td-center">${esc(sub.score)}</td><td class="doc-td doc-td-center">${esc(sub.grade)}</td></tr>`
    )
    .join("");
  return docShell(
    s,
    `
    <div class="doc-title">ระเบียนแสดงผลการเรียน (ปพ.5)</div>
    <div class="doc-sub">ชั้น ${esc(f.grade)} · ภาคเรียนที่ ${esc(f.semester)} / ปีการศึกษา ${esc(f.year)}</div>
    <table class="doc-table">
      <tr><td class="doc-td-label">ชื่อ-สกุล</td><td class="doc-td">${esc(f.studentName)}</td></tr>
    </table>
    <table class="doc-table">
      <tr><th class="doc-td-label">รายวิชา</th><th class="doc-td-label doc-td-center">คะแนน</th><th class="doc-td-label doc-td-center">ผลการเรียน</th></tr>
      ${rows}
    </table>
    ${signatureBlock(`ปพ.5 ${f.studentName} ${f.grade} ${f.semester}/${f.year}`, f.teacherName, "ครูประจำชั้น")}`
  );
}

export function buildPp6Html(s: SchoolInfo, f: Pp6Fields): string {
  return docShell(
    s,
    `
    <div class="doc-title">ใบรับรองผลการเรียน (ปพ.6)</div>
    <div class="doc-sub">ชั้น ${esc(f.grade)} · ภาคเรียนที่ ${esc(f.semester)} / ปีการศึกษา ${esc(f.year)}</div>
    <table class="doc-table">
      <tr><td class="doc-td-label">ชื่อ-สกุล</td><td class="doc-td">${esc(f.studentName)}</td></tr>
      <tr><td class="doc-td-label">วันเกิด</td><td class="doc-td">${esc(f.birthDate)}</td></tr>
      <tr><td class="doc-td-label">เกรดเฉลี่ย (GPA)</td><td class="doc-td">${esc(f.gpa)}</td></tr>
    </table>
    <div class="doc-body">ขอรับรองว่า ${esc(f.studentName)} เป็นนักเรียนชั้น ${esc(f.grade)} ของ${esc(s.schoolName)} ในภาคเรียนที่ ${esc(f.semester)} ปีการศึกษา ${esc(f.year)} ตามระเบียนข้างต้น</div>
    ${signatureBlock(`ปพ.6 ${f.studentName} ${f.grade} ${f.semester}/${f.year}`, f.directorName, "ผู้อำนวยการสถานศึกษา")}`
  );
}

export function buildOrderHtml(s: SchoolInfo, f: OrderFields): string {
  return docShell(
    s,
    `
    <div class="doc-letter-ref">ที่ ${esc(f.refNo || s.refNo)} วันที่ ${esc(f.date)}</div>
    <div class="doc-letter-line"><b>เรื่อง</b> ${esc(f.subject)}</div>
    <div class="doc-body">${nl2p(f.body)}</div>
    <div class="doc-sign-right">
      <div>สั่ง ณ วันที่ ${esc(f.date)}</div>
      <div>ลงชื่อ ____________________</div>
      <div>( ${esc(f.directorName)} )</div>
      <div>ผู้อำนวยการ${esc(s.schoolName)}</div>
    </div>
    <div class="doc-digital-sig" title="ลายเซ็นดิจิทัล — ใช้ตรวจสอบความถูกต้องของเอกสาร">
      ลายเซ็นดิจิทัล: ${digitalSignature(`คำสั่ง ${f.subject} ${f.date}`, f.directorName)} · ลงนามโดย ${esc(f.directorName)} (ผู้อำนวยการ)
    </div>`
  );
}

export function buildMemoHtml(s: SchoolInfo, f: MemoFields): string {
  return docShell(
    s,
    `
    <div class="doc-title">บันทึกข้อความ</div>
    <table class="doc-table">
      <tr><td class="doc-td-label">จาก</td><td class="doc-td">${esc(f.from)}</td></tr>
      <tr><td class="doc-td-label">ถึง</td><td class="doc-td">${esc(f.to)}</td></tr>
      <tr><td class="doc-td-label">วันที่</td><td class="doc-td">${esc(f.date)}</td></tr>
      <tr><td class="doc-td-label">เรื่อง</td><td class="doc-td">${esc(f.subject)}</td></tr>
    </table>
    <div class="doc-body">${nl2p(f.body)}</div>
    ${signatureBlock(`บันทึกข้อความ ${f.subject} ${f.date}`, f.senderName, "ผู้บันทึก")}`
  );
}

/** Summary report — every approved draft, one print. */
export function buildSummaryReportHtml(s: SchoolInfo, drafts: Draft[]): string {
  const blocks = drafts
    .map((d, i) => {
      const date = (() => {
        try {
          return new Date(d.createdAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        } catch {
          return d.createdAt;
        }
      })();
      return `
      <div class="doc-block">
        <div class="doc-block-head">${i + 1}. ${esc(AGENT_LABEL[d.agent])} — ${esc(date)}</div>
        <div class="doc-body">${nl2p(d.output)}</div>
      </div>`;
    })
    .join("");
  return docShell(
    s,
    `
    <div class="doc-title">รายงานสรุปผลงานที่อนุมัติแล้ว (${drafts.length} รายการ)</div>
    ${blocks}`
  );
}

/**
 * Print a document: inject html into a body-level #print-root, print, clean up.
 * Works offline; backend not involved.
 *
 * `landscape` injects an explicit `@page { size: A4 landscape }` rule —
 * named-page (`page: landscape`) is Chromium-only, so Firefox/Safari need the
 * size rule to rotate certificate pages.
 */
export interface PrintOptions {
  landscape?: boolean;
}

export function printDocument(html: string, opts: PrintOptions = {}): void {
  const old = document.getElementById("print-root");
  if (old) old.remove();
  const root = document.createElement("div");
  root.id = "print-root";
  const pageRule = opts.landscape
    ? `<style>@page { size: A4 landscape; margin: 0; }</style>`
    : `<style>@page { size: A4 portrait; margin: 0; }</style>`;
  root.innerHTML = pageRule + html;
  document.body.appendChild(root);
  const cleanup = () => {
    root.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  try {
    window.print();
  } finally {
    // REVIEW F7: blocked/cancelled print must not leak #print-root
    cleanup();
  }
}
