# Solven Pro UI Redesign — Design Spec

> Status: APPROVED (user decisions 2026-08-14) — ยกระดับ Stripe grammar, Tailwind v4 + shadcn-style tokens, ฟีเจอร์ครบชุด

## 1. Goal

ยกระดับ Solven (ผู้ช่วยครู multi-agent, JUMP THAILAND 2026) จาก prototype ที่ใช้งานได้ เป็น UI ที่ "มืออาชีพและสวยงามที่สุด" โดยรักษา Stripe-dashboard grammar ที่ pin ไว้ (DESIGN.md 12 ส.ค. 2026) และเพิ่มความอำนวยสะดวก (convenience) ทุกฟีเจอร์ต้องใช้งานได้จริง ไม่ใช่ของตกแต่ง

## 2. Decisions (อนุมัติโดยผู้ใช้)

| ข้อ | Decision |
|---|---|
| ทิศทางดีไซน์ | **ยกระดับ Stripe grammar ต่อ** — เก็บ identity (navy `#0a2540` / indigo `#635bff`, sidebar, density) เติม pattern จาก ReactBits Pro / Magic UI / COSS / Aceternity แบบ adapted |
| สแต็ก | **Tailwind v4 + shadcn-style CSS variables** — `@tailwindcss/postcss` + `@theme inline` mapping token Stripe เดิมเข้าระบบ shadcn; ยังคง Next 14.2 + React 18.3 + motion 13.1 |
| ฟีเจอร์ | ทั้งหมด: batch approve/reject, ⌘K command palette, undo toast + confirm dialog, bottom drawer มือถือ, sort + ล้างเร็ว + นับผลกรอง, keyboard shortcuts |

## 3. หลักฐานจาก research (URL อ้างอิง)

- **ReactBits ฟรี** (MIT+Commons Clause): `github.com/DavidHDev/react-bits` — TS-CSS variants ใช้กับ vanilla CSS ได้; CountUp/ShinyText/BorderGlow/Particles vendored อยู่แล้วใน `frontend/components/reactbits/`
- **ReactBits Pro** (commercial): `pro.reactbits.dev/docs/app-ui/agent-approval` (diff preview, batch queue, risk badges), `data-table` (tri-state empty/skeleton/error, row selection + bulk bar), `filtering` (derived counts), `empty-state` (ghosted preview + paths), `notifications` (toast stack, hover-expand) — **ใช้เป็น pattern reference เท่านั้น ห้าม copy source ลง public repo (license §2.6)**
- **Magic UI** (MIT): `magicui.design/docs/components/shimmer-button` (keyframes `shimmer-slide` พอร์ตได้), `number-ticker` (ต้องแก้ locale → th-TH + reduced-motion), `grid-pattern` (SVG aria-hidden) — ทุกตัวต้องเพิ่ม `prefers-reduced-motion`
- **COSS UI** (MIT apps/ui): `coss.com/ui/docs/components/{button,drawer,toast,tabs,empty,command,form}` — Button `loading` prop + aria-disabled, Drawer snap points + responsive Dialog↔Drawer, Toast actionProps (Undo) + promise(), Command palette ⌘K, Empty tri-state — interaction pattern ใช้ได้ทั้งหมด
- **Aceternity**: `ui.aceternity.com/components/stateful-button` (loading→success state machine), `sidebar`, `tabs`, `animated-modal`, `multi-step-loader` — logic พอร์ตได้; Empty States blocks = paid → ทำเอง

## 4. Design System (Tailwind v4 + shadcn tokens)

### 4.1 Token map (Stripe เดิม → shadcn-style, ค่าไม่เปลี่ยน = identity คงเดิม)

```
--background: #f6f8fa (bg)          --foreground: #0a2540 (ink)
--card: #ffffff                      --card-foreground: #0a2540
--popover: #ffffff                   --popover-foreground: #0a2540
--primary: #635bff (accent)          --primary-foreground: #ffffff
--secondary: #f0f2f5 (surface-2)     --secondary-foreground: #0a2540
--muted: #f0f2f5                     --muted-foreground: #697386
--accent: #eceefe (accent-soft)      --accent-foreground: #635bff
--destructive: #b3261e               --destructive-foreground: #ffffff
--border: #e6e8eb                    --input: #cfd7df (line-strong)
--ring: #635bff                      --radius: 0.75rem (12px) / controls 0.375rem
--success: #0a7a53 / soft #e6f6ee    --warning: #9a6b00 / soft #fff7e0
--font-sans: Inter + Noto Sans Thai (next/font)
```

### 4.2 โครงสร้าง

