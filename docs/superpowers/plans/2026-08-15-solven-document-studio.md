# Solven Document Studio v0.3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Solven into a one-stop teacher document desk — 5 ready-to-print Thai school documents (ใบงาน, บันทึกหลังสอน, หนังสือราชการ, เกียรติบัตร, รายงานสรุป) generated client-side (print/PDF, offline-capable) with a backend PDF endpoint that degrades gracefully, plus a teacher dashboard and UX/visual polish.

**Architecture:** SPA gains a third view `"docs"` in `frontend/app/page.tsx`; new route `frontend/app/settings/page.tsx`; document HTML built by pure functions in new `frontend/lib/documents.ts`; school settings persisted to localStorage via new `frontend/lib/school.ts`; printing via `@media print` CSS that hides the app shell; backend PDF via new `POST /api/documents/render` (FastAPI + reportlab + vendored Noto Sans Thai TTF) proxied by a BFF route mirroring `api/coordinator`.

**Tech Stack:** Next.js 14 (App Router, client components), React 18, Tailwind v4 (unlayered CSS in `globals.css`), FastAPI, reportlab 4.4.4 (new backend dep), pytest.

## Global Constraints

- **No new frontend dependencies.** Print-first; no browser PDF library.
- **Backend new dependency only:** `reportlab==4.4.4` added to `backend/requirements.txt` (pin per repo policy, bump deliberately + re-test).
- **Thai UI copy only** for all new user-facing strings (English allowed in code identifiers only).
- **Stripe grammar tokens** from `frontend/app/globals.css` `:root` (`--accent`, `--ink`, `--line`, …). No dark mode (design contract).
- **Escape all interpolated values** in generated HTML via the `esc()` helper from Task 2 (teacher-owned data, but never raw-inject).
- **Frontend verification:** `npm run typecheck` + `npm run build` (no JS test runner in repo — do NOT add one). **Backend verification:** `pytest` (real TDD).
- Follow existing patterns: BFF proxy uses `requirePrincipal` (see `frontend/app/api/coordinator/route.ts`), backend routes register inside `create_app()` in `backend/app/main.py`, pydantic models live in `backend/app/schema.py`.
- Backend PDF button in the UI is shown **only when** `engine === "backend"` (existing state signal) — offline/mock hides it; print always works.

---

### Task 1: `frontend/lib/school.ts` — school settings store

**Files:**
- Create: `frontend/lib/school.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `SchoolInfo` (type), `SCHOOL_DEFAULTS` (const), `loadSchool(): SchoolInfo`, `saveSchool(patch: Partial<SchoolInfo>): SchoolInfo` — used by Tasks 2, 4, 5.

- [ ] **Step 1: Create `frontend/lib/school.ts`**

```ts
export interface SchoolInfo {
  schoolName: string;
  address: string;
  phone: string;
  district: string;
  semester: string;
  year: string;
  teacherName: string;
  position: string;
  directorName: string;
  refNo: string;
}

export const SCHOOL_DEFAULTS: SchoolInfo = {
  schoolName: "โรงเรียนบ้านสวนฝั่งสุข",
  address: "12 หมู่ 3 ต.สวนฝั่ง อ.เมือง จ.สมุทรปราการ 10270",
  phone: "02-123-4567",
  district: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสมุทรปราการ เขต 1",
  semester: "1",
  year: "2569",
  teacherName: "นางสาวสมหญิง ใจดี",
  position: "ครูผู้สอน",
  directorName: "นายประเสริฐ สุขสันต์",
  refNo: "____/2569",
};

const KEY = "solven.school";

export function loadSchool(): SchoolInfo {
  if (typeof window === "undefined") return SCHOOL_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SCHOOL_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SchoolInfo>;
    return { ...SCHOOL_DEFAULTS, ...parsed };
  } catch {
    return SCHOOL_DEFAULTS;
  }
}

