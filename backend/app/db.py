"""Postgres store (psycopg3): tasks, drafts, agent_runs (audit)."""

import psycopg
from datetime import datetime, timezone
from typing import Optional
from psycopg.rows import dict_row

DB_URL_DEFAULT = "postgresql://solven:solven@localhost:5432/solven"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    agent TEXT NOT NULL,
    input TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    warnings TEXT NOT NULL DEFAULT '[]',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    output_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    cost_estimate REAL NOT NULL DEFAULT 0,
    guardrail_passed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
"""


def _exec_script(conn: psycopg.Connection, sql: str) -> None:
    """psycopg3 has no executescript — split on ';' and run each statement."""
    for stmt in sql.split(";"):
        if stmt.strip():
            conn.execute(stmt)


def _conn(database_url: str) -> psycopg.Connection:
    return psycopg.connect(database_url, row_factory=dict_row)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, database_url: str = ""):
        self._database_url = database_url or DB_URL_DEFAULT

    def _c(self) -> psycopg.Connection:
        return _conn(self._database_url)

    # ---- tasks ----
    def create_task(
        self,
        task_id: str,
        agent: str,
        input_text: str,
        state: str = "submitted",
        teacher_id: Optional[str] = None,
    ) -> bool:
        """Insert a task. Returns False (no-op) if task_id already exists —
        lets callers detect a replayed request (offline-queue retry) and skip
        re-running the agent instead of duplicating work."""
        with self._c() as conn:
            cur = conn.execute(
                "INSERT INTO tasks (id, teacher_id, agent, input, state, created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (id) DO NOTHING",
                (task_id, teacher_id, agent, input_text, state, now_iso()),
            )
        return cur.rowcount > 0

    def get_task(self, task_id: str) -> Optional[dict]:
        with self._c() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE id=%s", (task_id,)).fetchone()
        return row if row else None

    def set_task_state(self, task_id: str, state: str) -> None:
        with self._c() as conn:
            conn.execute("UPDATE tasks SET state=%s WHERE id=%s", (state, task_id))

    # ---- drafts ----
    def add_draft(
        self,
        draft_id: str,
        task_id: str,
        agent: str,
        input_text: str,
        output: str,
        warnings: Optional[list[str]] = None,
        teacher_id: Optional[str] = None,
        status: str = "pending",
    ) -> None:
        with self._c() as conn:
            conn.execute(
                "INSERT INTO drafts (id, task_id, teacher_id, agent, input, output, status, warnings, created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (draft_id, task_id, teacher_id, agent, input_text, output, status,
                 _json(warnings or []), now_iso()),
            )

    def list_drafts(self, teacher_id: Optional[str] = None,
                    limit: int = 100, offset: int = 0) -> list[dict]:
        with self._c() as conn:
            if teacher_id:
                rows = conn.execute(
                    "SELECT * FROM drafts WHERE teacher_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s",
                    (teacher_id, limit, offset),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM drafts ORDER BY created_at DESC LIMIT %s OFFSET %s",
                    (limit, offset),
                ).fetchall()
        return rows

    def get_draft(self, draft_id: str) -> Optional[dict]:
        with self._c() as conn:
            row = conn.execute("SELECT * FROM drafts WHERE id=%s", (draft_id,)).fetchone()
        return row if row else None

    def set_draft_status(self, draft_id: str, status: str) -> Optional[dict]:
        with self._c() as conn:
            cur = conn.execute("UPDATE drafts SET status=%s, reviewed_at=%s WHERE id=%s",
                               (status, now_iso(), draft_id))
            if cur.rowcount == 0:
                return None
            row = conn.execute("SELECT * FROM drafts WHERE id=%s", (draft_id,)).fetchone()
        return row

    # ---- agent_runs (audit) ----
    def add_run(self, run: dict) -> None:
        with self._c() as conn:
            conn.execute(
                "INSERT INTO agent_runs (id, task_id, agent, model, prompt_hash, output_hash, status, "
                "latency_ms, cost_estimate, guardrail_passed, created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (run["id"], run["task_id"], run["agent"], run["model"], run["prompt_hash"],
                 run["output_hash"], run["status"], run["latency_ms"], run["cost_estimate"],
                 1 if run["guardrail_passed"] else 0, run["created_at"]),
            )

    def list_runs(self, task_id: Optional[str] = None,
                  limit: int = 100, offset: int = 0) -> list[dict]:
        with self._c() as conn:
            if task_id:
                rows = conn.execute(
                    "SELECT * FROM agent_runs WHERE task_id=%s ORDER BY created_at LIMIT %s OFFSET %s",
                    (task_id, limit, offset),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT %s OFFSET %s",
                    (limit, offset),
                ).fetchall()
        return rows

    def list_runs_for_teacher(self, teacher_id: str,
                              limit: int = 100, offset: int = 0) -> list[dict]:
        """Audit runs scoped to one teacher via the owning task (AUD-H-01 / I2)."""
        with self._c() as conn:
            rows = conn.execute(
                "SELECT r.* FROM agent_runs r "
                "JOIN tasks t ON t.id = r.task_id "
                "WHERE t.teacher_id = %s ORDER BY r.created_at DESC LIMIT %s OFFSET %s",
                (teacher_id, limit, offset),
            ).fetchall()
        return rows

    # ---- lifecycle (AUD-H-09 / T1-09) ----
    def delete_draft(self, draft_id: str) -> bool:
        """Scoped deletion (subject/tenant data-rights request)."""
        with self._c() as conn:
            cur = conn.execute("DELETE FROM drafts WHERE id=%s", (draft_id,))
        return cur.rowcount > 0

    def purge_expired(self, retention_days: int) -> int:
        """Delete drafts older than the retention window, their tasks and audit
        runs, PLUS crash-orphaned tasks (created before the cutoff with no draft
        at all — e.g. a worker died mid-run). ISO UTC timestamps compare
        lexicographically. Returns the number of drafts purged."""
        import datetime as _dt

        cutoff = (_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=retention_days)).isoformat()
        with self._c() as conn:
            expired = conn.execute(
                "SELECT id, task_id FROM drafts WHERE created_at < %s", (cutoff,)
            ).fetchall()
            task_ids = [r["task_id"] for r in expired]
            draft_ids = [r["id"] for r in expired]
            for tid in task_ids:
                conn.execute("DELETE FROM agent_runs WHERE task_id=%s", (tid,))
                conn.execute("DELETE FROM tasks WHERE id=%s", (tid,))
            for did in draft_ids:
                conn.execute("DELETE FROM drafts WHERE id=%s", (did,))
            # crash-orphaned tasks: old tasks that never produced a draft
            orphaned = conn.execute(
                "SELECT id FROM tasks WHERE created_at < %s "
                "AND id NOT IN (SELECT task_id FROM drafts)",
                (cutoff,),
            ).fetchall()
            for row in orphaned:
                conn.execute("DELETE FROM agent_runs WHERE task_id=%s", (row["id"],))
                conn.execute("DELETE FROM tasks WHERE id=%s", (row["id"],))
        return len(draft_ids)


def _json(v: list[str]) -> str:
    import json
    return json.dumps(v, ensure_ascii=False)