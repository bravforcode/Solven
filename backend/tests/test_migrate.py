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
