# Solven Pro UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ยกระดับ Solven เป็น UI ระดับมืออาชีพ (Stripe grammar + Tailwind v4 + shadcn-style tokens) พร้อม 7 ฟีเจอร์ความอำนวยสะดวกที่อนุมัติแล้ว — ทุกอย่างใช้งานได้จริงก่อน deadline 16 ส.ค. 2569

**Architecture:** เพิ่ม Tailwind v4 เป็นเลเยอร์ token/utility บน CSS เดิม (component classes เดิมยังใช้ได้ → migration ไม่พัง); feature logic แยกเป็น hooks/lib; page.tsx เหลือแค่ wiring; backend API ไม่แตะ

**Tech Stack:** Next.js 14.2.35 (App Router) · React 18.3 · Tailwind CSS v4 (`@tailwindcss/postcss`) · motion 13.1 (มีแล้ว) · TypeScript 5.5 · PWA/SW เดิม

## Global Constraints

- เดิมพัน: ทุก task ต้องจบด้วย `npm run typecheck` (0 error) + `npm run build` (exit 0) — ถ้า build พัง ต้องแก้ก่อน commit
- ไม่แตะ backend (FastAPI) หรือ API shape: `/api/coordinator` POST, `/api/drafts` GET, `/api/drafts/[id]` PATCH — ใช้ `lib/backend.ts`/fetch เดิม
- ไม่เพิ่ม dependency นอกเหนือ: `tailwindcss@4`, `@tailwindcss/postcss`, `postcss` (+ `clsx`, `tailwind-merge` เฉพาะถ้าจำเป็นจริง) — ห้าม radix/base-ui/vitest/axios ฯลฯ
- ห้าม copy source จาก ReactBits Pro / Aceternity paid — ใช้ pattern reference เท่านั้น; ของที่ copy ได้: ReactBits ฟรี (MIT, vendored แล้ว), Magic UI keyframes (MIT), COSS (MIT apps/ui) pattern logic
- copy ข้อความภาษาไทยเดิมคงเดิม (ห้ามแก้คำ/วลีที่มีอยู่) — เพิ่มได้เฉพาะ hint/aria-label/ข้อความใหม่
- ทุก animation/transition ต้องมี `prefers-reduced-motion: reduce` guard (มีอยู่แล้วใน globals.css — รักษาไว้)
- Windows shell: ใช้ `C:\Program Files\nodejs\npm.cmd` (node ไม่ได้อยู่ใน PATH ของ shell นี้)
- ขอบเขต: `frontend/` เท่านั้น + `README.md`/`DESIGN.md` ที่ root — อย่าแตะ `Meta/`, `backend/`, `.github/`

---

### Task 0: Tailwind v4 Bootstrap (risk gate — ทำก่อนทุกอย่าง)

**Files:**
- Create: `frontend/postcss.config.mjs`
- Modify: `frontend/package.json` (deps)
- Modify: `frontend/app/globals.css` (เพิ่ม 1 บรรทัดบนสุด)

**Interfaces:**
- Produces: Tailwind v4 ทำงานใน build — task 1+ ใช้ `@theme inline`, `@layer`, `@utility` ได้

- [ ] **Step 1: ติดตั้ง dependencies**

```bash
& 'C:\Program Files\nodejs\npm.cmd' install tailwindcss @tailwindcss/postcss postcss
```
(รันใน `frontend/`)

- [ ] **Step 2: สร้าง `frontend/postcss.config.mjs`**

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

- [ ] **Step 3: เพิ่ม import บนสุดของ `globals.css`**

```css
@import "tailwindcss";
```
(บรรทัดแรกของไฟล์ — CSS เดิมทั้งหมดอยู่ข้างล่าง ยังไม่ลบ)

- [ ] **Step 4: ตรวจ build**

```bash
& 'C:\Program Files\nodejs\npm.cmd' run build
```
Expected: exit 0, `✓ Compiled successfully`. ถ้า Tailwind v4 error กับ Next 14 → **fallback ตามหลักฐาน**: `npm install tailwindcss@3 @tailwindcss/postcss@latest` ไม่ได้ → ใช้ `tailwindcss@3.4.x` + `postcss.config.js` แบบ v3 (config: `plugins: { tailwindcss: {}, autoprefixer: {} }` + `npx tailwindcss init -p`) แล้วบันทึกเหตุผลใน commit — tokens เหมือนกันทั้งสองทาง

