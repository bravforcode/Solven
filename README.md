# Solven

Multi-agent AI system that gives Thai teachers their time back — automates grading, lesson planning, and parent/admin communication so teachers can focus on teaching.

Built for **JUMP THAILAND Hackathon 2026** (AIS) — theme: *AI for the Future of Thai Education*, challenge: *Empowering Teachers*.

## Problem

Thai learning outcomes are declining and unequally distributed (PISA 2022). A major structural driver is teacher shortage and misallocation in small schools (TDRI research) — teachers lose disproportionate time to admin/grading work instead of instruction (OECD TALIS). World Bank (2015) shows restoring teacher time directly lifts student achievement.

## Solution

Solven is a coordinator + 3 sub-agent system, designed to plug into the existing **AIS LearnDi (AIS Academy)** platform rather than ship as a standalone app:

| Agent | Responsibility |
|---|---|
| **Coordinator** | Routes tasks, manages context/state across sub-agents, enforces human-in-the-loop checkpoints |
| **Grading & Feedback** | Auto-grades assignments, drafts per-student feedback for teacher review |
| **Lesson-Plan** | Generates/adapts lesson plans against curriculum targets |
| **Reporting & Communication** | Drafts parent/admin reports and updates |

All agent output is draft-only until a teacher approves — no fully autonomous grading or messaging.

## Tech Stack

- **Frontend:** Next.js + TypeScript
- **Backend:** Python multi-agent orchestration
- **LLMs:** Claude, Gemini
- **Integration target:** AIS LearnDi / AIS Cloud (AIS EEC)

## Repo Layout

```
frontend/            Next.js + TypeScript UI
backend/
  coordinator/        routing, state, human-in-the-loop gating
  agents/              grading, lesson-plan, reporting sub-agents
docs/                 pitch deck, architecture notes
```

## Status

Hackathon submission in progress — architecture defined, implementation starting.
