# Solven Document Studio — Design (v0.3)

> Status: approved 15 Aug 2026 · Follows the Stripe grammar pinned in `DESIGN.md`
> (light canvas, navy ink, indigo accent). No dark mode — the design contract
> pins the light world.

## Goal

Make Solven the teacher's one-stop document desk: create → review → approve →
**turn into a ready-to-print Thai school document** (ใบงาน, บันทึกหลังสอน,
หนังสือราชการ, เกียรติบัตร, รายงานสรุป) — plus a teacher dashboard and a
polish pass on UX/visuals. All document generation is **client-side first**
(print/PDF from the browser, works offline), with a **backend PDF endpoint**
as an enhancement that degrades gracefully.

## Architecture

- Frontend SPA (`frontend/app/page.tsx`) gains a third view: `"docs"`.
- New route `/settings` (separate page, mirrors `/about` pattern).
- Document HTML is built by pure functions in a new `frontend/lib/documents.ts`
  (no dependencies, unit-testable by hand).
- School settings live in `localStorage` (`solven.school`), read/written via a
  new `frontend/lib/school.ts`.
- Printing: dedicated `@media print` CSS in `frontend/app/globals.css` hides the
  app shell and shows only the document area at A4 size.
- Backend PDF: new `POST /api/documents/render` (FastAPI + reportlab + vendored
  Noto Sans Thai TTF). Frontend BFF proxy mirrors `api/coordinator` pattern.
  When offline/mock (backend unreachable), the button hides — print still works.

## Features

### 1. Document Studio (`view === "docs"` in `frontend/app/page.tsx`)

Card grid of 5 document types (reuses `.agent-grid`/`.agent-card` grammar):

