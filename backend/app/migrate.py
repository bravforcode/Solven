"""Migration runner — applies backend/migrations/*.sql in filename order, idempotently.

Usage:
    python -m app.migrate            # migrate the default DB (backend/data/solven.db)
    python -m app.migrate --db :memory:   # or explicit path

Each migration runs inside a transaction; its filename is recorded in
schema_migrations so it is never applied twice.
"""

import sqlite3
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"
TRACKER = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def apply_migrations(conn: sqlite3.Connection, migrations_dir: Path | None = None) -> list[str]:
    """Apply pending migrations. Returns the names of migrations applied.

    Each migration + its tracker insert runs inside ONE explicit transaction
    guarded by BEGIN IMMEDIATE (AUD-M-04 / DEV-06): concurrent startups cannot
    half-apply a migration or double-apply it.
    """
    md = migrations_dir or MIGRATIONS_DIR
    # base schema first so migrations are self-contained (they may reference tables)
    from app.db import _SCHEMA

    conn.executescript(_SCHEMA)
    conn.executescript(TRACKER)
    applied = {r[0] for r in conn.execute("SELECT name FROM schema_migrations").fetchall()}
    done: list[str] = []
    for path in sorted(md.glob("*.sql")):
        if path.name in applied:
            continue
        sql = path.read_text(encoding="utf-8")
        # strip SQL comment lines first: a ';' inside a comment must not split
        # the migration into bogus statements
        sql = "\n".join(
            ln for ln in sql.splitlines() if not ln.strip().startswith("--")
        )
        conn.execute("BEGIN IMMEDIATE")
        try:
            for stmt in sql.split(";"):
                if stmt.strip():
                    conn.execute(stmt)
            conn.execute("INSERT INTO schema_migrations (name) VALUES (?)", (path.name,))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        done.append(path.name)
    return done


def main(argv: list[str] | None = None) -> int:
    """CLI entry: python -m app.migrate [--db <path>] [<legacy-positional-path>]"""
    import argparse

    default_db = Path(__file__).resolve().parent.parent / "data" / "solven.db"
    parser = argparse.ArgumentParser(prog="python -m app.migrate")
    parser.add_argument("--db", default=None, help=f"SQLite DB path (default: {default_db})")
    parser.add_argument("db_pos", nargs="?", default=None, help="(legacy) positional DB path")
    args = parser.parse_args(argv)
    db_value = args.db or args.db_pos or str(default_db)
    path = Path(db_value)
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    try:
        applied = apply_migrations(conn)
        print(f"migrations applied: {applied or 'none (up to date)'}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
