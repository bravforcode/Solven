"""Bearer-token auth dependency (HTTPBearer).

Enterprise note: this validates a single deployment token (service-to-service
or gateway-issued). Swap the dependency body for OIDC/JWT validation when a
user directory is attached — the interface (Bearer scheme) stays the same.
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings


def auth_dependency(settings: Settings):
    scheme = HTTPBearer(auto_error=False)

    def require_token(
        creds: HTTPAuthorizationCredentials | None = Depends(scheme),
    ) -> None:
        if creds is None or creds.credentials != settings.api_token:
            raise HTTPException(
                status_code=401,
                detail="invalid or missing bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return require_token
