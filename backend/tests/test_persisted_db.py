"""Regression tests: Postgres-backed store works end-to-end (AUD-C-01, AUD-M-03, DEV-02).

Store must accept a database_url and app startup must migrate + serve the same
Postgres database. Default-URL resolution (Store(database_url="")) is covered
here too.
"""

import psycopg
from psycopg.rows import dict_row

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import DB_URL_DEFAULT, Store
from app.main import create_app

TOKEN = "test-token"


def _make_app(database_url: str, monkeypatch):
    monkeypatch.setenv("SOLVEN_LLM", "mock")
    return create_app(Settings(api_token=TOKEN, database_url=database_url))


def _auth() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def test_store_default_url_resolves_to_db_url_default():
    """Store(database_url="") must fall back to DB_URL_DEFAULT (not crash)."""
    store = Store()
    assert store._database_url == DB_URL_DEFAULT


def test_store_accepts_url(db_url, store):
    """AC-1: Store(database_url)._c() works against Postgres."""
    store.add_draft("d1", "t1", "grading", "in", "out")
    assert store.get_draft("d1")["status"] == "pending"


def test_postgres_backed_db_end_to_end(db_url, store, monkeypatch):
    """Regression: configured Postgres DB works via TestClient (create/list/patch/audit)."""
    client = TestClient(_make_app(db_url, monkeypatch))

    # create draft
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "คำตอบนักเรียน: 2+2=4", "rubric": "เกณฑ์การให้คะแนน"},
        headers=_auth(),
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "pending"
    assert d["id"]

    # list
    r = client.get("/api/drafts", headers=_auth())
    assert r.status_code == 200
    assert [x["id"] for x in r.json()] == [d["id"]]

    # patch
    r = client.patch(f"/api/drafts/{d['id']}", json={"status": "approved"}, headers=_auth())
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"

    # audit trail
    r = client.get("/api/audit", headers=_auth())
    assert r.status_code == 200
    runs = r.json()
    assert any(run["task_id"] for run in runs)

    # data is truly persisted (fresh connection sees it)
    with psycopg.connect(db_url, row_factory=dict_row) as conn:
        row = conn.execute("SELECT status FROM drafts WHERE id=%s", (d["id"],)).fetchone()
        assert row["status"] == "approved"
        migrated = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
        assert migrated, "migrations must run on the same Postgres path"