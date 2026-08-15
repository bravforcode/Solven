import { SchoolInfo } from "@/lib/school";
import { AGENT_LABEL, Draft } from "@/lib/types";

export type DocType =
  | "worksheet"
  | "lesson-record"
  | "official-letter"
  | "certificate"
  | "summary";

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  worksheet: "ใบงาน / แบบฝึกหัด",
  "lesson-record": "บันทึกหลังสอน",
  "official-letter": "หนังสือราชการ",
  certificate: "เกียรติบัตร",
  summary: "รายงานสรุป",
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
 */
export function printDocument(html: string): void {
  const old = document.getElementById("print-root");
  if (old) old.remove();
  const root = document.createElement("div");
  root.id = "print-root";
  root.innerHTML = html;
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
