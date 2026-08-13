"""Tests: backend production-readiness batch — WAL/busy_timeout, migrate CLI,
orphan purge, docs hidden in prod, request-id validation."""

import sqlite3
import uuid

from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Store
from app.main import create_app


def _prod_app(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return create_app(
        Settings(
            api_token="x" * 40,
            db_path=":memory:",
            env="production",
            llm="anthropic",
            cors_origins=["https://app.example.com"],
        )
    )


def _auth(token: str = "x" * 40) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---- T2-04: SQLite WAL + busy_timeout ----
def test_file_db_uses_wal_and_busy_timeout(tmp_path):
    store = Store(tmp_path / "solven.db")
    with store._c() as conn:
        assert conn.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"
        assert conn.execute("PRAGMA busy_timeout").fetchone()[0] == 5000


def test_memory_db_keeps_working():
    store = Store(":memory:")
    store.add_draft("d1", "t1", "lesson-plan", "in", "out")
    assert store.get_draft("d1") is not None


# ---- DEV-06: migrate CLI ----
def test_migrate_cli_accepts_db_flag(tmp_path, capsys):
    from app.migrate import main

    db_file = tmp_path / "cli" / "solven.db"
    rc = main(["--db", str(db_file)])
    out = capsys.readouterr().out
    assert rc == 0
    assert db_file.exists()
    assert "migrations applied" in out
    # second run is idempotent
    rc2 = main(["--db", str(db_file)])
    assert rc2 == 0


def test_migrate_cli_legacy_positional_still_works(tmp_path):
    from app.migrate import main

    db_file = tmp_path / "legacy.db"
    assert main([str(db_file)]) == 0
    assert db_file.exists()


def test_migrate_cli_memory(tmp_path, capsys):
    from app.migrate import main

    assert main(["--db", ":memory:"]) == 0
    assert "migrations applied" in capsys.readouterr().out


# ---- T1-09: orphan purge ----
def test_purge_removes_crash_orphaned_tasks(tmp_path):
    import datetime

    store = Store(tmp_path / "solven.db")
    store.create_task("orphan-old", "lesson-plan", "x", teacher_id="t1")
    store.create_task("orphan-fresh", "lesson-plan", "x", teacher_id="t1")
    old = datetime.datetime(2000, 1, 1, tzinfo=datetime.timezone.utc).isoformat()
    with store._c() as conn:
        conn.execute("UPDATE tasks SET created_at=? WHERE id='orphan-old'", (old,))

    store.purge_expired(retention_days=180)
    assert store.get_task("orphan-old") is None
    assert store.get_task("orphan-fresh") is not None


# ---- SEC-L-02: docs hidden in production ----
def test_docs_hidden_in_production(monkeypatch):
    client = TestClient(_prod_app(monkeypatch))
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_docs_visible_in_dev():
    client = TestClient(
        create_app(Settings(api_token="test-token", db_path=":memory:", env="dev"))
    )
    assert client.get("/docs").status_code == 200


# ---- SEC-L-01: request-id validation ----
def test_request_id_valid_echoed():
    client = TestClient(
        create_app(Settings(api_token="test-token", db_path=":memory:", env="dev"))
    )
    rid = "abc-123_XYZ"
    r = client.get("/health", headers={"x-request-id": rid})
    assert r.headers.get("x-request-id") == rid


def test_request_id_invalid_replaced():
    client = TestClient(
        create_app(Settings(api_token="test-token", db_path=":memory:", env="dev"))
    )
    evil = "injection\n" + "A" * 200
    r = client.get("/health", headers={"x-request-id": evil})
    got = r.headers.get("x-request-id")
    assert got is not None and got != evil
    assert len(got) <= 16  # fresh uuid4 hex prefix
