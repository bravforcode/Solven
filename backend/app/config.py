"""Enterprise configuration — every knob comes from env (SOLVEN_* prefix) or .env.

Usage:
    settings = Settings()                     # reads env + optional .env
    Settings(api_token="x")                   # explicit override (tests)
"""

from typing import Annotated

from pydantic import BeforeValidator, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _split_origins(v):
    """Env value is a comma-separated string; accept a list too (tests/default)."""
    if isinstance(v, str):
        return [o.strip() for o in v.split(",") if o.strip()]
    return v


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SOLVEN_", env_file=".env", extra="ignore")

    app_name: str = "Solven Backend"
    version: str = "0.2.0"

    # Bearer token required on every /api/* route (except /health).
    # CHANGE THIS in production — dev default is deliberate and loud.
    api_token: str = "dev-secret-change-me"
    # requests allowed per IP per minute
    rate_limit_per_min: int = 60
    # comma-separated list of allowed browser origins (env: SOLVEN_CORS_ORIGINS)
    cors_origins: Annotated[list[str], NoDecode, BeforeValidator(_split_origins)] = [
        "http://localhost:3000"
    ]
    # empty -> backend/data/solven.db ; ":memory:" for tests
    db_path: str = ""

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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v
