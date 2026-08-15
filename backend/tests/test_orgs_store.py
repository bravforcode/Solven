"""Tests: org/billing store methods (Task 2 — migration 003)."""


def test_ensure_org_idempotent(store):
    store.ensure_org("org-1", "School A")
    store.ensure_org("org-1", "School A")  # second call is a no-op
    with store._c() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS count FROM orgs WHERE id=%s", ("org-1",)
        ).fetchone()
    assert row["count"] == 1


def test_ensure_member_upserts_role(store):
    store.ensure_org("org-1", "School A")
    store.ensure_member("user-1", "org-1", "teacher")
    store.ensure_member("user-1", "org-1", "admin")  # upsert role
    with store._c() as conn:
        rows = conn.execute(
            "SELECT role FROM org_members WHERE user_id=%s AND org_id=%s",
            ("user-1", "org-1"),
        ).fetchall()
    assert [r["role"] for r in rows] == ["admin"]


def test_get_org_plan_defaults_to_trial(store):
    assert store.get_org_plan("missing-org") == "trial"
    store.ensure_org("org-1", "School A", plan="pro")
    assert store.get_org_plan("org-1") == "pro"


def test_increment_usage_grows_count_and_sets_quota(store):
    store.ensure_org("org-1", "School A")
    first = store.increment_usage("org-1", "2026-08", quota=50)
    assert first == {"count": 1, "quota": 50}
    second = store.increment_usage("org-1", "2026-08", quota=50)
    assert second == {"count": 2, "quota": 50}


def test_upsert_subscription_overwrites(store):
    store.ensure_org("org-1", "School A")
    store.upsert_subscription("org-1", "sub_1", "active", "2026-09-01T00:00:00Z")
    store.upsert_subscription("org-1", "sub_2", "canceled", "2026-10-01T00:00:00Z")
    with store._c() as conn:
        row = conn.execute(
            "SELECT stripe_sub_id, status FROM subscriptions WHERE org_id=%s",
            ("org-1",),
        ).fetchone()
    assert row["stripe_sub_id"] == "sub_2"
    assert row["status"] == "canceled"


def test_record_stripe_event_deduplicates(store):
    assert store.record_stripe_event("evt_1") is True
    assert store.record_stripe_event("evt_1") is False


def test_set_org_plan_and_stripe_customer(store):
    store.ensure_org("org-1", "School A")
    assert store.get_org_stripe_customer("org-1") is None
    store.set_org_stripe_customer("org-1", "cus_1")
    assert store.get_org_stripe_customer("org-1") == "cus_1"
    store.set_org_plan("org-1", "pro")
    assert store.get_org_plan("org-1") == "pro"


def test_create_task_persists_org_id(store):
    store.create_task("task-1", "grading", "x", org_id="org-1")
    with store._c() as conn:
        row = conn.execute(
            "SELECT org_id FROM tasks WHERE id=%s", ("task-1",)
        ).fetchone()
    assert row["org_id"] == "org-1"


def test_add_draft_persists_org_id(store):
    store.add_draft("draft-1", "task-1", "grading", "x", "out", org_id="org-1")
    with store._c() as conn:
        row = conn.execute(
            "SELECT org_id FROM drafts WHERE id=%s", ("draft-1",)
        ).fetchone()
    assert row["org_id"] == "org-1"


def test_add_run_persists_org_id(store):
    run = {
        "id": "run-1", "task_id": "task-1", "agent": "grading", "model": "m",
        "prompt_hash": "p", "output_hash": "o", "status": "ok",
        "latency_ms": 10, "cost_estimate": 0.01, "guardrail_passed": True,
        "created_at": "2026-08-15T00:00:00+00:00",
    }
    store.add_run(run, org_id="org-1")
    with store._c() as conn:
        row = conn.execute(
            "SELECT org_id FROM agent_runs WHERE id=%s", ("run-1",)
        ).fetchone()
    assert row["org_id"] == "org-1"


def test_list_drafts_scoped_by_org(store):
    store.add_draft("d-1", "t-1", "grading", "x", "out", teacher_id="teacher-1", org_id="org-1")
    store.add_draft("d-2", "t-2", "grading", "x", "out", teacher_id="teacher-1", org_id="org-2")
    store.add_draft("d-3", "t-3", "grading", "x", "out", teacher_id="teacher-2", org_id="org-1")
    org1 = store.list_drafts(org_id="org-1")
    assert {r["id"] for r in org1} == {"d-1", "d-3"}
    both = store.list_drafts(teacher_id="teacher-1", org_id="org-1")
    assert {r["id"] for r in both} == {"d-1"}


def test_list_runs_for_teacher_scoped_by_org(store):
    def _run(rid, task_id):
        return {
            "id": rid, "task_id": task_id, "agent": "grading", "model": "m",
            "prompt_hash": "p", "output_hash": "o", "status": "ok",
            "latency_ms": 10, "cost_estimate": 0.01, "guardrail_passed": True,
            "created_at": "2026-08-15T00:00:00+00:00",
        }

    store.create_task("t-1", "grading", "x", teacher_id="teacher-1", org_id="org-1")
    store.create_task("t-2", "grading", "x", teacher_id="teacher-1", org_id="org-2")
    store.add_run(_run("r-1", "t-1"))
    store.add_run(_run("r-2", "t-2"))
    runs = store.list_runs_for_teacher("teacher-1", org_id="org-1")
    assert {r["id"] for r in runs} == {"r-1"}