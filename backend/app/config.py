"""Enterprise configuration — every knob comes from env (SOLVEN_* prefix) or .env.

Usage:
    settings = Settings()                     # reads env + optional .env
    Settings(api_token="x")                   # explicit override (tests)
"""

import os
from typing import Annotated

from pydantic import BeforeValidator, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Tokens that are public knowledge / development-only and must never be
# accepted in a production deployment.
_KNOWN_DEV_TOKENS = {
    "dev-secret-change-me",
    "test-token",
    "changeme",
    "change-me-to-a-long-random-string",
}


def _split_origins(v):
    """Env value is a comma-separated string; accept a list too (tests/default)."""
    if isinstance(v, str):
        return [o.strip() for o in v.split(",") if o.strip()]
    return v


def _split_list(v):
    """Comma-separated env value -> list[str] (same shape as origins)."""
    if isinstance(v, str):
        return [o.strip() for o in v.split(",") if o.strip()]
    return v


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SOLVEN_", env_file=".env", extra="ignore")

    app_name: str = "Solven Backend"
    version: str = "0.2.0"

    # Deployment environment: "dev" (permissive demo defaults) or "production"
    # (fail-closed gates below). Env: SOLVEN_ENV
    env: str = "dev"

    # Bearer token required on every /api/* route (except /health).
    # CHANGE THIS in production — dev default is deliberate and loud.
    api_token: str = "dev-secret-change-me"
    # LLM mode: mock / auto / anthropic / openai (read by app/llm.py)
    llm: str = "mock"
    # Approved LLM providers (comma-separated, env SOLVEN_APPROVED_LLM_PROVIDERS).
    # Production rejects SOLVEN_LLM values not on this list (AUD-C-04 / T0-04).
    approved_llm_providers: Annotated[
        list[str], NoDecode, BeforeValidator(_split_list)
    ] = ["mock", "anthropic", "openai", "auto"]
    # requests allowed per IP per minute
    rate_limit_per_min: int = 60
    # comma-separated list of allowed browser origins (env: SOLVEN_CORS_ORIGINS)
    cors_origins: Annotated[list[str], NoDecode, BeforeValidator(_split_origins)] = [
        "http://localhost:3000"
    ]
    # empty -> backend/data/solven.db ; ":memory:" for tests
    db_path: str = ""
    # Data retention (days) for drafts/tasks/runs — PDPA lifecycle (AUD-H-09).
    # Purge runs at startup; synthetic policy assumed 180 days until the owner
    # confirms the legal retention period.
    retention_days: int = 180

    @field_validator("rate_limit_per_min")
    @classmethod
    def _positive_rate(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("rate_limit_per_min must be positive")
        return v

    @field_validator("api_token")
    @classmethod
    def _non_blank_token(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("api_token must not be blank")
        return v.strip()

    @field_validator("env")
    @classmethod
    def _valid_env(cls, v: str) -> str:
        if v not in ("dev", "production"):
            raise ValueError("env must be 'dev' or 'production'")
        return v

    @model_validator(mode="after")
    def _production_gates(self) -> "Settings":
        """Fail closed for production: strong secret, real origins, real LLM.

        Collects every violation into one message so preflight reports the
        full list of problems instead of only the first one.
        """
        if self.env != "production":
            return self
        problems: list[str] = []
        if len(self.api_token) < 32 or self.api_token in _KNOWN_DEV_TOKENS:
            problems.append(
                "production requires SOLVEN_API_TOKEN >= 32 chars and not a known default"
            )
        if any("localhost" in o or "127.0.0.1" in o for o in self.cors_origins):
            problems.append("production SOLVEN_CORS_ORIGINS must not contain localhost/127.0.0.1")
        if self.llm == "mock":
            problems.append("production SOLVEN_LLM must not be 'mock'")
        if self.llm != "mock" and self.llm not in self.approved_llm_providers:
            problems.append(
                f"production SOLVEN_LLM={self.llm} is not in SOLVEN_APPROVED_LLM_PROVIDERS"
            )
        if self.llm == "anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
            problems.append("production SOLVEN_LLM=anthropic requires ANTHROPIC_API_KEY")
        if self.llm == "openai" and not os.environ.get("OPENAI_API_KEY"):
            problems.append("production SOLVEN_LLM=openai requires OPENAI_API_KEY")
        if self.llm == "auto" and not (
            os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
        ):
            problems.append("production SOLVEN_LLM=auto requires at least one provider key")
        if problems:
            raise ValueError("; ".join(problems))
        return self

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v
