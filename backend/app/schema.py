from typing import Literal, Optional

from pydantic import BaseModel, Field

AgentType = Literal["grading", "lesson-plan", "reporting"]
DraftStatus = Literal["pending", "approved", "rejected"]


class TaskRequest(BaseModel):
    agent: AgentType
    input: str = Field(min_length=1, max_length=50_000)
    rubric: Optional[str] = Field(default=None, max_length=10_000)  # grading only


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
