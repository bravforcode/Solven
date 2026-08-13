from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

AgentType = Literal["grading", "lesson-plan", "reporting"]
DraftStatus = Literal["pending", "approved", "rejected", "quarantined"]


class TaskRequest(BaseModel):
    agent: AgentType
    input: str = Field(min_length=1, max_length=50_000)
    rubric: Optional[str] = Field(default=None, max_length=10_000)  # grading only
    client_task_id: Optional[str] = Field(default=None, max_length=100)
    # client-generated id for idempotent replay (offline-queue retry after reconnect)

    @model_validator(mode="after")
    def grading_requires_rubric(self) -> "TaskRequest":
        # AUD-H-13 / ARCH-04: grading without criteria must fail validation —
        # a plausible fixed mock score must never be produced without a rubric.
        if self.agent == "grading" and (self.rubric is None or self.rubric.strip() == ""):
            raise ValueError("rubric is required for grading agent")
        return self


class DraftOut(BaseModel):
    id: str
    agent: AgentType
    input: str
    output: str
    status: DraftStatus
    warnings: list[str] = []
    createdAt: str


class PatchDraft(BaseModel):
    status: DraftStatus


class RunRecord(BaseModel):
    """One row of the agent_runs audit table."""

    id: str
    task_id: str
    agent: str
    model: str
    prompt_hash: str
    output_hash: str
    status: str
    latency_ms: int
    cost_estimate: float
    guardrail_passed: bool
    created_at: str
