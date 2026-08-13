"""Release preflight — fail closed for unsafe production configuration.

Usage:
    python -m app.preflight            # reads SOLVEN_* env, exit 1 on failures

Checks (matching Settings production gates):
  - strong SOLVEN_API_TOKEN (>= 32 chars, not a known default)
  - SOLVEN_CORS_ORIGINS does not contain localhost / 127.0.0.1
  - SOLVEN_LLM is not 'mock'
  - NEXT_PUBLIC_SITE_URL is a real deployment URL (placeholder rejected)
"""

import os
import sys
from typing import Optional

from pydantic import ValidationError

from app.config import Settings

_FORBIDDEN_SITE_URL_MARKERS = ("solven.example.com",)


def check(settings: Settings, site_url: Optional[str] = None) -> list[str]:
    """Return list of failure messages; empty list means the config is safe.

    Settings are re-validated as if deploying to production: preflight is a
    release gate, so dev defaults are not acceptable here.
    """
    failures: list[str] = []
    try:
        Settings.model_validate({**settings.model_dump(), "env": "production"})
    except ValidationError as exc:
        failures.extend(err["msg"] for err in exc.errors())
    if not site_url or any(marker in site_url for marker in _FORBIDDEN_SITE_URL_MARKERS):
        failures.append("site_url must be a real deployment URL (placeholder rejected)")
    return failures


def _mask(token: str) -> str:
    if len(token) <= 4:
        return "****"
    return "****" + token[-4:]


def _main() -> int:
    try:
        settings = Settings()
    except ValidationError as exc:
        print("PREFLIGHT FAIL: " + "; ".join(err["msg"] for err in exc.errors()))
        return 1

    failures = check(settings, site_url=os.environ.get("NEXT_PUBLIC_SITE_URL"))
    print(
        "PREFLIGHT config: "
        f"env={settings.env} api_token={_mask(settings.api_token)} "
        f"cors_origins={settings.cors_origins} llm={settings.llm}"
    )
    if failures:
        print("PREFLIGHT FAIL:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("PREFLIGHT OK")
    return 0


if __name__ == "__main__":
    sys.exit(_main())
