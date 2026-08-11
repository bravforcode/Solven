"""Middleware: security headers, request-id + structured logging, per-IP rate limiting."""

import logging
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
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)
        response.headers["x-request-id"] = request_id
        logger.info(
            "request",
            extra={
                "request_id": request_id,
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
