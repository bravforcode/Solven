"""LangGraph coordinator — state machine: route → sub-agent → guardrail → draft.

Audit: every agent call (including retries) is recorded in agent_runs.
Final state is ALWAYS a draft pending teacher approval (human-in-the-loop).
"""

import time
import uuid
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app import guardrail
from app.agents import run_sub_agent
from app.db import Store
from app.llm import get_llm, sha256


class FailClosedError(RuntimeError):
    """Raised when an LLM provider fails in a fail-closed (production) run.

    The caller must translate this into a non-2xx response — the request is
    never allowed to degrade into deterministic mock grading.
    """


class TaskNotOwnedError(RuntimeError):
    """Raised when a client_task_id already belongs to another teacher.

    Replay lookups are scoped by principal: reusing someone else's task id must
    never return their draft (cross-tenant IDOR, AUD-H-01 / C1).
    """


class CoordState(TypedDict):
    task_id: str
    agent: str
    input: str
    rubric: str | None
    output: str
    warnings: list[str]
    passed: bool
    retries: int
    teacher_id: str | None
    engine: str


def _now():
    from app.db import now_iso

    return now_iso()


def make_coordinator(store: Store, fail_closed: bool = False):
    llm = get_llm()

    def route(state: CoordState) -> CoordState:
        return {**state, "retries": 0}

    def run_agent(state: CoordState) -> CoordState:
        import httpx

        start = time.perf_counter()
        model = llm.model
        run_status = "completed"
        # PDPA boundary (T0-05): raw student text must NOT reach external
        # providers. Mock stays untouched (local, deterministic).
        if model.startswith("mock"):
            provider_input = state["input"]
            provider_rubric = state.get("rubric")
        else:
            from app.redact import redact_pii

            provider_input = redact_pii(state["input"])
            provider_rubric = redact_pii(state.get("rubric") or "") or None
        try:
            output = run_sub_agent(llm, state["agent"], provider_input, provider_rubric)
        except httpx.HTTPStatusError:
            if fail_closed:
                raise FailClosedError(
                    "LLM provider rejected the request (HTTP error); refusing to "
                    "fall back to mock output in production"
                ) from None
            # API key invalid/unavailable → honest fallback to deterministic mock
            # (recorded in agent_runs.status so the audit trail shows what ran)
            from app.llm import MockLLM

            fallback = MockLLM()
            output = run_sub_agent(fallback, state["agent"], state["input"], state.get("rubric"))
            model = fallback.model
            run_status = "fallback-mock"
        latency_ms = int((time.perf_counter() - start) * 1000)
        store.add_run(
            {
                "id": str(uuid.uuid4()),
                "task_id": state["task_id"],
                "agent": state["agent"],
                "model": model,
                "prompt_hash": sha256(state["input"]),
                "output_hash": sha256(output),
                "status": run_status,
                "latency_ms": latency_ms,
                "cost_estimate": 0.0 if model.startswith("mock") else 0.001,
                "guardrail_passed": 0,  # set after guardrail node
                "created_at": _now(),
            }
        )
        return {
            **state,
            "output": output,
            "engine": "mock" if model.startswith("mock") else "llm",
        }

    def guardrail_node(state: CoordState) -> CoordState:
        passed, warnings = guardrail.check(state["output"], state["input"], state["agent"])
        # update audit row guardrail flag (latest run for this task)
        with store._c() as conn:
            conn.execute(
                "UPDATE agent_runs SET guardrail_passed=? WHERE task_id=? AND created_at=(SELECT MAX(created_at) FROM agent_runs WHERE task_id=?)",
                (1 if passed else 0, state["task_id"], state["task_id"]),
            )
        return {**state, "passed": passed, "warnings": warnings}

    def should_retry(state: CoordState) -> str:
        if not state["passed"] and state["retries"] < 2:
            return "retry"
        return "finalize"

    def retry(state: CoordState) -> CoordState:
        return {**state, "retries": state["retries"] + 1}

    def finalize(state: CoordState) -> dict:
        # T1-07 (SEC-H-04): policy failures from a REAL provider are
        # QUARANTINED, not returned as ordinary pending drafts — the teacher
        # must consciously review them. The deterministic demo mock is exempt
        # (explicitly demo-only; production preflight blocks mock entirely).
        status = (
            "quarantined"
            if (not state["passed"] and state.get("engine") != "mock")
            else "pending"
        )
        store.add_draft(
            draft_id=str(uuid.uuid4()),
            task_id=state["task_id"],
            agent=state["agent"],
            input_text=state["input"],
            output=state["output"],
            warnings=state["warnings"],
            teacher_id=state.get("teacher_id"),
            status=status,
        )
        store.set_task_state(state["task_id"], "draft_ready")
        return {}

    g = StateGraph(CoordState)
    g.add_node("route", route)
    g.add_node("run_agent", run_agent)
    g.add_node("guardrail_node", guardrail_node)
    g.add_node("retry", retry)
    g.add_node("finalize", finalize)

    g.add_edge(START, "route")
    g.add_edge("route", "run_agent")
    g.add_edge("run_agent", "guardrail_node")
    g.add_conditional_edges(
        "guardrail_node", should_retry, {"retry": "retry", "finalize": "finalize"}
    )
    g.add_edge("retry", "run_agent")
    g.add_edge("finalize", END)

    return g.compile()


def run_task(
    store: Store,
    agent: str,
    user_input: str,
    rubric: str | None = None,
    client_task_id: str | None = None,
    fail_closed: bool = False,
    teacher_id: str | None = None,
) -> dict:
    task_id = client_task_id or str(uuid.uuid4())
    inserted = store.create_task(task_id, agent, user_input, teacher_id=teacher_id)
    if not inserted:
        # replayed request (e.g. offline-queue retry after reconnect) — return the
        # draft already produced instead of re-running the agent. The lookup is
        # scoped to THIS teacher: a foreign task id must never leak another
        # teacher's draft (cross-tenant IDOR).
        existing = [d for d in store.list_drafts(teacher_id=teacher_id) if d["task_id"] == task_id]
        if existing:
            return existing[0]
        raise TaskNotOwnedError(
            "client_task_id already used by another teacher (replay refused)"
        )
    state: CoordState = {
        "task_id": task_id,
        "agent": agent,
        "input": user_input,
        "rubric": rubric,
        "output": "",
        "warnings": [],
        "passed": True,
        "retries": 0,
        "teacher_id": teacher_id,
        # run_agent always overwrites with the actual engine before finalize
        "engine": "mock",
    }
    make_coordinator(store, fail_closed=fail_closed).invoke(state)
    drafts = [d for d in store.list_drafts() if d["task_id"] == task_id]
    return drafts[0]
