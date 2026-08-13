FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY migrations ./migrations

# Run as an unprivileged user (T2-07): /data is the SQLite volume (compose)
# and must be owned by this user so WAL + migrations can write.
RUN useradd --system --uid 10001 solven \
    && mkdir -p /data \
    && chown -R solven:solven /data
USER solven

EXPOSE 8000

# NOTE: runtime build NOT verified on this machine (no Docker engine locally) —
# verify `docker compose up --build` on a Linux/CI runner before release.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
