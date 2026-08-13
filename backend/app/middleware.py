"""Middleware: security headers, request-id + structured logging, per-IP rate limiting."""

import logging
import re
import time
import uuid
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("solven")

_WINDOW_SECONDS = 60
# bucket key: (app_id, client_ip) -> deque of request timestamps
_buckets: dict[tuple[int, str], deque] = defaultdict(deque)

# SEC-L-01: bounded, safe request-id format — anything else is ignored and a
# fresh id is generated (prevents log-injection/log-blowing via this header).
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    HEADERS = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
        "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
        "permissions-policy": "camera=(), microphone=(), geolocation=()",
    }

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for k, v in self.HEADERS.items():
            response.headers.setdefault(k, v)
        return response


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Echo/assign X-Request-ID and log every request with context."""

    async def dispatch(self, request: Request, call_next):
        header_id = request.headers.get("x-request-id")
        if not header_id or not _REQUEST_ID_RE.match(header_id):
            header_id = uuid.uuid4().hex[:16]
        request.state.request_id = header_id
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)
        response.headers["x-request-id"] = header_id
        logger.info(
            "request",
            extra={
                "request_id": header_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window per-IP limiter. In-memory — replace with Redis in multi-instance prod."""

    def __init__(self, app, limit_per_min: int, window_seconds: int = _WINDOW_SECONDS):
        super().__init__(app)
        self.limit = limit_per_min
        self.window = window_seconds

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        key = (id(self.app), ip)
        now = time.monotonic()
        bucket = _buckets[key]
        while bucket and now - bucket[0] > self.window:
            bucket.popleft()
        if len(bucket) >= self.limit:
            return JSONResponse({"detail": "rate limit exceeded"}, status_code=429)
        bucket.append(now)
        return await call_next(request)
