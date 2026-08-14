"""Migration runner — applies backend/migrations/*.sql in filename order, idempotently.

Usage:
    python -m app.migrate            # migrate the default DB (DB_URL_DEFAULT)
    python -m app.migrate --db postgresql://solven:solven@localhost:5432/solven

Each migration runs inside a transaction; its filename is recorded in
schema_migrations so it is never applied twice.
"""

import sys
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from app.db import DB_URL_DEFAULT, _SCHEMA, _exec_script

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"
TRACKER = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    seq BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def apply_migrations(conn: psycopg.Connection, migrations_dir: Path | None = None) -> list[str]:
    """Apply pending migrations. Returns the names of migrations applied.

    Each migration + its tracker insert runs inside ONE explicit transaction
    (AUD-M-04 / DEV-06): concurrent startups cannot half-apply a migration or
    double-apply it.
    """
    md = migrations_dir or MIGRATIONS_DIR
    # base schema first so migrations are self-contained (they may reference tables)
    _exec_script(conn, _SCHEMA)
    _exec_script(conn, TRACKER)
    # commit the base-schema work so the per-migration transaction() blocks
    # below start REAL transactions (psycopg3 turns them into savepoints when
    # an implicit transaction is still open — tracker inserts would then be
    # rolled back on connection close, e.g. the migrate CLI).
    conn.commit()
    applied = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations").fetchall()}
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
        with conn.transaction():
            for stmt in sql.split(";"):
                if stmt.strip():
                    conn.execute(stmt)
            conn.execute("INSERT INTO schema_migrations (name) VALUES (%s)", (path.name,))
        done.append(path.name)
    return done


def main(argv: list[str] | None = None) -> int:
    """CLI entry: python -m app.migrate [--db <url>] [<legacy-positional-url>]"""
    import argparse

    parser = argparse.ArgumentParser(prog="python -m app.migrate")
    parser.add_argument("--db", default=None, help=f"Postgres URL (default: {DB_URL_DEFAULT})")
    parser.add_argument("db_pos", nargs="?", default=None, help="(legacy) positional DB URL")
    args = parser.parse_args(argv)
    db_value = args.db or args.db_pos or DB_URL_DEFAULT
    conn = psycopg.connect(db_value, row_factory=dict_row)
    try:
        applied = apply_migrations(conn)
        print(f"migrations applied: {applied or 'none (up to date)'}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())