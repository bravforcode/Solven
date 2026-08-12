# DESIGN.md — Solven Web

> Direction contract (opening comment, replaced 12 Aug 2026 — brief-pinned world):
>
> **THESIS:** Solven is a teacher's operations dashboard in Stripe's visual grammar — dense, calm, and familiar to anyone who has run a business on the web. The visitor operates (create work, review drafts, approve), never chats with a hero.
>
> **OWN-WORLD:** Light-gray canvas (`#f6f8fa`), white surfaces with hairline `#e6e8eb` borders, navy ink (`#0a2540`), indigo accent (`#635bff`) reserved for primary actions + selection; Inter + Noto Sans Thai. Left sidebar nav (white), page-title topbar, pill badges with status dots, metric tiles, segmented chips.
>
> **STORY:** A teacher in a small school opens Solven like a dashboard. Create work in the left panel, review drafts as cards with status pills, approve with one tap. Everything is a draft until she says so.
>
> **FIRST VIEWPORT:** White sidebar (Solven + สร้างงาน/คิวตรวจ + engine status) · topbar with page title and user avatar · content: three agent cards (grading/lesson-plan/reporting) in Stripe feature-card grammar.
>
> **FORM:** Brief-pinned replacement world ("เหมือน dashboard.stripe.com") — the incumbent blue/white world is superseded; this file records the committed Stripe grammar.

## Design tokens (settled by build — 12 Aug 2026)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f6f8fa` | app canvas |
| `--surface` | `#ffffff` | cards, panels, inputs |
| `--surface-2` | `#f0f2f5` | hover wells, nav active, icon tiles |
| `--ink` | `#0a2540` | primary text (Stripe navy) |
| `--muted` | `#697386` | secondary text (≥4.5:1) |
| `--line` | `#e6e8eb` | hairline borders |
| `--line-strong` | `#cfd7df` | input borders |
| `--accent` | `#635bff` | primary actions, selection, focus (indigo) |
| `--accent-hover` | `#5851e8` | hover on primary |
| `--accent-soft` | `#eceefe` | selected tint, count pills |
| `--ok` / soft | `#0a7a53` / `#e6f6ee` | approved |
| `--warn` / soft | `#9a6b00` / `#fff7e0` | pending |
| `--danger` / soft | `#b3261e` / `#fdecec` | rejected/errors |
| `--radius` | `12px` (controls 6px) | — |
| fonts | Inter (latin) + Noto Sans Thai via `next/font`, self-hosted | body 15px |

## Rules

1. **Indigo is a role, not decoration.** `#635bff` = primary action, selected state, focus ring. Navigation and idle surfaces stay navy/white/gray.
2. **Stripe anatomy:** sticky white sidebar (brand, nav, engine status in footer) + page-title topbar + centered content column (max 1120px). Mobile: sidebar hidden, pill nav row on top.
3. **Status pills carry a dot** (::before) + colored text on soft tint — state reads by color AND word (รออนุมัติ/อนุมัติแล้ว/ปฏิเสธ).
4. **Density over decoration:** small caps labels (12–13px gray), 15px body, metric tiles with big navy numbers + gray labels. No gradients, no glass, no decorative borders.
5. **Every interactive control has 7 states** (default/hover/focus/active/disabled/loading/error); focus = 2px indigo ring.
6. **One authored motion:** view transitions + draft-card appear (180ms ease-out), CountUp on metric tiles (state feedback), dark toasts slide in. Everything respects `prefers-reduced-motion`.
7. **Empty states teach:** icon in gray circle, title, description, one primary action (สร้างงานแรก / ลองใหม่ / ล้างตัวกรอง).
8. **Toasts:** dark navy bottom-right (bottom-center mobile), auto-dismiss 4s, success/error/info variants.
9. **Responsive:** sidebar collapses below 900px; agent grid 3→1 col; stats 4→2 col.

## Motion & components (ReactBits — state)

ReactBits components remain vendored in `components/reactbits/` (MIT, `DavidHDev/react-bits`) but the Stripe world uses only **CountUp** (metric tiles — quiet, stateful). Particles/ShinyText/BorderGlow are retired from this world: Stripe's grammar has no decorative motion, and the brief pins the world.