| Type | Fields | Notes |
|---|---|---|
| ใบงาน (worksheet) | subject, topic, grade, date, instructions, body, name/no. box | pulls from approved `grading` drafts |
| บันทึกหลังสอน | subject/unit, date, class, students, indicators, results, problems, fixes, signature | pulls from approved `lesson-plan` drafts |
| หนังสือราชการ | เรื่อง, เรียน, เนื้อหา, signature | pulls from approved `reporting` drafts |
| เกียรติบัตร | student name, occasion, detail, director name, date | A4 landscape, double-line frame |
| รายงานสรุป | — | one-click print of ALL approved drafts (teacher's record) |

Common controls per type:
- **พิมพ์ / บันทึก PDF** — `window.print()` + print CSS (always available)
- **ดาวน์โหลด PDF (backend)** — visible only when backend reachable
- **ดึงจากร่างที่อนุมัติ** — `<select>` of `drafts.filter(d => d.status === "approved")`,
  filtered by matching agent; inserts text into the content field
- School header (name/address) from `/settings` via `lib/school.ts`

### 2. Settings page — NEW `frontend/app/settings/page.tsx`

- Fields: school name, address, phone, teacher name, position, district/province,
  semester/academic year, director name (for certificates)
- Persist to `localStorage["solven.school"]`; demo defaults on first load
- Sidebar link "ตั้งค่าโรงเรียน" added in `frontend/app/page.tsx` sidebar-foot
- Uses existing `Button`/`ConfirmDialog`? No — plain form + `useToast` only

### 3. New libs

- `frontend/lib/documents.ts` — pure builders:
  `buildWorksheetHtml()`, `buildLessonRecordHtml()`, `buildOfficialLetterHtml()`,
  `buildCertificateHtml()`, `buildSummaryReportHtml()`, shared `docShell()` +
  `schoolHeader()`. All return sanitized HTML strings rendered via `dangerouslySetInnerHTML` inside the print area (content is teacher-owned, not untrusted input).
- `frontend/lib/school.ts` — `loadSchool()`, `saveSchool()`, `SchoolInfo` type,
  `SCHOOL_DEFAULTS` (ตัวอย่าง: "โรงเรียนบ้านสวนฝั่งสุข").

### 4. Teacher dashboard (workflow) — `frontend/app/page.tsx`

- **7-day activity bars** above the queue stats: CSS-only bars (flex divs,
  heights from counts of drafts created per day, last 7 days)
- **Agent strip with counts** in queue filters: grading/lesson-plan/reporting
  chips showing pending counts; clicking sets `agentFilter`
- Stats row (CountUp) unchanged

### 5. Draft → document conversion — `frontend/app/page.tsx`

- On approved drafts in queue: button **ทำเป็นเอกสาร** (`📄`)
- Maps: `grading → ใบงาน`, `lesson-plan → บันทึกหลังสอน`, `reporting → หนังสือราชการ`
- Switches to `docs` view, preselects the type and pre-fills content from `d.output`

### 6. UX / visual polish

- Agent cards: selected state = indigo ring + tinted icon tile + ✓ (CSS only,
  `frontend/app/globals.css`)
- Command palette (`frontend/lib/commands.ts`): add `ไปเอกสาร`, `ตั้งค่าโรงเรียน`,
  `พิมพ์เอกสารปัจจุบัน`
- Shortcuts (`frontend/app/page.tsx` via `useShortcuts`, desktop only):
  `G` → docs, `S` → settings, `P` → print
- Card hover lift, consistent focus rings, studio empty states
- Document cards in studio show a mini text preview (first ~80 chars)

### 7. Backend PDF endpoint (enhancement)

- NEW `backend/app/documents.py` — reportlab renderer:
  `render_document(kind, fields) -> bytes` (Platypus: Paragraph + Table +
  landscape for certificate)
- NEW `backend/app/static/fonts/NotoSansThai-Regular.ttf` — vendored (SIL OFL),
  registered once via `pdfmetrics.registerFont`
- Route added in `backend/app/main.py`: `POST /api/documents/render`
  (validates `kind` in {worksheet, lesson-record, official-letter, certificate,
  summary}, returns `application/pdf`; 400 on bad kind, 503 when reportlab
  missing)
- NEW `backend/tests/test_documents.py` — pytest: happy path returns PDF bytes
  with `%PDF` magic, bad kind → 400, missing fields → 400
- `backend/requirements.txt` — add `reportlab==4.4.4` (pin, per repo policy)
- BFF proxy NEW `frontend/app/api/documents/render/route.ts` — mirrors
  `api/coordinator/route.ts` (`requirePrincipal`, `SOLVEN_BACKEND_URL`, bearer
  token), forwards JSON body, streams PDF response back

## File change list (complete)

| Path | Action |
|---|---|
| `frontend/app/page.tsx` | add `docs` view, dashboard bars, agent strip, convert button, shortcuts, sidebar link |
| `frontend/app/settings/page.tsx` | NEW settings page |
| `frontend/lib/documents.ts` | NEW document HTML builders |
| `frontend/lib/school.ts` | NEW school settings store |
| `frontend/lib/commands.ts` | add palette commands |
| `frontend/app/globals.css` | print CSS, `.agent-card` selected, bars, doc previews |
| `frontend/app/api/documents/render/route.ts` | NEW BFF proxy |
| `backend/app/documents.py` | NEW reportlab renderer |
| `backend/app/main.py` | add render route |
| `backend/app/static/fonts/NotoSansThai-Regular.ttf` | NEW vendored font |
| `backend/requirements.txt` | add reportlab pin |
| `backend/tests/test_documents.py` | NEW tests |

## Verification

- `npm run typecheck` && `npm run build` (frontend)
- `pytest` in `backend/` (all suites incl. new `test_documents.py`)
- Manual: print each of 5 types; settings round-trip; offline → PDF button
  hidden, print still works; queue → convert → docs prefilled

## Out of scope

- Dark mode (design contract), backend DB schema changes, real student data,
  real PDF text extraction, multi-teacher accounts
