"""Vercel serverless function handler for FastAPI backend.

Uses Mangum to adapt FastAPI for AWS Lambda (Vercel's runtime).
"""

from mangum import Mangum

from app.main import app

handler = Mangum(app, lifespan="off")