- `postcss.config.mjs` ใหม่ (plugin `@tailwindcss/postcss`)
- `globals.css`: `@import "tailwindcss"` + `@theme inline` (token map) + `@layer base` (Stripe anatomy: body, focus-visible, reduced-motion) + `@utility`/component classes สำหรับชิ้นส่วนที่ใช้ซ้ำ (btn, badge, panel ฯลฯ) — **component classes ยังใช้งานได้กับ JSX เดิม → migration ค่อยเป็นค่อยไปไม่พัง**
- `lib/ui.ts` หรือ `components/ui/*`: primitives ใหม่ (Button stateful, ConfirmDialog, CommandPalette, ToastProvider, Drawer, Checkbox)

### 4.3 Design rules (ต่อจาก DESIGN.md)

1. Indigo = role ไม่ใช่ decoration (primary action, selection, focus ring)
2. Status pills มี dot + สี + คำ (รออนุมัติ/อนุมัติแล้ว/ปฏิเสธ)
3. Density over decoration — ไม่มี gradient/glass แบบ landing
4. ทุก control มี 7 states (default/hover/focus/active/disabled/loading/error)
5. Motion: view-in 180ms, CountUp (th-TH), skeleton shimmer, toast slide — ทั้งหมด under `prefers-reduced-motion`
6. Empty states สอน: icon + title + desc + 1 primary action
7. Responsive: sidebar → pill nav (<900px); agent-grid 3→1; stats 4→2; **ใหม่: bottom drawer สำหรับรีวิวร่างบนมือถือ**

## 5. Features (acceptance criteria)

### F1. Batch approve/reject (คิวตรวจ)
- Checkbox เลือกได้เฉพาะ draft ที่ status=pending; header checkbox = select-all (เฉพาะหน้าที่กรองอยู่)
- Bulk bar ปรากฏเมื่อ select ≥1: "เลือก N รายการ" + [อนุมัติทั้งหมด] [ปฏิเสธทั้งหมด] [ยกเลิก]
- PATCH ทีละรายการ (ไม่เปลี่ยน API — ใช้ loop `setDraftStatus` เดิม); ปิด selection หลังเสร็จ; toast สรุป "อนุมัติ X / ไม่สำเร็จ Y"
- ยกเลิก selection เมื่อ filter/search เปลี่ยน

### F2. Command palette (⌘K / Ctrl+K)
- เปิด/ปิดด้วย ⌘K/Ctrl+K + Esc; เปิดจากปุ่มใน topbar (desktop) ด้วย
- รายการ: ไปสร้างงาน (grading/lesson-plan/reporting), ไปคิวตรวจ, กรองสถานะ (pending/approved/rejected), ล้างตัวกรอง, โหลดข้อมูลตัวอย่าง
- Keyboard: ↑↓ เลือก, Enter เรียกใช้, Esc ปิด; aria: role="dialog" + listbox, focus trap ภายใน
- แหล่งอ้างอิง pattern: COSS Command, Aceternity Tabs/Modal

### F3. Undo toast + confirm dialog
- อนุมัติ/ปฏิเสธ → toast "อนุมัติแล้ว (ชื่อ)" + ปุ่ม **เลิกทำ** (undo ภายใน 5s): เรียก PATCH กลับเป็น pending
- ลบ rubric preset → confirm dialog "ลบ '{name}'?" [ยกเลิก] [ลบ] (danger)
- Reject ที่มี warnings → confirm dialog แสดง warnings ก่อน (human-in-the-loop เข้มขึ้น)
- แหล่งอ้างอิง: COSS Toast actionProps, Aceternity Animated Modal (แบบ minimal ไม่ใช่ animated ฉูดฉาด)

### F4. Bottom drawer (มือถือ <900px)
- แทนที่การรีวิวร่างในหน้าเต็ม: แตะการ์ด → drawer เลื่อนขึ้น (snap: 50%/90%) แสดงรายละเอียด + อนุมัติ/ปฏิเสธ/คัดลอก/ดาวน์โหลด
- Desktop ยังเป็น inline card เหมือนเดิม (ไม่เพิ่ม friction)
- ใช้ CSS transform + motion (spring) — ไม่เพิ่ม dependency; ARIA dialog + Esc ปิด
- แหล่งอ้างอิง: COSS Drawer snap points pattern

### F5. Sort + ล้างเร็ว + นับผลกรอง
- Sort dropdown: ใหม่สุด (default) / เก่าสุด / agent A-Z; เก็บใน state (ไม่ persist — ตามโจทย์ "เร็ว")
- แสดง "แสดง X จาก Y รายการ" ใต้ filters (หรือใน bulk bar)
- ล้างตัวกรอง = 1 ปุ่ม (มีอยู่แล้ว — ทำให้เห็นชัดขึ้น + เคลียร์ sort ด้วย)
- แหล่งอ้างอิง: ReactBits filtering-1 (derived counts)