- [ ] **Step 5: typecheck**

```bash
& 'C:\Program Files\nodejs\npm.cmd' run typecheck
```
Expected: 0 error

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/postcss.config.mjs frontend/app/globals.css
git commit -m "chore(tailwind): bootstrap Tailwind v4 postcss pipeline (risk gate)"
```

---

### Task 1: Design Tokens + Component Layer (shadcn-style)

**Files:**
- Modify: `frontend/app/globals.css` (ทั้งไฟล์ — จัดระเบียบเป็น @theme + @layer)

**Interfaces:**
- Produces: CSS variables `--background/--foreground/--primary/--secondary/--muted/--accent/--destructive/--border/--input/--ring/--success/--warning` + utility classes ต่อไปนี้ (ใช้ใน Task 2): `.focus-ring`, `.spinner`, `.drawer-mask`, `.drawer-panel`, `.cmd-palette`, `.bulk-bar`, `.draft-checkbox`, `.sort-select`, `.undo-btn`, `.kbd-hint`, `.btn-success` (state machine: `.btn-loading` มีแล้ว), `.sr-only` (ถ้าไม่มี)

- [ ] **Step 1: จัด globals.css เป็นโครงสร้าง**

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--ink);
  --color-card: var(--surface);
  --color-card-foreground: var(--ink);
  --color-popover: var(--surface);
  --color-popover-foreground: var(--ink);
  --color-primary: var(--accent);
  --color-primary-foreground: #ffffff;
  --color-secondary: var(--surface-2);
  --color-secondary-foreground: var(--ink);
  --color-muted: var(--surface-2);
  --color-muted-foreground: var(--muted);
  --color-accent: var(--accent-soft);
  --color-accent-foreground: var(--accent);
  --color-destructive: var(--danger);
  --color-destructive-foreground: #ffffff;
  --color-border: var(--line);
  --color-input: var(--line-strong);
  --color-ring: var(--accent);
  --color-success: var(--ok);
  --color-warning: var(--warn);
  --radius-sm: 6px;
  --radius: 12px;
  --font-sans: var(--font-inter), var(--font-noto-thai), "Noto Sans Thai", "Segoe UI", system-ui, sans-serif;
}

@layer base { /* body, :focus-visible, ::selection, h1-h3/p reset, reduced-motion — ย้ายจาก :root/body เดิม */ }
@layer components { /* .shell .sidebar .nav-item .btn* .badge* .panel .input .select .textarea .chip* .stat* .draft* .empty* .toast* .skeleton* .agent-* .field* — คัดลอกเดิมทั้งหมด ไม่เปลี่ยนค่า */ }
@layer utilities { /* .focus-ring .spinner .drawer-mask .drawer-panel .cmd-palette .bulk-bar .draft-checkbox .sort-select .undo-btn .kbd-hint .btn-success .sr-only */ }
```

Rule: ค่าทุก token ไม่เปลี่ยนจากเดิม (ดู spec §4.1) — แค่ย้ายที่อยู่; CSS selector เดิมทั้งหมดต้องยัง match กับ JSX เดิมเป๊ะ

- [ ] **Step 2: เพิ่ม utilities ใหม่** — spinner (CSS border-spin, มี `@keyframes spin` อยู่แล้ว), focus-ring (2px indigo ring), drawer (transform translateY + snap classes + mask fade), cmd-palette (dialog overlay + panel), bulk-bar (fixed/sticky bottom bar white + hairline + shadow), draft-checkbox (accent color, 20px), undo-btn (text button + underline hover), kbd-hint (mono chip), btn-success (green flash state)

- [ ] **Step 3: ตรวจ**

```bash
& 'C:\Program Files\nodejs\npm.cmd' run typecheck && & 'C:\Program Files\nodejs\npm.cmd' run build
```
Expected: 0 error / exit 0

