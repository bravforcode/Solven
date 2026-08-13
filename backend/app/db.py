"""SQLite store: tasks, drafts, agent_runs (audit). In-memory for tests."""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "solven.db"

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


def _conn(db_path: Optional[Path] = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    if path != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    # check_same_thread=False: FastAPI runs sync endpoints in a threadpool, so the
    # connection may be used from different threads (single-process demo; SQLite
    # serializes writes internally).
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    # keep file-backed stores on the same schema as :memory: and the app startup
    # path — migrations are idempotent (tracked by name), so this is cheap.
    if path != ":memory:":
        from app.migrate import apply_migrations

        apply_migrations(conn)
    return conn


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, db_path: Optional[Path] = None):
        self._db_path = db_path
        self._mem_conn: Optional[sqlite3.Connection] = None
        if db_path == ":memory:":
            # SQLite :memory: databases are per-connection — share ONE connection
            # so writes from different calls hit the same database. Migrations
            # are applied so :memory: matches file-backed behavior exactly.
            from app.migrate import apply_migrations

            self._mem_conn = _conn(":memory:")
            self._mem_conn.row_factory = sqlite3.Row
            apply_migrations(self._mem_conn)

    def _c(self) -> sqlite3.Connection:
        if self._mem_conn is not None:
            return self._mem_conn
        return _conn(self._db_path)

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
                "INSERT OR IGNORE INTO tasks (id, teacher_id, agent, input, state, created_at) "
                "VALUES (?,?,?,?,?,?)",
                (task_id, teacher_id, agent, input_text, state, now_iso()),
            )
        return cur.rowcount > 0

    def set_task_state(self, task_id: str, state: str) -> None:
        with self._c() as conn:
            conn.execute("UPDATE tasks SET state=? WHERE id=?", (state, task_id))

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
    ) -> None:
        with self._c() as conn:
            conn.execute(
                "INSERT INTO drafts (id, task_id, teacher_id, agent, input, output, status, warnings, created_at) "
                "VALUES (?,?,?,?,?,?, 'pending', ?, ?)",
                (draft_id, task_id, teacher_id, agent, input_text, output,
                 _json(warnings or []), now_iso()),
            )

    def list_drafts(self, teacher_id: Optional[str] = None) -> list[dict]:
        with self._c() as conn:
            if teacher_id:
                rows = conn.execute(
                    "SELECT * FROM drafts WHERE teacher_id=? ORDER BY created_at DESC",
                    (teacher_id,),
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM drafts ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

    def get_draft(self, draft_id: str) -> Optional[dict]:
        with self._c() as conn:
            row = conn.execute("SELECT * FROM drafts WHERE id=?", (draft_id,)).fetchone()
        return dict(row) if row else None

    def set_draft_status(self, draft_id: str, status: str) -> Optional[dict]:
        with self._c() as conn:
            cur = conn.execute("UPDATE drafts SET status=?, reviewed_at=? WHERE id=?",
                               (status, now_iso(), draft_id))
            if cur.rowcount == 0:
                return None
            row = conn.execute("SELECT * FROM drafts WHERE id=?", (draft_id,)).fetchone()
        return dict(row)

    # ---- agent_runs (audit) ----
    def add_run(self, run: dict) -> None:
        with self._c() as conn:
            conn.execute(
                "INSERT INTO agent_runs (id, task_id, agent, model, prompt_hash, output_hash, status, "
                "latency_ms, cost_estimate, guardrail_passed, created_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (run["id"], run["task_id"], run["agent"], run["model"], run["prompt_hash"],
                 run["output_hash"], run["status"], run["latency_ms"], run["cost_estimate"],
                 1 if run["guardrail_passed"] else 0, run["created_at"]),
            )

    def list_runs(self, task_id: Optional[str] = None) -> list[dict]:
        with self._c() as conn:
            if task_id:
                rows = conn.execute("SELECT * FROM agent_runs WHERE task_id=? ORDER BY created_at",
                                    (task_id,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM agent_runs ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def _json(v: list[str]) -> str:
    import json
    return json.dumps(v, ensure_ascii=False)