### F6. Keyboard shortcuts (desktop)
- `1`/`2` สลับสร้างงาน/คิวตรวจ; `n` ไปสร้างงาน (จากคิว); `/` โฟกัสช่องค้นหา; `c` โฟกัส textarea คำตอบ; Esc ปิด drawer/palette/dialog
- แสดง hint ใน footer sidebar (desktop): "⌘K คำสั่งลัด"
- ไม่ทับซ้อนกับ input focus (เช็ค `e.target` เป็น form control → ข้าม)
- แหล่งอ้างอิง: COSS Kbd + Command shortcuts

### F7. ระบบ button stateful (ทั่วทั้งแอป)
- ปุ่ม submit: idle → loading (spinner + ข้อความ progress) → success (✓ ชั่วครู่) → idle; disabled ระหว่าง submit
- ปุ่มอนุมัติ/ปฏิเสธใน card: loading spinner เฉพาะปุ่มนั้น (ไม่ล็อกทั้งหน้า)
- แหล่งอ้างอิง: Aceternity Stateful Button, COSS Button loading, Magic UI shimmer (เฉพาะ skeleton ไม่ใช่ CTA)

## 6. Non-goals / ห้ามทำ

- ไม่เปลี่ยน API shape (`/api/coordinator`, `/api/drafts`, PATCH status) — backend ไม่ต้องแก้
- ไม่ซื้อ/ไม่ scrape ReactBits Pro source (license violation) — ใช้เป็น reference เท่านั้น
- ไม่ทำ dark mode, ไม่ทำ auth ใหม่, ไม่ทำ native app, ไม่เปลี่ยนภาษา/ข้อความที่มีอยู่ (copy เดิมคงเดิม ยกเว้นเพิ่ม hint)
- ไม่เพิ่ม dependency ใหม่นอกเหนือ: `tailwindcss@4` + `@tailwindcss/postcss` + `postcss` (และ `clsx`/`tailwind-merge` เฉพาะถ้าจำเป็นจริง) — ไม่ใช้ radix/base-ui (ประหยัด bundle + ลดความเสี่ยง beta)

## 7. Files

- สร้าง: `frontend/postcss.config.mjs`, `frontend/components/ui/*` (Button, ConfirmDialog, CommandPalette, ToastProvider, Drawer, Checkbox, SortSelect), `frontend/lib/commands.ts` (palette items + shortcuts)
- แก้: `frontend/package.json` (+deps), `frontend/app/globals.css` (Tailwind + tokens + component classes), `frontend/app/page.tsx` (wire ทุก feature), `frontend/app/layout.tsx` (ToastProvider), `frontend/DESIGN.md`? (ไม่ — DESIGN.md root อยู่ที่ `C:\TeachOps\DESIGN.md` → อัปเดต "Motion & components" section), `README.md` (shortcuts/features)
- ทดสอบ: `frontend/` typecheck + build + backend pytest (ไม่แตะ backend)

## 8. Verification

1. `npm run typecheck` (tsc --noEmit) — 0 error
2. `npm run build` (next build) — exit 0
3. `cd frontend && npm run dev` — เปิด http://localhost:3000: ทดสอบ flow ครบ: สร้างงาน → คิว → batch → undo → ⌘K → drawer มือถือ (DevTools) → sort → shortcuts → offline queue (SW) → export .md
4. `pytest backend/tests` — ผ่าน (backend ไม่แตะ แต่ยืนยันไม่ regression)
5. Lighthouse/axe คร่าว (manual): contrast, focus trap ใน palette/dialog, reduced-motion

## 9. Risks

- **Tailwind v4 + Next 14.2**: คู่กันได้ (postcss plugin) แต่ต้อง build-test ตั้งแต่ Task แรก; ถ้าเจอปัญหา → fallback plan: ใช้ `tailwindcss@3` + `postcss.config.js` (tokens เหมือนกัน) — ตัดสินใจด้วยหลักฐานการ build ไม่ใช่เดา
- **page.tsx 1123 บรรทัด**: ย้าย feature logic ออกเป็น hooks/lib (`useDrafts`, `useToasts`, `useSelection`) เพื่อไม่ให้ระเบิด — ไม่ refactor ทั้งหมด (ขอบเขตจำกัด)
- **Motion 13 + React 18**: peer-support แล้ว (evidence: registry.npmjs.org/motion) — ถ้าเจอ issue ใช้ CSS animation แทน