- [ ] **Step 4: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat(ui): shadcn-style tokens via Tailwind @theme + component layer (values unchanged)"
```

---

### Task 2: UI Primitives (components/ui)

**Files:**
- Create: `frontend/components/ui/Button.tsx` — stateful: props `{variant?: "primary"|"secondary"|"ghost"|"danger", loading?: boolean, success?: boolean, size?: "sm"|"md"|"full", className?, ...rest}` → render `<button className={btn base + variant + (loading→btn-loading) + (success→btn-success)}>`; loading แสดง spinner ผ่าน pseudo-class `.btn-loading::before` (มีอยู่แล้ว) + `aria-busy`; success แสดง ✓ 0.8s แล้ว reset (callback `onSuccessDone?`)
- Create: `frontend/components/ui/Checkbox.tsx` — props `{checked, indeterminate?, onChange, label?, disabled?}` → `<label class="draft-checkbox"><input type="checkbox" .../><span/></label>` + aria-label
- Create: `frontend/components/ui/ToastProvider.tsx` — context `useToast(): { push(type, text, opts?: {actionLabel?, onAction?}) }`; แทนที่ toast logic เดิมใน page.tsx (ย้าย `pushToast` + timeout 4200 + undo 5s action button + `role="status"`); component `<ToastProvider>{children}</ToastProvider>` + `<Toasts/>` renderer (class `.toasts`/`.toast` เดิม)
- Create: `frontend/components/ui/ConfirmDialog.tsx` — props `{open, title, body, confirmLabel?, danger?, onConfirm, onCancel}` → overlay `.drawer-mask` + panel `.panel` centered, `role="dialog" aria-modal`, Esc/outside click = cancel, focus first button on open
- Create: `frontend/components/ui/Drawer.tsx` — props `{open, onClose, snap?: number[] (default [0.5,0.9]), children}` → bottom sheet: `.drawer-mask` + `.drawer-panel`; ใช้ `motion/react` (มีแล้ว) `animate={{y: "0%"}}/{{y:"100%"}}` spring; snap ผ่าน drag (`drag="y"` + `onDragEnd` คำนวณ nearest snap) — fallback: ถ้า motion มีปัญหาใช้ CSS transition + scroll listener; `role="dialog"`, Esc ปิด, focus จุดแรก
- Create: `frontend/components/ui/CommandPalette.tsx` — props `{open, onClose, items: {id, group, label, hint?, keywords?, icon?, onSelect}[]}` → dialog overlay + input (filter ตาม label+keywords, case-insensitive) + listbox (↑↓/Enter/Esc, mouse click) + footer hint "↑↓ เลือก · Enter ใช้ · Esc ปิด"; highlight match substring; `role="dialog"` + `role="listbox"`/`option`; focus input on open; เปิดด้วย keyboard shortcut ด้วย (⌘K/Ctrl+K) — ฟัง global keydown เมื่อ open=false
- Create: `frontend/lib/commands.ts` — pure builder: `buildCommands({view, agent, setView, setAgent, setStatusFilter, setAgentFilter, setSearch, resetFilters, seedDemo, counts}): CommandItem[]` (export type `CommandItem`); filter fn `filterCommands(items, query): CommandItem[]` (pure — case-insensitive label+keywords match, group order stable)

**Interfaces:**
- Consumes: utility classes จาก Task 1
- Produces (Task 3 ใช้): `useToast()`, `<ToastProvider>`, `<ConfirmDialog open onConfirm onCancel>`, `<Drawer open onClose>`, `<CommandPalette open onClose items>`, `<Button variant loading success>`, `<Checkbox checked indeterminate onChange>`, `buildCommands`, `filterCommands`, type `CommandItem`

- [ ] **Step 1: เขียน primitives ตาม interface ข้างบน (7 ไฟล์)**
- [ ] **Step 2: ตรวจ typecheck + build**

```bash
& 'C:\Program Files\nodejs\npm.cmd' run typecheck && & 'C:\Program Files\nodejs\npm.cmd' run build
```
Expected: 0 error / exit 0

- [ ] **Step 3: Smoke test dev server** — `npm run dev` เปิด http://localhost:3000 หน้าเดิมยังโหลดปกติ (ยังไม่มีใครเรียกใช้ primitives — แค่ยืนยัน build ไม่พัง)
- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui frontend/lib/commands.ts
git commit -m "feat(ui): primitives — stateful Button, Checkbox, ToastProvider (undo), ConfirmDialog, Drawer, CommandPalette + commands lib"
```

