"""Tests: migration runner — applies ordered SQL files idempotently + indexes exist."""

import sqlite3

import pytest

from app.migrate import apply_migrations


@pytest.fixture()
def conn():
    c = sqlite3.connect(":memory:")
    yield c
    c.close()


def test_applies_migrations_in_order(conn):
    applied = apply_migrations(conn)
    assert len(applied) >= 1  # 001_indexes.sql exists
    rows = conn.execute("SELECT name FROM schema_migrations ORDER BY seq").fetchall()
    assert [r[0] for r in rows] == applied


def test_migrations_idempotent(conn):
    apply_migrations(conn)
    second = apply_migrations(conn)
    assert second == []  # nothing re-applied
    count = conn.execute("SELECT COUNT(*) FROM schema_migrations").fetchone()[0]
    assert count >= 1


def test_migration_failure_is_atomic(tmp_path):
    """A failing migration must not record itself in schema_migrations (T2-03)."""
    import sqlite3

    from app.migrate import apply_migrations

    bad_dir = tmp_path / "bad_migrations"
    bad_dir.mkdir()
    (bad_dir / "001_ok.sql").write_text("CREATE TABLE IF NOT EXISTS t_ok (id INTEGER);", encoding="utf-8")
    (bad_dir / "002_bad.sql").write_text("ALTER TABLE nope ADD COLUMN x TEXT;", encoding="utf-8")

    conn = sqlite3.connect(":memory:")
    with pytest.raises(Exception):
        apply_migrations(conn, migrations_dir=bad_dir)
    # 001 committed; 002 rolled back and must not be recorded — and the same
    # failure recurs on a retry (no half-applied state)
    names = {r[0] for r in conn.execute("SELECT name FROM schema_migrations")}
    assert "001_ok.sql" in names
    assert "002_bad.sql" not in names
    with pytest.raises(Exception):
        apply_migrations(conn, migrations_dir=bad_dir)
    names = {r[0] for r in conn.execute("SELECT name FROM schema_migrations")}
    assert "002_bad.sql" not in names


def test_indexes_created(conn):
    apply_migrations(conn)
    names = {
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index'"
        ).fetchall()
    }
    assert "idx_agent_runs_task_id" in names
    assert "idx_drafts_status" in names


def test_migrations_fail_loudly_on_bad_sql(tmp_path):
    from pathlib import Path

    bad = tmp_path / "bad.sql"
    bad.write_text("THIS IS NOT SQL;", encoding="utf-8")
    c = sqlite3.connect(":memory:")
    with pytest.raises(Exception):
        apply_migrations(c, migrations_dir=tmp_path)
    c.close()