export function saveSchool(patch: Partial<SchoolInfo>): SchoolInfo {
  const next = { ...loadSchool(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — settings are a convenience, never a blocker
  }
  return next;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/school.ts
git commit -m "feat(docs): school settings store (lib/school.ts)"
```

---

### Task 2: `frontend/lib/documents.ts` — document HTML builders

**Files:**
- Create: `frontend/lib/documents.ts`

**Interfaces:**
- Consumes: `SchoolInfo`, `SCHOOL_DEFAULTS` from `@/lib/school` (Task 1); `AGENT_LABEL` from `@/lib/types`
- Produces: `DocType` union, field interfaces (`WorksheetFields`, `LessonRecordFields`, `OfficialLetterFields`, `CertificateFields`), `esc()`, `nl2p()`, `schoolHeader(s)`, `docShell(s, inner, landscape?)`, `buildWorksheetHtml(s, f)`, `buildLessonRecordHtml(s, f)`, `buildOfficialLetterHtml(s, f)`, `buildCertificateHtml(s, f)`, `buildSummaryReportHtml(s, drafts)`, `printDocument(html)` — used by Tasks 3, 4, 5, 6.

- [ ] **Step 1: Create `frontend/lib/documents.ts`**

```ts
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

/** Escape HTML-sensitive characters (teacher-owned data, never raw-inject). */
export function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Paragraph-ify text (split on blank lines → <p>, single newline → <br/>). */
export function nl2p(text: string): string {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
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
  return docShell(s, `
    <div class="doc-title">ใบงานที่ ${esc(f.number || "___")}</div>
    <div class="doc-sub">วิชา ${esc(f.subject)} · ชั้น ${esc(f.grade)} · วันที่ ${esc(f.date)}</div>
    <div class="doc-name-box">ชื่อ-สกุล ______________________________ เลขที่ ______</div>
    <div class="doc-desc">คำชี้แจง: ${esc(f.instructions || "จงตอบคำถามต่อไปนี้")}</div>
    <div class="doc-body">${nl2p(f.body)}</div>
    <div class="doc-lines" aria-hidden="true"></div>`);
}

export function buildLessonRecordHtml(s: SchoolInfo, f: LessonRecordFields): string {
  const row = (label: string, val: string) =>
    `<tr><td class="doc-td-label">${label}</td><td class="doc-td">${esc(val)}</td></tr>`;
  return docShell(s, `
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
    </div>`);
}

export function buildOfficialLetterHtml(s: SchoolInfo, f: OfficialLetterFields): string {
  return docShell(s, `
    <div class="doc-letter-ref">ที่ ${esc(f.refNo || s.refNo)} วันที่ ${esc(f.date)}</div>
    <div class="doc-letter-line"><b>เรื่อง</b> ${esc(f.subject)}</div>
    <div class="doc-letter-line"><b>เรียน</b> ${esc(f.to)}</div>
    <div class="doc-body">${nl2p(f.body)}</div>
    <div class="doc-sign-right">
      <div>ลงชื่อ ____________________</div>
      <div>( ${esc(f.teacherName)} )</div>
      <div>${esc(f.position)}</div>
      <div>${esc(s.schoolName)}</div>
    </div>`);
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
          return new Date(d.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
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
  return docShell(s, `
    <div class="doc-title">รายงานสรุปผลงานที่อนุมัติแล้ว (${drafts.length} รายการ)</div>
    ${blocks}`);
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
  const after = () => {
    root.remove();
    window.removeEventListener("afterprint", after);
  };
  window.addEventListener("afterprint", after);
  window.print();
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/documents.ts
git commit -m "feat(docs): document HTML builders (lib/documents.ts)"
```

---

### Task 3: Print CSS + polish styles in `frontend/app/globals.css`

**Files:**
- Modify: `frontend/app/globals.css` (append at end of file)

**Interfaces:**
- Consumes: class names emitted by Task 2 builders (`doc-page`, `doc-school-*`, `doc-title`, `doc-name-box`, `doc-desc`, `doc-body`, `doc-lines`, `doc-table`, `doc-td-label`, `doc-td`, `doc-sign-row`, `doc-sign-right`, `doc-letter-ref`, `doc-letter-line`, `doc-block`, `doc-block-head`, `cert-frame`, `cert-title`, `cert-sub`, `cert-name`, `cert-body`, `cert-sign`, `doc-footer`, `print-root`)
- Produces: CSS classes consumed by Tasks 4–6 (`.agent-card` selected polish, `.activity-bar*`, `.agent-strip`, `.doc-preview`, `.docs-grid`)

- [ ] **Step 1: Append print + document styles to `frontend/app/globals.css`**

```css
/* ============ Document Studio (v0.3) ============ */

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.doc-preview {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.8rem;
  color: var(--muted);
  white-space: pre-line;
}

/* agent-card selected polish */
.agent-card[aria-pressed="true"] {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.agent-card[aria-pressed="true"] .agent-icon {
  background: var(--accent-soft);
  color: var(--accent);
}

/* 7-day activity bars (pure CSS) */
.activity-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 64px;
  padding: 8px 12px;
}
.activity-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.activity-bar {
  width: 100%;
  max-width: 34px;
  border-radius: 4px 4px 0 0;
  background: var(--accent-soft);
  min-height: 2px;
  transition: height 180ms ease-out;
}
.activity-bar[data-active="true"] {
  background: var(--accent);
}
.activity-day {
  font-size: 0.62rem;
  color: var(--muted);
}

/* agent strip with counts */
.agent-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.agent-strip-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  font-size: 0.78rem;
  color: var(--ink);
  cursor: pointer;
}
.agent-strip-chip:hover {
  border-color: var(--line-strong);
}
.agent-strip-chip[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.agent-strip-count {
  font-size: 0.7rem;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
}
.agent-strip-chip[aria-pressed="true"] .agent-strip-count {
  background: var(--accent);
  color: #fff;
}

/* ============ Print documents (A4) ============ */

#print-root {
  display: none;
}

.doc-page {
  font-family: var(--font);
  color: #000;
  background: #fff;
  padding: 12mm 14mm;
  line-height: 1.6;
}

.doc-school-head {
  text-align: center;
  margin-bottom: 10px;
}
.doc-school-name {
  font-size: 1.15rem;
  font-weight: 700;
}
.doc-school-addr {
  font-size: 0.8rem;
}
.doc-school-sub {
  font-size: 0.75rem;
}
.doc-rule {
  border-bottom: 2px solid #000;
  margin-top: 6px;
}

.doc-title {
  text-align: center;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 12px 0 4px;
}
.doc-sub {
  text-align: center;
  font-size: 0.85rem;
  margin-bottom: 10px;
}
.doc-name-box {
  border: 1px solid #000;
  padding: 6px 10px;
  font-size: 0.85rem;
  margin-bottom: 12px;
}
.doc-desc {
  border: 1px solid #000;
  padding: 8px 10px;
  font-size: 0.85rem;
  margin-bottom: 12px;
  background: #fafafa;
}
.doc-body {
  font-size: 0.9rem;
}
.doc-p {
  margin: 0 0 8px;
}
.doc-lines {
  margin-top: 14px;
  border-bottom: 1px dashed #999;
  height: 120px;
}
.doc-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 0.85rem;
}
.doc-td-label {
  border: 1px solid #000;
  padding: 8px 10px;
  width: 32%;
  background: #fafafa;
  font-weight: 600;
  vertical-align: top;
}
.doc-td {
  border: 1px solid #000;
  padding: 8px 10px;
  vertical-align: top;
}
.doc-sign-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
  font-size: 0.85rem;
}
.doc-sign-right {
  text-align: right;
  margin-top: 24px;
  font-size: 0.85rem;
  line-height: 1.9;
}
.doc-letter-ref {
  text-align: right;
  font-size: 0.85rem;
  margin-bottom: 8px;
}
.doc-letter-line {
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.doc-block {
  margin-bottom: 14px;
  page-break-inside: avoid;
}
.doc-block-head {
  font-weight: 700;
  font-size: 0.85rem;
  border-bottom: 1px solid #999;
  margin-bottom: 6px;
  padding-bottom: 2px;
}
.doc-footer {
  text-align: center;
  font-size: 0.7rem;
  color: #666;
  margin-top: 18px;
}

/* certificate: A4 landscape, double-line frame */
.doc-landscape {
  min-height: 210mm;
  display: flex;
  flex-direction: column;
}
.doc-landscape .cert-frame {
  flex: 1;
  border: 4px double #000;
  margin: 6mm 0;
  padding: 14mm 18mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.cert-title {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.cert-sub {
  font-size: 1rem;
  margin-top: 18px;
}
.cert-name {
  font-size: 1.7rem;
  font-weight: 700;
  margin: 20px 0;
  border-bottom: 2px solid #000;
  padding: 0 24px 6px;
}
.cert-body {
  font-size: 0.95rem;
  max-width: 150mm;
}
.cert-sign-row {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-top: 26px;
}
.cert-sign {
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.8;
}

/* REVIEW FIX 4: page orientation must follow the document, or certificates
   print clipped in portrait. `page: landscape` applies the named @page rule. */
@page {
  size: A4 portrait;
  margin: 0;
}
@page landscape {
  size: A4 landscape;
  margin: 0;
}
.doc-landscape {
  page: landscape;
}

@media print {
  body {
    background: #fff !important;
  }
  body > *:not(#print-root) {
    display: none !important;
  }
  #print-root {
    display: block !important;
  }
  .doc-page {
    width: 210mm;
    min-height: 297mm;
  }
  .doc-landscape {
    width: 297mm;
    min-height: 210mm;
  }
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "style(docs): A4 print CSS + document studio styles (globals.css)"
```

---

### Task 4: `/settings` page + sidebar link

**Files:**
- Create: `frontend/app/settings/page.tsx`
- Modify: `frontend/app/page.tsx` (sidebar-foot — add link before "เกี่ยวกับโปรเจกต์")

**Interfaces:**
- Consumes: `loadSchool`, `saveSchool`, `SchoolInfo` from `@/lib/school` (Task 1); `useToast` from `@/components/ui/ToastProvider`
- Produces: none (standalone page); sidebar link pattern for Task 7 commands

- [ ] **Step 1: Create `frontend/app/settings/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { loadSchool, saveSchool, SchoolInfo } from "@/lib/school";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

const FIELDS: { key: keyof SchoolInfo; label: string; hint?: string }[] = [
  { key: "schoolName", label: "ชื่อโรงเรียน" },
  { key: "address", label: "ที่อยู่" },
  { key: "phone", label: "โทรศัพท์" },
  { key: "district", label: "สังกัด / เขตพื้นที่" },
  { key: "semester", label: "ภาคเรียนที่", hint: "เช่น 1" },
  { key: "year", label: "ปีการศึกษา", hint: "เช่น 2569" },
  { key: "teacherName", label: "ชื่อครูผู้สอน" },
  { key: "position", label: "ตำแหน่ง" },
  { key: "directorName", label: "ชื่อผู้อำนวยการ (เกียรติบัตร/หนังสือ)" },
  { key: "refNo", label: "เลขที่หนังสือราชการ", hint: "เช่น ____/2569" },
];

function SettingsForm() {
  const { push } = useToast();
  const [info, setInfo] = useState<SchoolInfo>(() => loadSchool());

  const set = (key: keyof SchoolInfo, value: string) =>
    setInfo((prev) => ({ ...prev, [key]: value }));

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSchool(info);
    push("success", "บันทึกข้อมูลโรงเรียนแล้ว");
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo">S</span>
          <span className="brand-name">Solven</span>
        </div>
        <nav className="sidebar-nav" aria-label="ส่วนหลัก">
          <Link href="/" className="sidebar-link">
            ← กลับไปแดชบอร์ด
          </Link>
        </nav>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ตั้งค่าโรงเรียน</h1>
            <p className="page-sub">
              ข้อมูลนี้ใช้เป็นหัวเอกสารราชการทุกแบบ (ใบงาน / บันทึกหลังสอน / หนังสือราชการ / เกียรติบัตร)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <form className="panel panel-pad" onSubmit={onSave} style={{ maxWidth: 640 }}>
            <div className="settings-grid" style={{ display: "grid", gap: 14 }}>
              {FIELDS.map((f) => (
                <div className="field" key={f.key}>
                  <label className="field-label" htmlFor={`settings-${f.key}`}>
                    {f.label}
                  </label>
                  <input
                    id={`settings-${f.key}`}
                    className="input"
                    value={info[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                  {f.hint && <span className="field-hint">{f.hint}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="submit" className="btn btn-primary">
                บันทึกข้อมูล
              </button>
              <Link href="/" className="btn btn-secondary">
                ยกเลิก
              </Link>
            </div>
          </form>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsForm />
    </ToastProvider>
  );
}
```

- [ ] **Step 2: Add sidebar link in `frontend/app/page.tsx`**

In `page.tsx`, inside the `sidebar-foot` div, right before the `<Link href="/about" ...>เกี่ยวกับโปรเจกต์</Link>` line, add:

```tsx
<Link href="/settings" className="sidebar-link">
  ตั้งค่าโรงเรียน
</Link>
```

- [ ] **Step 3: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/app/settings/page.tsx frontend/app/page.tsx
git commit -m "feat(settings): school settings page (/settings) + sidebar link"
```

---

### Task 5: Document Studio view in `frontend/app/page.tsx`

**Files:**
- Modify: `frontend/app/page.tsx` (type `View`, state, imports, `docs` view render, submit handler for docs)

**Interfaces:**
- Consumes: Task 2 builders + types (`DocType`, `DOC_TYPE_LABEL`, field interfaces, `printDocument`, `esc`); Task 1 `loadSchool`; existing `drafts` state; existing `engine` state; `useToast`
- Produces: state `docPrefill: { type: DocType; content: string } | null` consumed by Task 6; `goDocs(type?)` handler consumed by Task 7

- [ ] **Step 1: Widen imports + types**

In `frontend/app/page.tsx`:
- Add `"เอกสาร"` view: change `type View = "create" | "queue";` → `type View = "create" | "queue" | "docs";`
- Add imports:
```tsx
import {
  buildCertificateHtml,
  buildLessonRecordHtml,
  buildOfficialLetterHtml,
  buildSummaryReportHtml,
  buildWorksheetHtml,
  DOC_TYPE_LABEL,
  DocType,
  printDocument,
} from "@/lib/documents";
import { loadSchool } from "@/lib/school";
```
- Add `VIEW_TITLES` entry: `docs: { title: "เอกสาร", sub: "สร้างเอกสารราชการจากร่างที่อนุมัติ — พิมพ์หรือบันทึก PDF ได้ทันที" }`
- Add icon `ICON_DOCS = "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9 13h6 M9 17h6"` and nav item `เอกสาร` with `aria-pressed={view === "docs"}` between คิวตรวจ and sidebar-foot.

- [ ] **Step 2: Add doc form state + handlers**

In the component body, next to existing state:

```tsx
// document studio state
const [docType, setDocType] = useState<DocType>("worksheet");
const [docPrefill, setDocPrefill] = useState<{ type: DocType; content: string } | null>(null);
const [docFields, setDocFields] = useState({
  number: "", subject: "", grade: "ป.5", date: new Date().toLocaleDateString("th-TH"),
  instructions: "", body: "", unit: "", students: "30", indicators: "",
  results: "", problems: "", fixes: "", refNo: "", to: "", letterSubject: "",
  studentName: "", detail: "", directorName: "",
});
const [docSourceId, setDocSourceId] = useState("");
const setDoc = (k: keyof typeof docFields, v: string) =>
  setDocFields((prev) => ({ ...prev, [k]: v }));

const goDocs = useCallback((type?: DocType) => {
  if (type) setDocType(type);
  setView("docs");
}, []);

const approvedDrafts = drafts.filter((d) => d.status === "approved");
const DOC_SOURCE_AGENT: Partial<Record<DocType, AgentType[]>> = {
  worksheet: ["grading"],
  "lesson-record": ["lesson-plan"],
  "official-letter": ["reporting"],
  certificate: ["grading", "reporting"],
};
const docSourceDrafts = approvedDrafts.filter((d) =>
  (DOC_SOURCE_AGENT[docType] ?? []).includes(d.agent)
);

function applyDocSource(id: string) {
  const d = docSourceDrafts.find((x) => x.id === id);
  if (!d) return;
  setDocSourceId(id);
  if (docType === "worksheet") {
    setDoc("subject", docFields.subject || "วิชา");
    setDoc("body", d.output);
  } else if (docType === "lesson-record") {
    setDoc("subject", "วิชา");
    setDoc("results", d.output);
  } else if (docType === "official-letter") {
    setDoc("letterSubject", "รายงานความก้าวหน้านักเรียน");
    setDoc("body", d.output);
  } else if (docType === "certificate") {
    setDoc("detail", d.output);
  }
}

const school = loadSchool();
const docHtml = useMemo(() => {
  const s = loadSchool();
  switch (docType) {
    case "worksheet":
      return buildWorksheetHtml(s, docFields);
    case "lesson-record":
      return buildLessonRecordHtml(s, {
        subject: docFields.subject, unit: docFields.unit, grade: docFields.grade,
        students: docFields.students, date: docFields.date,
        indicators: docFields.indicators, results: docFields.results,
        problems: docFields.problems, fixes: docFields.fixes,
        teacherName: s.teacherName,
      });
    case "official-letter":
      return buildOfficialLetterHtml(s, {
        refNo: docFields.refNo, date: docFields.date, subject: docFields.letterSubject,
        to: docFields.to, body: docFields.body, teacherName: s.teacherName,
        position: s.position,
      });
    case "certificate":
      return buildCertificateHtml(s, {
        studentName: docFields.studentName, detail: docFields.detail,
        directorName: s.directorName, date: docFields.date,
      });
    case "summary":
      return buildSummaryReportHtml(s, approvedDrafts);
  }
}, [docType, docFields, approvedDrafts]);

function handlePrintDoc() {
  if (docType === "summary" && approvedDrafts.length === 0) {
    pushToast("info", "ยังไม่มีงานที่อนุมัติให้พิมพ์สรุป");
    return;
  }
  printDocument(docHtml);
}
```

- [ ] **Step 3: Consume prefill from queue (Task 6 hook)**

Add effect so a pending convert request pre-fills the form:

```tsx
useEffect(() => {
  if (view === "docs" && docPrefill) {
    setDocType(docPrefill.type);
    setDoc("body", docPrefill.content);
    if (docPrefill.type === "official-letter") setDoc("letterSubject", "รายงานความก้าวหน้านักเรียน");
    setDocPrefill(null);
  }
}, [view, docPrefill]);
```

- [ ] **Step 4: Render the docs view**

Inside `<main className="content view-in" key={view}>`, add the third branch:

```tsx
{view === "docs" && (
  <section>
    <div className="panel panel-pad" style={{ marginBottom: 14 }}>
      <h2 className="section-title">เลือกแบบฟอร์มเอกสาร</h2>
      <p className="section-hint" style={{ marginBottom: 14 }}>
        ทุกแบบใช้หัวเอกสารจากหน้า “ตั้งค่าโรงเรียน” — พิมพ์ได้ทันที แม้ออฟไลน์
      </p>
      <div className="docs-grid">
        {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => (
          <button
            key={t}
            type="button"
            className="agent-card"
            aria-pressed={docType === t}
            onClick={() => setDocType(t)}
          >
            <span className="agent-name">{DOC_TYPE_LABEL[t]}</span>
            <span className="agent-desc">
              {t === "summary"
                ? `พิมพ์งานที่อนุมัติแล้วทั้งหมด (${approvedDrafts.length} รายการ)`
                : t === "certificate"
                ? "A4 แนวนอน พร้อมกรอบและช่องลงชื่อผู้อำนวยการ"
                : "A4 ตั้ง พร้อมหัวเอกสารราชการ"}
            </span>
          </button>
        ))}
      </div>
      <Link href="/settings" className="sidebar-link">
        ⚙ ตั้งค่าโรงเรียน (ชื่อ/ที่อยู่/ครูผู้สอน)
      </Link>
    </div>

    <div className="panel panel-pad" style={{ marginBottom: 14 }}>
      <h2 className="section-title">ข้อมูลเอกสาร</h2>
      {docType !== "summary" && docSourceDrafts.length > 0 && (
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-label" htmlFor="doc-source">
            ดึงจากร่างที่อนุมัติแล้ว
          </label>
          <select
            id="doc-source"
            className="select"
            value={docSourceId}
            onChange={(e) => applyDocSource(e.target.value)}
          >
            <option value="">— เลือกร่างที่อนุมัติแล้ว —</option>
            {docSourceDrafts.map((d) => (
              <option key={d.id} value={d.id}>
                {AGENT_LABEL[d.agent]} · {fmtTime(d.createdAt)}
              </option>
            ))}
          </select>
          <span className="field-hint">เนื้อหาจะถูกแทรกเข้าฟิลด์ที่ตรงกันอัตโนมัติ</span>
        </div>
      )}

      {docType === "worksheet" && (
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="field-label" htmlFor="ws-number">ใบงานที่</label>
            <input id="ws-number" className="input" value={docFields.number} onChange={(e) => setDoc("number", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ws-subject">วิชา</label>
            <input id="ws-subject" className="input" value={docFields.subject} onChange={(e) => setDoc("subject", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ws-grade">ชั้น</label>
            <input id="ws-grade" className="input" value={docFields.grade} onChange={(e) => setDoc("grade", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ws-date">วันที่</label>
            <input id="ws-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
          </div>
        </div>
      )}

      {docType === "worksheet" && (
        <>
          <div className="field">
            <label className="field-label" htmlFor="ws-instructions">คำชี้แจง</label>
            <textarea id="ws-instructions" className="textarea" style={{ minHeight: 54 }} value={docFields.instructions} onChange={(e) => setDoc("instructions", e.target.value)} placeholder="จงตอบคำถามต่อไปนี้" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ws-body">เนื้อหา / โจทย์</label>
            <textarea id="ws-body" className="textarea" style={{ minHeight: 140 }} value={docFields.body} onChange={(e) => setDoc("body", e.target.value)} />
          </div>
        </>
      )}

      {docType === "lesson-record" && (
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {([
            ["lr-subject", "subject", "วิชา"],
            ["lr-unit", "unit", "หน่วยการเรียนรู้"],
            ["lr-grade", "grade", "ชั้น"],
            ["lr-students", "students", "จำนวนนักเรียน"],
            ["lr-date", "date", "วันที่สอน"],
          ] as const).map(([id, key, label]) => (
            <div className="field" key={id}>
              <label className="field-label" htmlFor={id}>{label}</label>
              <input id={id} className="input" value={docFields[key]} onChange={(e) => setDoc(key, e.target.value)} />
            </div>
          ))}
        </div>
      )}
      {docType === "lesson-record" && (
        <>
          {([
            ["lr-indicators", "indicators", "มาตรฐาน / ตัวชี้วัด"],
            ["lr-results", "results", "ผลที่เกิดขึ้นจริง"],
            ["lr-problems", "problems", "ปัญหา / อุปสรรค"],
            ["lr-fixes", "fixes", "แนวทางแก้ไข / พัฒนา"],
          ] as const).map(([id, key, label]) => (
            <div className="field" key={id}>
              <label className="field-label" htmlFor={id}>{label}</label>
              <textarea id={id} className="textarea" style={{ minHeight: 64 }} value={docFields[key]} onChange={(e) => setDoc(key, e.target.value)} />
            </div>
          ))}
        </>
      )}

      {docType === "official-letter" && (
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="field-label" htmlFor="ol-ref">ที่</label>
            <input id="ol-ref" className="input" value={docFields.refNo} onChange={(e) => setDoc("refNo", e.target.value)} placeholder={school.refNo} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ol-date">วันที่</label>
            <input id="ol-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ol-subject">เรื่อง</label>
            <input id="ol-subject" className="input" value={docFields.letterSubject} onChange={(e) => setDoc("letterSubject", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="ol-to">เรียน</label>
            <input id="ol-to" className="input" value={docFields.to} onChange={(e) => setDoc("to", e.target.value)} />
          </div>
        </div>
      )}
      {docType === "official-letter" && (
        <div className="field">
          <label className="field-label" htmlFor="ol-body">เนื้อหา</label>
          <textarea id="ol-body" className="textarea" style={{ minHeight: 140 }} value={docFields.body} onChange={(e) => setDoc("body", e.target.value)} />
        </div>
      )}

      {docType === "certificate" && (
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="field-label" htmlFor="cf-name">ชื่อนักเรียน</label>
            <input id="cf-name" className="input" value={docFields.studentName} onChange={(e) => setDoc("studentName", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="cf-date">วันที่</label>
            <input id="cf-date" className="input" value={docFields.date} onChange={(e) => setDoc("date", e.target.value)} />
          </div>
        </div>
      )}
      {docType === "certificate" && (
        <div className="field">
          <label className="field-label" htmlFor="cf-detail">เนื่องในโอกาส / รายละเอียด</label>
          <textarea id="cf-detail" className="textarea" style={{ minHeight: 90 }} value={docFields.detail} onChange={(e) => setDoc("detail", e.target.value)} placeholder="เช่น ได้รับรางวัลชนะเลิศการประกวดอ่านทำนองเสนาะ ระดับชั้น ป.5" />
        </div>
      )}

      {docType === "summary" && (
        <div className="empty">
          <div className="empty-icon">📄</div>
          <div className="empty-title">
            {approvedDrafts.length > 0
              ? `จะพิมพ์ ${approvedDrafts.length} รายการที่อนุมัติแล้ว`
              : "ยังไม่มีงานที่อนุมัติ"}
          </div>
          <p className="empty-text">
            {approvedDrafts.length > 0
              ? "รายงานสรุปจะเรียงตามเวลาที่สร้าง พร้อมหัวเอกสารจากตั้งค่าโรงเรียน"
              : "ไปอนุมัติงานในคิวตรวจก่อน — จากนั้นกลับมาพิมพ์สรุปได้ที่นี่"}
          </p>
        </div>
      )}
    </div>

    <div className="panel panel-pad">
      <h2 className="section-title">ตัวอย่างเอกสาร</h2>
      <div
        className="panel"
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "var(--font)",
          background: "var(--surface-2)",
          borderRadius: 8,
          padding: 12,
          maxHeight: 220,
          overflow: "auto",
        }}
      >
        {docHtml.replace(/<[^>]+>/g, "").slice(0, 400)}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <Button type="button" onClick={handlePrintDoc}>
          🖨 พิมพ์ / บันทึก PDF
        </Button>
        {engine === "backend" && (
          <Button type="button" variant="secondary" onClick={downloadPdf}>
            ⬇ ดาวน์โหลด PDF (server)
          </Button>
        )}
      </div>
      <span className="field-hint" style={{ display: "block", marginTop: 8 }}>
        พิมพ์จากเบราว์เซอร์ แล้วเลือก “บันทึกเป็น PDF” ได้เช่นกัน — ใช้ได้แม้ออฟไลน์
      </span>
    </div>
  </section>
)}
```

- [ ] **Step 5: Add backend-PDF download handler (button wired in Step 4)**

```tsx
async function downloadPdf() {
  try {
    const fields = {
      ...docFields,
      // backend reads `subject`; the letter form stores it as `letterSubject`
      subject: docType === "official-letter" ? docFields.letterSubject : docFields.subject,
    };
    if (docType === "summary") {
      fields.body = approvedDrafts
        .map((d) => `${AGENT_LABEL[d.agent]} — ${fmtTime(d.createdAt)}\n\n${d.output}`)
        .join("\n\n---\n\n");
    }
    const res = await fetch("/api/documents/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: docType, fields, school: loadSchool() }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solven-${docType}-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast("success", "ดาวน์โหลด PDF แล้ว");
  } catch (err) {
    pushToast("error", `สร้าง PDF ไม่สำเร็จ: ${err instanceof Error ? err.message : err}`);
  }
}
```

> Note: `fields` sent to the backend uses the keys from `docFields`, with two
> mappings applied in `downloadPdf` (above): `letterSubject → subject` for the
> official letter, and for `summary` the `body` is the concatenation of all
> approved drafts. Backend Task 8 reads exactly: `number, subject, grade, date,
> instructions, body, unit, students, indicators, results, problems, fixes,
> refNo, to, teacherName, position, studentName, detail, directorName`.

- [ ] **Step 6: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(docs): document studio view — 5 templates, draft-pull, print + backend PDF"
```

---

### Task 6: Teacher dashboard — activity bars, agent strip, convert button

**Files:**
- Modify: `frontend/app/page.tsx` (queue view: stats area, filters area; draft actions)

**Interfaces:**
- Consumes: `goDocs` + `docPrefill` (Task 5); existing `drafts`/`filtered`/`setAgentFilter`/`agentFilter` state
- Produces: nothing new (consumed inline)

- [ ] **Step 1: 7-day activity bars above the stats row**

In the queue view, directly above `<div className="stats-row" ...>`, add:

```tsx
<div className="panel" style={{ marginBottom: 12, padding: "6px 0" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px 0" }}>
    <span className="field-label" style={{ fontSize: "0.72rem" }}>กิจกรรม 7 วันล่าสุด</span>
  </div>
  <div className="activity-bars" aria-label="จำนวนงานที่สร้างใน 7 วัน">
    {(() => {
      const days: { label: string; count: number; isToday: boolean }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toDateString();
        const count = drafts.filter((x) => new Date(x.createdAt).toDateString() === key).length;
        days.push({
          label: d.toLocaleDateString("th-TH", { weekday: "short" }),
          count,
          isToday: i === 0,
        });
      }
      const max = Math.max(1, ...days.map((x) => x.count));
      return days.map((day, i) => (
        <div className="activity-col" key={i} title={`${day.count} รายการ`}>
          <span className="activity-day">{day.count}</span>
          <div
            className="activity-bar"
            data-active={day.isToday}
            style={{ height: `${Math.max(2, (day.count / max) * 100)}%` }}
          />
          <span className="activity-day">{day.label}</span>
        </div>
      ));
    })()}
  </div>
</div>
```

- [ ] **Step 2: Agent strip with counts in the filters area**

Above the existing `.chip-row` status filter in the queue view, add:

```tsx
<div className="agent-strip">
  <button
    type="button"
    className="agent-strip-chip"
    aria-pressed={agentFilter === "all"}
    onClick={() => setAgentFilter("all")}
  >
    ทุกงาน <span className="agent-strip-count">{drafts.length}</span>
  </button>
  {AGENT_OPTIONS.map((a) => {
    const count = drafts.filter((d) => d.agent === a && d.status === "pending").length;
    return (
      <button
        key={a}
        type="button"
        className="agent-strip-chip"
        aria-pressed={agentFilter === a}
        onClick={() => setAgentFilter(agentFilter === a ? "all" : a)}
      >
        {AGENT_LABEL[a]} <span className="agent-strip-count">{count}</span>
      </button>
    );
  })}
</div>
```

- [ ] **Step 3: "ทำเป็นเอกสาร" button on approved drafts**

In `draftActions`, add this **after** the `d.status === "pending"` block (so it renders only for approved drafts), before the copy button:

```tsx
{d.status === "approved" && (
  <Button
    size="sm"
    variant="secondary"
    onClick={() => {
      setDocPrefill({
        type: d.agent === "lesson-plan" ? "lesson-record" : d.agent === "reporting" ? "official-letter" : "worksheet",
        content: d.output,
      });
      goDocs();
    }}
    title="สร้างเอกสารจากร่างนี้ (ใบงาน/บันทึกหลังสอน/หนังสือราชการ)"
  >
    📄 ทำเป็นเอกสาร
  </Button>
)}
```

- [ ] **Step 4: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(ui): teacher dashboard — 7-day activity bars, agent strip, draft-to-document button"
```

---

### Task 7: Command palette + keyboard shortcuts

**Files:**
- Modify: `frontend/lib/commands.ts` (`CommandActions` + `buildCommands`)
- Modify: `frontend/lib/hooks.ts` (`ShortcutHandlers` + `useShortcuts`)
- Modify: `frontend/app/page.tsx` (wire new handlers)

**Interfaces:**
- Consumes: `goDocs` (Task 5); existing `openPalette`/`resetFilters` handlers
- Produces: `goDocs`, `goSettings`, `printCurrent` command actions + shortcut keys `g`/`s`/`p`

- [ ] **Step 1: Extend `frontend/lib/commands.ts`**

Add to `CommandActions` interface:

```ts
  goDocs: (type?: DocType) => void;
  goSettings: () => void;
  printCurrent: () => void;
```

(import `DocType` from `@/lib/documents`)

Add commands in `buildCommands` after the `go-queue` item:

```ts
    {
      id: "go-docs",
      group: "ไปยังหน้า",
      label: "เอกสาร",
      hint: "g",
      keywords: "เอกสาร ใบงาน เกียรติบัตร หนังสือ docs print พิมพ์",
      onSelect: () => actions.goDocs(),
    },
    {
      id: "go-settings",
      group: "ไปยังหน้า",
      label: "ตั้งค่าโรงเรียน",
      hint: "s",
      keywords: "ตั้งค่า โรงเรียน settings",
      onSelect: () => actions.goSettings(),
    },
    {
      id: "print-current",
      group: "เอกสาร",
      label: "พิมพ์เอกสารปัจจุบัน",
      hint: "p",
      keywords: "พิมพ์ pdf print เอกสาร",
      onSelect: () => actions.printCurrent(),
    },
```

- [ ] **Step 2: Extend `frontend/lib/hooks.ts`**

Add to `ShortcutHandlers`:

```ts
  goDocs?: () => void;
  goSettings?: () => void;
  printCurrent?: () => void;
```

Add keys in `useShortcuts` (inside the `onKey` handler, after the `c` branch):

```ts
      } else if (e.key.toLowerCase() === "g") {
        ref.current.goDocs?.();
      } else if (e.key.toLowerCase() === "s") {
        ref.current.goSettings?.();
      } else if (e.key.toLowerCase() === "p") {
        ref.current.printCurrent?.();
      }
```

- [ ] **Step 3: Wire in `frontend/app/page.tsx`**

In the `buildCommands` call, add:

```tsx
        goDocs: (type) => goDocs(type),
        goSettings: () => {
          window.location.href = "/settings";
        },
        printCurrent: () => {
          if (view === "docs") handlePrintDoc();
          else pushToast("info", "ไปที่หน้าเอกสาร แล้วกดพิมพ์อีกครั้ง");
        },
```

In the `useShortcuts` call, add:

```tsx
      goDocs: () => goDocs(),
      goSettings: () => {
        window.location.href = "/settings";
      },
      printCurrent: () => {
        if (view === "docs") handlePrintDoc();
      },
```

Update `useShortcuts` deps array + `paletteItems` useMemo deps to include `goDocs`, `handlePrintDoc`.

- [ ] **Step 4: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/commands.ts frontend/lib/hooks.ts frontend/app/page.tsx
git commit -m "feat(ux): palette commands + shortcuts for docs/settings/print"
```

---

### Task 8: Backend PDF — renderer, schema, route, tests (TDD)

**Files:**
- Create: `backend/app/documents.py`
- Create: `backend/app/static/fonts/NotoSansThai-Regular.ttf` (vendored, SIL OFL)
- Create: `backend/tests/test_documents.py`
- Modify: `backend/app/schema.py` (add `DocumentRenderRequest`)
- Modify: `backend/app/main.py` (register route inside `create_app`)
- Modify: `backend/requirements.txt` (add `reportlab==4.4.4`)

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone service); pydantic v2 patterns from `backend/app/schema.py`
- Produces: `render_document(kind: str, fields: dict, school: dict | None = None) -> bytes`; route `POST /api/documents/render` (auth via existing `require_token` dep) returning `application/pdf`; 400 bad kind / missing fields; 503 when reportlab missing — consumed by BFF Task 9

- [ ] **Step 1: Install + pin reportlab**

```bash
pip install reportlab==4.4.4
```

Add `reportlab==4.4.4` to `backend/requirements.txt` (keep alphabetical order after `pydantic-settings`).

- [ ] **Step 2: Vendor the Thai font**

```bash
mkdir -p backend/app/static/fonts
Invoke-WebRequest -Uri "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf" -OutFile "backend/app/static/fonts/NotoSansThai-Regular.ttf"
```

Verify: file exists and size > 100 KB. Fallback if the raw link 404s (variable-font risk: reportlab's TTFont does NOT support variable fonts, so always prefer a static TTF):
1. `https://github.com/google/fonts/raw/main/ofl/notosansthai/static/NotoSansThai-Regular.ttf` (google/fonts keeps a `static/` folder alongside variable fonts)
2. If both fail, stop and ask — do NOT commit a variable font or a non-Thai font.

- [ ] **Step 3: Write the failing test — `backend/tests/test_documents.py`**

```python
"""Tests: /api/documents/render — PDF generation (reportlab, Thai font)."""

import re
import zlib

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

TOKEN = "test-token"


def pdf_contains(content: bytes, needle: str) -> bool:
    """Search rendered PDF text (decompressing content streams)."""
    text = b""
    for m in re.finditer(rb"stream\r?\n(.*?)endstream", content, re.S):
        chunk = m.group(1)
        try:
            text += zlib.decompress(chunk)
        except Exception:
            text += chunk
    return needle.encode("utf-8") in text


@pytest.fixture()
def client():
    app = create_app(Settings(api_token=TOKEN, db_path=":memory:"))
    return TestClient(app)


def auth() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def test_render_worksheet_returns_pdf(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "worksheet",
            "fields": {
                "number": "1",
                "subject": "คณิตศาสตร์",
                "grade": "ป.5",
                "date": "15 ส.ค. 2569",
                "instructions": "จงตอบ",
                "body": "1+1 = ?",
            },
        },
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


def test_render_certificate_landscape(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "certificate",
            "fields": {"studentName": "เด็กชายดี", "detail": "ชนะเลิศ", "directorName": "นายใหญ่", "date": "15 ส.ค. 2569"},
        },
    )
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


def test_render_includes_school_name(client):
    """REVIEW FIX 1: school must reach the PDF, not vanish in the BFF chain."""
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "worksheet",
            "school": {"schoolName": "โรงเรียนบ้านสวนฝั่งสุข", "address": "12 หมู่ 3", "district": "สพป."},
            "fields": {"subject": "คณิต", "grade": "ป.5", "body": "โจทย์"},
        },
    )
    assert r.status_code == 200
    assert pdf_contains(r.content, "โรงเรียนบ้านสวนฝั่งสุข")


def test_render_escapes_markup_in_body(client):
    """REVIEW FIX 2: teacher text with `<`, `&` must not break Paragraph."""
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={
            "kind": "worksheet",
            "fields": {"subject": "คณิต", "grade": "ป.5", "body": "3 < 5 และ 7 & 8 ≥ 10"},
        },
    )
    assert r.status_code == 200
    assert pdf_contains(r.content, "3 < 5")


def test_render_unknown_kind_400(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={"kind": "spaceship", "fields": {}},
    )
    assert r.status_code == 400


def test_render_missing_required_field_400(client):
    r = client.post(
        "/api/documents/render",
        headers=auth(),
        json={"kind": "worksheet", "fields": {"number": "1"}},  # subject/body missing
    )
    assert r.status_code == 400


def test_render_requires_auth(client):
    r = client.post("/api/documents/render", json={"kind": "worksheet", "fields": {}})
    assert r.status_code == 401
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pytest tests/test_documents.py -v`
Expected: FAIL — 404 (route does not exist)

- [ ] **Step 5: Implement `backend/app/documents.py`**

```python
"""Server-side PDF rendering for Solven documents (reportlab + Noto Sans Thai).

Client-side print is the primary path (works offline). This endpoint is an
enhancement: when reportlab is unavailable the route returns 503 and the UI
hides the download button — never a hard failure.
"""

import logging
from pathlib import Path
from xml.sax.saxutils import escape as _esc

_FONT_DIR = Path(__file__).parent / "static" / "fonts"
_FONT_PATH = _FONT_DIR / "NotoSansThai-Regular.ttf"

log = logging.getLogger("solven.documents")

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    pdfmetrics.registerFont(TTFont("NotoSansThai", str(_FONT_PATH)))
    _AVAILABLE = True
except Exception as exc:  # pragma: no cover - import guard
    log.warning("reportlab/Thai font unavailable: %s", exc)
    _AVAILABLE = False

_KINDS = {"worksheet", "lesson-record", "official-letter", "certificate", "summary"}

_REQUIRED: dict[str, set[str]] = {
    "worksheet": {"subject", "grade", "body"},
    "lesson-record": {"subject", "results"},
    "official-letter": {"subject", "to", "body"},
    "certificate": {"studentName", "detail"},
    "summary": set(),  # body comes from school + draft text in `body`
}


def render_document(kind: str, fields: dict, school: dict | None = None) -> bytes:
    """Render one document to PDF bytes. Raises ValueError on invalid input,
    RuntimeError when reportlab is unavailable."""
    if not _AVAILABLE:
        raise RuntimeError("pdf renderer unavailable")
    if kind not in _KINDS:
        raise ValueError(f"unknown kind: {kind}")
    missing = _REQUIRED[kind] - set(fields or {})
    if missing:
        raise ValueError(f"missing fields: {sorted(missing)}")
    school = school or {}

    def _s(key: str, default: str = "") -> str:
        # escape before it ever reaches Paragraph markup (REVIEW FIX 2):
        # raw `<`, `&`, `>` from teacher text would break reportlab parsing
        return _esc(str(fields.get(key) or default))

    from io import BytesIO

    bio = BytesIO()

    def _para(text: str, style: ParagraphStyle) -> Paragraph:
        # Python str.replace replaces ALL occurrences (REVIEW FIX 3) —
        # newlines → <br/> across the whole text
        return Paragraph(text.replace("\n", "<br/>"), style)

    styles = {
        "head": ParagraphStyle("head", fontName="NotoSansThai", fontSize=15, leading=20, alignment=1),
        "sub": ParagraphStyle("sub", fontName="NotoSansThai", fontSize=10, leading=14, alignment=1),
        "title": ParagraphStyle("title", fontName="NotoSansThai", fontSize=13, leading=17, alignment=1, spaceAfter=8),
        "body": ParagraphStyle("body", fontName="NotoSansThai", fontSize=10.5, leading=16),
        "label": ParagraphStyle("label", fontName="NotoSansThai", fontSize=10, leading=15),
        "value": ParagraphStyle("value", fontName="NotoSansThai", fontSize=10, leading=15),
    }

    def _school_header(flow, school: dict):
        flow.append(_para(_esc(str(school.get("schoolName") or "โรงเรียน")), styles["head"]))
        flow.append(_para(_esc(str(school.get("address") or "")), styles["sub"]))
        flow.append(_para(_esc(str(school.get("district") or "")), styles["sub"]))
        flow.append(Spacer(1, 4 * mm))

    doc = SimpleDocTemplate(
        bio,
        pagesize=landscape(A4) if kind == "certificate" else A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    flow = []
    _school_header(flow, school)

    if kind == "worksheet":
        flow.append(_para(f"ใบงานที่ {_s('number') or '___'}", styles["title"]))
        flow.append(_para(f"วิชา {_s('subject')} · ชั้น {_s('grade')} · วันที่ {_s('date')}", styles["sub"]))
        flow.append(Spacer(1, 3 * mm))
        flow.append(_para("ชื่อ-สกุล ______________________________ เลขที่ ______", styles["value"]))
        flow.append(Spacer(1, 3 * mm))
        flow.append(_para(f"คำชี้แจง: {_s('instructions') or 'จงตอบคำถามต่อไปนี้'}", styles["value"]))
        flow.append(Spacer(1, 3 * mm))
        flow.append(_para(_s("body"), styles["body"]))
    elif kind == "lesson-record":
        flow.append(_para("บันทึกหลังสอน", styles["title"]))
        rows = [
            ("วิชา / หน่วยการเรียนรู้", f"{_s('subject')} / {_s('unit')}"),
            ("ระดับชั้น / จำนวนนักเรียน", f"{_s('grade')} / {_s('students')} คน"),
            ("วันที่สอน", _s("date")),
            ("มาตรฐาน / ตัวชี้วัด", _s("indicators")),
            ("ผลที่เกิดขึ้นจริง", _s("results")),
            ("ปัญหา / อุปสรรค", _s("problems")),
            ("แนวทางแก้ไข / พัฒนา", _s("fixes")),
        ]
        data = [[_para(label, styles["label"]), _para(value, styles["value"])] for label, value in rows]
        table = Table(data, colWidths=[52 * mm, 118 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("BACKGROUND", (0, 0), (0, -1), colors.Color(0.96, 0.96, 0.96)),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        flow.append(table)
        flow.append(Spacer(1, 8 * mm))
        flow.append(_para(f"ลงชื่อ ____________________ ครูผู้สอน   ( {_s('teacherName')} )", styles["value"]))
    elif kind == "official-letter":
        flow.append(_para(f"ที่ {_s('refNo') or school.get('refNo') or '____/2569'} วันที่ {_s('date')}", styles["value"]))
        flow.append(_para(f"<b>เรื่อง</b> {_s('subject')}", styles["value"]))
        flow.append(_para(f"<b>เรียน</b> {_s('to')}", styles["value"]))
        flow.append(Spacer(1, 4 * mm))
        flow.append(_para(_s("body"), styles["body"]))
        flow.append(Spacer(1, 8 * mm))
        flow.append(
            _para(
                f"ลงชื่อ ____________________<br/>( {_s('teacherName')} )<br/>{_s('position')}<br/>{school.get('schoolName') or ''}",
                styles["value"],
            )
        )
    elif kind == "certificate":
        flow.append(_para("เกียรติบัตร", ParagraphStyle("cert", parent=styles["title"], fontSize=26, leading=32, spaceBefore=30)))
        flow.append(_para("ขอประกาศว่า", styles["sub"]))
        flow.append(
            _para(
                _s("studentName"),
                ParagraphStyle("name", parent=styles["head"], fontSize=22, leading=28, spaceBefore=8, spaceAfter=8),
            )
        )
        flow.append(_para(_s("detail"), styles["body"]))
        flow.append(Spacer(1, 14 * mm))
        flow.append(
            _para(
                f"ลงชื่อ ____________________<br/>( {_s('directorName')} )<br/>ผู้อำนวยการ",
                ParagraphStyle("sign", parent=styles["value"], alignment=2),
            )
        )
    elif kind == "summary":
        flow.append(_para("รายงานสรุปผลงานที่อนุมัติแล้ว", styles["title"]))
        flow.append(_para(_s("body"), styles["body"]))

    doc.build(flow)
    return bio.getvalue()
```

- [ ] **Step 6: Add request model to `backend/app/schema.py`**

```python
class DocumentRenderRequest(BaseModel):
    kind: str
    fields: dict = {}
    school: dict = {}
```

(Append at the end of the file, keeping the existing `from pydantic import ...` import line untouched.)

- [ ] **Step 7: Register the route in `backend/app/main.py`**

Inside `create_app()`, after the `/api/audit` route (before `return app`), add:

```python
    from app.documents import render_document
    from app.schema import DocumentRenderRequest

    @app.post("/api/documents/render", dependencies=[require_token], tags=["api"])
    def render_doc(body: DocumentRenderRequest):
        try:
            pdf = render_document(body.kind, body.fields, body.school)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from exc
        except Exception as exc:  # noqa: BLE001 - PDF failure is a 500 with reason
            raise HTTPException(500, f"pdf render failed: {exc}") from exc
        from fastapi.responses import Response

        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="solven-document.pdf"'},
        )
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pytest tests/test_documents.py -v`
Expected: PASS (all 7)

- [ ] **Step 9: Run the full backend suite**

Run: `pytest`
Expected: PASS (all suites)

- [ ] **Step 10: Commit**

```bash
git add backend/app/documents.py backend/app/static/fonts backend/app/schema.py backend/app/main.py backend/requirements.txt backend/tests/test_documents.py
git commit -m "feat(backend): /api/documents/render — PDF via reportlab + Thai font (tests green)"
```

---

### Task 9: BFF proxy — `frontend/app/api/documents/render/route.ts`

**Files:**
- Create: `frontend/app/api/documents/render/route.ts`

**Interfaces:**
- Consumes: `requirePrincipal` from `@/lib/bffAuth`; `API_URL`/`API_TOKEN` pattern from `@/lib/backend` (same env vars)
- Produces: `POST /api/documents/render` for the frontend `downloadPdf()` (Task 5)

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/bffAuth";

const API_URL =
  process.env.SOLVEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_SOLVEN_API_URL ??
  "http://localhost:8000";
const API_TOKEN = process.env.SOLVEN_API_TOKEN ?? "";

const VALID_KINDS = ["worksheet", "lesson-record", "official-letter", "certificate", "summary"];

export async function POST(req: NextRequest) {
  const guard = requirePrincipal(req);
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { kind, fields, school } = body as {
    kind?: string;
    fields?: Record<string, unknown>;
    school?: Record<string, unknown>;
  };

  if (!kind || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  }
  if (!fields || typeof fields !== "object") {
    return NextResponse.json({ error: "fields required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/documents/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        "x-solven-principal": guard.principal.teacherId,
        ...(guard.principal.tenant
          ? { "x-solven-tenant": guard.principal.tenant }
          : {}),
      },
      signal: AbortSignal.timeout(30000),
      // REVIEW FIX 1: forward school verbatim — the backend needs it for the
      // document header; dropping it here empties every server PDF
      body: JSON.stringify({ kind, fields, school: school ?? {} }),
    });
    if (!res.ok) {
      let detail = `backend ${res.status}`;
      try {
        const body = (await res.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        /* non-JSON error body — keep status */
      }
      return NextResponse.json({ error: detail }, { status: 502 });
    }
    const pdf = await res.arrayBuffer();
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="solven-document.pdf"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/documents/render/route.ts
git commit -m "feat(docs): BFF proxy for /api/documents/render"
```

---

### Task 10: End-to-end verification

**Files:**
- None (verification only)

- [ ] **Step 1: Frontend gates**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 2: Backend suite**

Run: `pytest`
Expected: PASS (all suites, incl. `test_documents.py`)

- [ ] **Step 3: Manual checklist (browser)**

1. `/settings` — change school name → save → toast; reload keeps values.
2. สร้างงาน → อนุมัติ 1-2 ร่างในคิว → queue shows activity bars + agent strip counts.
3. กด “📄 ทำเป็นเอกสาร” บน draft ที่อนุมัติ → กระโดดไปหน้าเอกสารพร้อมเนื้อหา prefilled.
4. ใบงาน: กรอก → preview แสดงข้อความ → พิมพ์ → print dialog แสดงเฉพาะเอกสาร A4 (CSS ถูก).
5. หนังสือราชการ: ดึงจากร่าง reporting ที่อนุมัติ → พิมพ์.
6. เกียรติบัตร: landscape — print preview แนวนอน.
7. รายงานสรุป: พิมพ์ทั้งหมดที่อนุมัติ.
8. Offline (DevTools → offline): ปุ่ม “ดาวน์โหลด PDF (server)” หาย; พิมพ์ยังทำงาน.
9. ⌘K: “เอกสาร”, “ตั้งค่า”, “พิมพ์” ทำงาน; ปุ่ม `g`/`s`/`p` ทำงาน (desktop, นอกฟอร์ม).

- [ ] **Step 4: Update `DESIGN.md` (document studio section, 3-4 lines)**

Append to `DESIGN.md`:

```markdown
## Document Studio (15 Aug 2026 — v0.3)

- View `docs` renders 5 print-ready Thai school documents (ใบงาน/บันทึกหลังสอน/หนังสือราชการ/เกียรติบัตร/รายงานสรุป) from `lib/documents.ts` pure builders.
- `/settings` page persists school header info to `localStorage["solven.school"]` (via `lib/school.ts`).
- Printing = `#print-root` + `@media print` (offline-capable); backend PDF via `/api/documents/render` (reportlab + vendored NotoSansThai) shown only when engine=backend.
```

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md
git commit -m "docs: DESIGN.md — document studio v0.3 section"
```

---

## Self-Review (completed by planner + review pass 1)

**Review pass 1 (auditor, commit 1e821c0) — all blockers fixed:**

1. **HIGH — school dropped in PDF chain:** `DocumentRenderRequest.school: dict = {}` added (schema) → BFF forwards `school` verbatim (Task 9) → `render_document(kind, fields, school)` renders header from the param (Task 8) → new test `test_render_includes_school_name` asserts school name is actually inside the PDF bytes (decompressed content streams).
2. **HIGH — unescaped markup in reportlab:** `xml.sax.saxutils.escape` applied at value level (`_s()` + `_school_header`), so structural `<b>` markup stays intact while teacher text (`<`, `&`, `≥`) is escaped → new test `test_render_escapes_markup_in_body` ("3 < 5 และ 7 & 8" → 200 + text present).
3. **MEDIUM — newline replace:** Python `str.replace` replaces all occurrences; commented in `_para()` so future readers don't "fix" it into a regex.
4. **MEDIUM — certificate print orientation:** `@page landscape { size: A4 landscape }` + `.doc-landscape { page: landscape }` added (Task 3) — browser uses landscape paper for certificates.
5. **LOW batch:** `buf = []` dead line removed; "วิชา" ternary simplified; Task 6 wording de-contradicted; preview div no longer uses `.doc-preview` (line-clamp vs scroll overflow conflict); font fallback now points at google/fonts `static/` TTF (variable fonts unsupported by TTFont — stop-and-ask if unavailable). `ToastProvider` in `/settings` is a single provider (page-local, correct for a separate route); `summary` requires no fields by design (frontend concatenates body).

**Spec coverage:** 5 doc types → Tasks 2/5/8 ✓ · settings page → Task 4 ✓ · dashboard bars + agent strip → Task 6 ✓ · convert button → Task 6 ✓ · palette/shortcuts → Task 7 ✓ · print CSS → Task 3 ✓ · backend PDF + font + tests → Task 8 ✓ · BFF → Task 9 ✓ · DESIGN.md touch → Task 10 ✓
**Placeholders:** none — every step carries code.
**Type consistency:** `SchoolInfo`/`DocType`/field interfaces defined in Tasks 1-2 and used verbatim in 4-8; backend field mapping mirrors frontend `docFields` keys, with the two explicit mappings (`letterSubject → subject`, summary `body` concatenation) already applied inside Task 5 `downloadPdf`; `school` now flows frontend → BFF → backend → renderer end-to-end.
