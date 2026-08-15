"""Tests: migration runner — applies ordered SQL files idempotently + indexes exist."""

import psycopg
from psycopg.rows import dict_row

import pytest

from app.migrate import apply_migrations


@pytest.fixture()
def conn(db_url):
    c = psycopg.connect(db_url, row_factory=dict_row)
    yield c
    c.close()


def test_applies_migrations_in_order(conn):
    apply_migrations(conn)
    rows = conn.execute("SELECT name FROM schema_migrations ORDER BY seq").fetchall()
    names = [r["name"] for r in rows]
    assert len(names) >= 1  # 001_indexes.sql exists
    # every migration file is recorded exactly once, in filename order
    from app.migrate import MIGRATIONS_DIR

    expected = sorted(p.name for p in MIGRATIONS_DIR.glob("*.sql"))
    assert names == expected


def test_migrations_idempotent(conn):
    apply_migrations(conn)
    second = apply_migrations(conn)
    assert second == []  # nothing re-applied
    count = conn.execute("SELECT COUNT(*) AS count FROM schema_migrations").fetchone()["count"]
    assert count >= 1


def test_migration_failure_is_atomic(tmp_path, db_url):
    """A failing migration must not record itself in schema_migrations (T2-03)."""
    from app.migrate import apply_migrations

    bad_dir = tmp_path / "bad_migrations"
    bad_dir.mkdir()
    (bad_dir / "001_ok.sql").write_text("CREATE TABLE IF NOT EXISTS t_ok (id INTEGER);", encoding="utf-8")
    (bad_dir / "002_bad.sql").write_text("ALTER TABLE nope ADD COLUMN x TEXT;", encoding="utf-8")

    conn = psycopg.connect(db_url, row_factory=dict_row)
    with pytest.raises(Exception):
        apply_migrations(conn, migrations_dir=bad_dir)
    # 001 committed; 002 rolled back and must not be recorded — and the same
    # failure recurs on a retry (no half-applied state)
    names = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
    assert "001_ok.sql" in names
    assert "002_bad.sql" not in names
    with pytest.raises(Exception):
        apply_migrations(conn, migrations_dir=bad_dir)
    names = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
    assert "002_bad.sql" not in names
    conn.close()
    # cleanup: the scratch 001_ok.sql was committed into the shared tracker —
    # remove it so later runs of test_applies_migrations_in_order stay green
    c = psycopg.connect(db_url, row_factory=dict_row)
    c.execute("DELETE FROM schema_migrations WHERE name='001_ok.sql'")
    c.commit()
    c.close()


def test_indexes_created(conn):
    apply_migrations(conn)
    names = {
        r["indexname"]
        for r in conn.execute(
            "SELECT indexname FROM pg_indexes "
            "WHERE indexname IN ('idx_agent_runs_task_id', 'idx_drafts_status')"
        ).fetchall()
    }
    assert "idx_agent_runs_task_id" in names
    assert "idx_drafts_status" in names


def test_003_orgs_billing_applied(conn):
    """003 creates org/billing tables and adds org_id to the data tables."""
    apply_migrations(conn)
    tables = {
        r["table_name"]
        for r in conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        ).fetchall()
    }
    for t in ("orgs", "org_members", "subscriptions", "usage_counters", "stripe_events"):
        assert t in tables
    for t in ("tasks", "drafts", "agent_runs"):
        cols = {
            r["column_name"]
            for r in conn.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name=%s", (t,)
            ).fetchall()
        }
        assert "org_id" in cols


def test_migrations_fail_loudly_on_bad_sql(tmp_path, db_url):
    from pathlib import Path

    bad = tmp_path / "bad.sql"
    bad.write_text("THIS IS NOT SQL;", encoding="utf-8")
    c = psycopg.connect(db_url, row_factory=dict_row)
    with pytest.raises(Exception):
        apply_migrations(c, migrations_dir=tmp_path)
    c.close()