---

### Task 3: Feature Hooks + page.tsx Wiring

**Files:**
- Create: `frontend/lib/hooks.ts` — `useSelection(ids: string[], deps: unknown[]): {selected: Set<string>, toggle(id), toggleAll(ids), clear(), count, allSelected}` (clear อัตโนมัติเมื่อ deps เปลี่ยน — filter/search เปลี่ยน); `useShortcuts(handlers: {goCreate(), goQueue(), focusSearch(), focusAnswers(), openPalette()})` (ข้ามเมื่อ `e.target` เป็น input/textarea/select/contentEditable; เช็ค `e.metaKey||e.ctrlKey` ก่อน; ลงทะเบียน keydown ที่ window; desktop เท่านั้น — เช็ค `matchMedia("(min-width: 900px)")` ที่ mount)
- Create: `frontend/lib/drafts.ts` — `patchDraftStatus(id, status)` (PATCH `/api/drafts/${id}` → ใช้ lib/backend.ts `patchDraft` เดิม; return boolean), `applyBatch(drafts, status, patchFn): Promise<{ok, fail}>` (sequential, เก็บ fail id list)
- Modify: `frontend/app/page.tsx` — wiring:
  - แทนที่ toast logic ด้วย `<ToastProvider>` (layout.tsx) + `useToast()`
  - **F1 batch**: checkbox ต่อ draft card (เฉพาะ pending; disabled ถ้าไม่ใช่ pending), header select-all (เฉพาะหน้าที่กรองอยู่ — ใช้ `filtered`), bulk bar เหนือ list (`.bulk-bar`): "เลือก N รายการ" + [อนุมัติทั้งหมด primary] [ปฏิเสธทั้งหมด danger] [ยกเลิก ghost]; หลังสำเร็จ `applyBatch` → toast สรุป + `selection.clear()`
  - **F2 palette**: `<CommandPalette open={paletteOpen} items={buildCommands(...)}>` + ปุ่ม "⌘K" ใน topbar (desktop) + shortcut ⌘K/Ctrl+K
  - **F3 undo**: `pushToast("success", "อนุมัติแล้ว", {actionLabel: "เลิกทำ", onAction: () => patchDraftStatus(id,"pending")})` — เช่นเดียวกัน reject; ลบ preset → `<ConfirmDialog>`; reject draft ที่มี warnings → ConfirmDialog แสดง warnings
  - **F4 drawer**: มือถือ (<900px ผ่าน matchMedia) แตะ draft card → `<Drawer>` แสดง detail + actions (อนุมัติ/ปฏิเสธ/คัดลอก/ดาวน์โหลด) — reuse การ์ดเดิมใน drawer body
  - **F5 sort**: sort state `"newest"|"oldest"|"agent"` + `<select class="sort-select">` ใน filters; ใช้ก่อน `filtered` (sort(filter(drafts))); แสดง "แสดง X จาก Y รายการ" (`.filters` ใต้แถวหรือใน bulk-bar area); ปุ่มล้างตัวกรองเดิม → เคลียร์ sort ด้วย
  - **F6 shortcuts**: `useShortcuts({1: goCreate, 2: goQueue, n: goCreate, "/": focusSearch, c: focusAnswers, Esc: close overlays})`
  - **F7 stateful buttons**: ปุ่ม submit/อนุมัติ/ปฏิเสธ → `<Button loading success>` (success flash 0.8s หลัง PATCH สำเร็จเฉพาะรายการนั้น)
  - footer sidebar: เพิ่ม hint "⌘K คำสั่งลัด" (`.kbd-hint`)

**Interfaces:**
- Consumes: ทั้งหมดจาก Task 2 + `patchDraft` จาก `lib/backend.ts`
- Produces: app ครบ 7 ฟีเจอร์

