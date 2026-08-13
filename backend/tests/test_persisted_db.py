"""Regression tests: file-backed SQLite DB works end-to-end (AUD-C-01, AUD-M-03, DEV-02).

Store must accept a real Path (not a str) and app startup must migrate + serve
the same file. `:memory:` mode is covered by the existing suite and must be
untouched.
"""

import os
import sqlite3

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

TOKEN = "test-token"


def _make_app(db_path: str):
    os.environ["SOLVEN_LLM"] = "mock"
    return create_app(Settings(api_token=TOKEN, db_path=db_path))


def _auth() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def test_store_accepts_path(tmp_path):
    """AC-1: Store(Path(...))._c() works for a file-backed DB."""
    from app.db import Store

    store = Store(tmp_path / "solven.db")
    store.add_draft("d1", "t1", "grading", "in", "out")
    assert store.get_draft("d1")["status"] == "pending"


def test_file_backed_db_end_to_end(tmp_path):
    """Regression: configured file DB works via TestClient (create/list/patch/audit).

    Fails on old code — create_app passes a str to Store, and Store._conn calls
    path.parent.mkdir on the str -> AttributeError -> 500.
    """
    db_file = tmp_path / "data" / "solven.db"  # nested parent: forces mkdir in _conn
    client = TestClient(_make_app(str(db_file)))

    # create draft
    r = client.post(
        "/api/coordinator",
        json={"agent": "grading", "input": "คำตอบนักเรียน: 2+2=4"},
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

    # data is truly persisted on disk (fresh connection sees it)
    assert db_file.exists()
    with sqlite3.connect(db_file) as conn:
        row = conn.execute("SELECT status FROM drafts WHERE id=?", (d["id"],)).fetchone()
        assert row[0] == "approved"
        migrated = {r[0] for r in conn.execute("SELECT name FROM schema_migrations")}
        assert migrated, "migrations must run on the same file-backed path"
