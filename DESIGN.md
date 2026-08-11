# DESIGN.md — Solven Web

> Direction contract (opening comment):
>
> **THESIS:** Solven is the teacher's second desk — a calm blue-and-white operating surface where every routine admin task is one form, one review, one approval away. It refuses the generic AI-chat page (a lonely text box on a hero) that the category always ships: the visitor operates, not chats.
>
> **OWN-WORLD:** White content surfaces on a pale blue-tinted ground; blue (#2563eb) owns navigation, primary actions, and current selection only; semantic green/amber/red reserved for state. One sans family, fixed rem scale, 40px control rhythm, 4px spacing grid. Drafts are cards with a hard status badge — no gradients, no glass, no decorative chrome.
>
> **STORY:** A teacher in a small school opens the app on a phone between classes. She picks the job (check work / draft a lesson plan / draft a message), fills one short form, and gets a draft in the review queue — approved or rejected with one tap. Everything is a draft until she says so.
>
> **FIRST VIEWPORT:** Header with brand + view tabs (สร้างงาน · คิวตรวจ). Below: three job cards — ตรวจงาน / แผนการสอน / รายงาน — as the primary action, not a hero. The queue tab carries the pending count so the human-in-the-loop promise is visible before any interaction.
>
> **FORM:** Brief-pinned world (ฟ้า-ขาว Operate app) — direction supplied by the user, so no concept tournament was run; this file records the committed build, not a contested pick.

## Design tokens (settled by build — 12 Aug 2026)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f5f8fc` | app ground (pale blue-tinted) |
| `--surface` | `#ffffff` | cards, panels, inputs |
| `--surface-2` | `#eef4fb` | sidebar/panel tint, hover wells |
| `--ink` | `#0f172a` | primary text |
| `--muted` | `#5b6b82` | secondary text (≥4.5:1 on white) |
| `--line` | `#dbe4f0` | borders, dividers |
| `--blue` | `#2563eb` | primary actions, active tab, focus ring |
| `--blue-dark` | `#1d4ed8` | hover on primary |
| `--blue-deep` | `#1e3a8a` | brand block, deep accents |
| `--blue-soft` | `#eff6ff` | selected/active tint, info wells |
| `--ok` / soft | `#15803d` / `#ecfdf3` | approved state |
| `--warn` / soft | `#b45309` / `#fffbeb` | pending state |
| `--danger` / soft | `#b91c1c` / `#fef2f2` | rejected/errors |
| `--radius` | `12px` (controls 8px) | — |
| `--shadow-1/2` | `0 1px 2px rgba(15,23,42,.06)` / `0 12px 32px rgba(15,23,42,.10)` | cards / floating |

## Rules

1. **Blue is a role, not decoration.** Blue = navigation, primary action, current selection, focus. Never for passive text or borders of idle controls.
2. **One sans family** (`"Noto Sans Thai", "Sarabun", "Segoe UI", system-ui`), fixed rem scale (0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5), body 16px.
3. **Every interactive control has 7 states:** default · hover · focus(ring 2px blue) · active · disabled · loading · error. Buttons ≥40px touch target.
4. **State communicates through color+word together** — badge text (รออนุมัติ/อนุมัติแล้ว/ปฏิเสธ), not color alone.
5. **No gradients, no glass, no animated entrances.** One authored motion: queue items fade/slide 180ms ease-out on appear; toasts slide in bottom-right (bottom center on mobile), auto-dismiss 4s.
6. **Drafts are cards with status badge, warnings list, and actions** — copy + download on every draft; approve/reject only while pending.
7. **Empty states teach:** no drafts → explain the flow + CTA to create; filters empty → button to clear filters.
8. **Responsive:** ≥900px two-column layout (queue: stats + filters above list); below: single column, tabs stay top, forms full width. Structural breakpoints only — no fluid type.
9. **Toast system** for every action result (สร้างงานแล้ว, คัดลอกแล้ว, อนุมัติแล้ว…) — errors name the problem + recovery (retry).