- [ ] **Step 1: เขียน `lib/hooks.ts` + `lib/drafts.ts` (pure logic แยกจาก UI)**
- [ ] **Step 2: แก้ `layout.tsx`** — ห่อ `<ToastProvider>` ใน body (ใต้ ErrorBoundary)
- [ ] **Step 3: แก้ `page.tsx`** ตาม wiring ข้างบน — ระวัง: ห้ามลบฟีเจอร์เดิม (demo seed, export, offline queue, auto-refresh, settings, copy/download, warnings)
- [ ] **Step 4: ตรวจ typecheck + build**

```bash
& 'C:\Program Files\nodejs\npm.cmd' run typecheck && & 'C:\Program Files\nodejs\npm.cmd' run build
```
Expected: 0 error / exit 0

- [ ] **Step 5: Manual QA checklist (dev server)** — ทดสอบทุกข้อแล้วบันทึกผลใน report:
  1. สร้างงาน grading 2 คน → คิว 2 รายการ pending
  2. select-all + อนุมัติทั้งหมด → 2 รายการ approved + toast สรุป + bulk bar หาย
  3. Undo → กลับเป็น pending
  4. ⌘K → ไปคิวตรวจ / กรอง pending → ผล filter เปลี่ยน
  5. Reject draft ที่มี warnings → confirm dialog แสดง warnings
  6. DevTools mobile (375px): แตะ card → drawer เลื่อนขึ้น snap → อนุมัติใน drawer
  7. sort เก่าสุด/agent → ลำดับเปลี่ยน; นับผล "แสดง X จาก Y" ถูกต้อง
  8. shortcuts: 1/2/n//c ทำงาน (โฟกัสถูกต้อง) — พิมพ์ใน input แล้ว shortcut ไม่เผลอทำงาน
  9. offline: DevTools offline → submit → "รอส่ง (ออฟไลน์)" + queue; online → flush อัตโนมัติ
  10. export .md, copy, download ยังทำงาน
  11. prefers-reduced-motion: on → animation 0
- [ ] **Step 6: Commit**

```bash
git add frontend/lib/hooks.ts frontend/lib/drafts.ts frontend/app/page.tsx frontend/app/layout.tsx
git commit -m "feat(ui): batch approval, command palette, undo, mobile drawer, sort+counts, shortcuts, stateful buttons"
```

---

### Task 4: Docs + Final Verification

**Files:**
- Modify: `C:\TeachOps\README.md` — เพิ่มส่วน "UI features" (batch, ⌘K, shortcuts, drawer) + dev run คำสั่ง
- Modify: `C:\TeachOps\DESIGN.md` — อัปเดต "Motion & components" (เพิ่ม tokens ใหม่/utilities, stateful button, drawer, palette; ระบุ Tailwind v4 layer)

**Interfaces:**
- Consumes: ทุกอย่างจาก Task 0-3

- [ ] **Step 1: อัปเดต README.md + DESIGN.md (เฉพาะส่วนที่เกี่ยวข้อง — ห้ามลบ content เดิม)**
- [ ] **Step 2: Full verification suite**

```bash
& 'C:\Program Files\nodejs\npm.cmd' run typecheck
& 'C:\Program Files\nodejs\npm.cmd' run build
& 'C:\Program Files\nodejs\npm.cmd' run dev   # manual checklist ข้อ 1-11 (จาก Task 3) — เปิด http://localhost:3000
& 'C:\Python312\python.exe' -m pytest backend/tests -q   # ตรวจ backend ไม่ regression (path ตามที่ใช้จริง)
```
Expected: ทั้งหมดผ่าน; บันทึกผลจริง (ไม่ใช่ "ควรผ่าน")

- [ ] **Step 3: Commit**

```bash
git add README.md DESIGN.md
git commit -m "docs: README UI features + DESIGN.md Tailwind token layer"
```

---

### Task 5: Final Review + Merge Prep

- [ ] **Step 1: ตรวจ `git log` + `git status` สะอาด; เปิด dev server ให้ผู้ใช้ preview (http://localhost:3000)**
- [ ] **Step 2: Report สรุป: ฟีเจอร์ที่ทำ + evidence (typecheck/build/pytest output + QA checklist) + ความเสี่ยงคงค้าง**
