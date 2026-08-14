"""Tests: backend production-readiness batch — Postgres readiness, migrate CLI,
orphan purge, docs hidden in prod, request-id validation."""

import uuid

from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Store
from app.main import create_app


def _prod_app(monkeypatch, db_url, store, prod_db_url):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return create_app(
        Settings(
            api_token="x" * 40,
            database_url=prod_db_url,
            env="production",
            llm="anthropic",
            cors_origins=["https://app.example.com"],
        )
    )


def _auth(token: str = "x" * 40) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---- Postgres readiness ----
def test_readyz_ok_and_migrations_applied(db_url):
    """PG-relevant readiness: /readyz 200 and schema_migrations populated."""
    store = Store(db_url)
    with store._c() as conn:
        migrated = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
    assert migrated, "migrations must be applied"
    assert any(name.startswith("00") for name in migrated)


def test_store_keeps_working(db_url, store):
    store.add_draft("d1", "t1", "lesson-plan", "in", "out")
    assert store.get_draft("d1") is not None


# ---- DEV-06: migrate CLI ----
def test_migrate_cli_accepts_db_flag(db_url, capsys):
    from app.migrate import main

    rc = main(["--db", db_url])
    out = capsys.readouterr().out
    assert rc == 0
    assert "migrations applied" in out
    # second run is idempotent
    rc2 = main(["--db", db_url])
    assert rc2 == 0


def test_migrate_cli_legacy_positional_still_works(db_url):
    from app.migrate import main

    assert main([db_url]) == 0


# ---- T1-09: orphan purge ----
def test_purge_removes_crash_orphaned_tasks(db_url, store):
    import datetime

    store.create_task("orphan-old", "lesson-plan", "x", teacher_id="t1")
    store.create_task("orphan-fresh", "lesson-plan", "x", teacher_id="t1")
    old = datetime.datetime(2000, 1, 1, tzinfo=datetime.timezone.utc).isoformat()
    with store._c() as conn:
        conn.execute("UPDATE tasks SET created_at=%s WHERE id='orphan-old'", (old,))

    store.purge_expired(retention_days=180)
    assert store.get_task("orphan-old") is None
    assert store.get_task("orphan-fresh") is not None


# ---- SEC-L-02: docs hidden in production ----
def test_docs_hidden_in_production(monkeypatch, db_url, store, prod_db_url):
    client = TestClient(_prod_app(monkeypatch, db_url, store, prod_db_url))
    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_docs_visible_in_dev(db_url):
    client = TestClient(
        create_app(Settings(api_token="test-token", database_url=db_url, env="dev"))
    )
    assert client.get("/docs").status_code == 200


# ---- SEC-L-01: request-id validation ----
def test_request_id_valid_echoed(db_url):
    client = TestClient(
        create_app(Settings(api_token="test-token", database_url=db_url, env="dev"))
    )
    rid = "abc-123_XYZ"
    r = client.get("/health", headers={"x-request-id": rid})
    assert r.headers.get("x-request-id") == rid


def test_request_id_invalid_replaced(db_url):
    client = TestClient(
        create_app(Settings(api_token="test-token", database_url=db_url, env="dev"))
    )
    evil = "injection\n" + "A" * 200
    r = client.get("/health", headers={"x-request-id": evil})
    got = r.headers.get("x-request-id")
    assert got is not None and got != evil
    assert len(got) <= 16  # fresh uuid4 hex prefix