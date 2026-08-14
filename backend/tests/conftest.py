"""Postgres test fixtures — replaces the old per-file SQLite :memory: pattern.

Requires a reachable Postgres. Default: local compose db (solven/solven@localhost:5432/solven_test).
Override with SOLVEN_TEST_DATABASE_URL. Fails loudly if unreachable.
"""

import os

import pytest

TEST_DB_URL = os.environ.get(
    "SOLVEN_TEST_DATABASE_URL",
    "postgresql://solven:solven@localhost:5432/solven_test",
)

# app.main executes `app = create_app()` at import time, which now connects to
# Postgres (startup migrations). Point it at the test DB — conftest loads before
# any test module imports, so that module-level app never stalls against the
# default (compose) URL.
os.environ["SOLVEN_DATABASE_URL"] = TEST_DB_URL

_DATA_TABLES = ("tasks", "drafts", "agent_runs")


@pytest.fixture()
def prod_db_url(db_url: str) -> str:
    """Same reachable Postgres, spelled past the production DB-URL gate.

    Settings(env="production") rejects database_url strings containing literal
    'localhost' / '127.0.0.1'. PG hostnames are case-insensitive, so the
    uppercase spelling resolves to the identical server.
    """
    return db_url.replace("localhost", "LOCALHOST")


@pytest.fixture(scope="session")
def db_url() -> str:
    import psycopg

    with psycopg.connect(TEST_DB_URL) as conn:
        conn.execute("SELECT 1")
    return TEST_DB_URL


@pytest.fixture(scope="session")
def _schema(db_url):
    from app.db import Store
    from app.migrate import apply_migrations

    store = Store(db_url)
    with store._c() as conn:
        apply_migrations(conn)
    return store


@pytest.fixture()
def store(_schema):
    with _schema._c() as conn:
        conn.execute(
            f"TRUNCATE {', '.join(_DATA_TABLES)} RESTART IDENTITY CASCADE"
        )
    return _schema