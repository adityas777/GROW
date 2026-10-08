"""
Pehla ₹500 — FastAPI Orchestrator
Main application entry point
"""
import os
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

from routers import chat, voice, paycheck, portfolio, ops, auth

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Pehla ₹500 – Copilot API",
    description="Hinglish AI investment copilot for Gen Z first-time investors",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(voice.router, prefix="/voice", tags=["Voice"])
app.include_router(paycheck.router, prefix="/paycheck", tags=["Paycheck"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(ops.router, prefix="/ops", tags=["Ops/Evals"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])


@app.get("/")
async def root():
    return {
        "app": "Pehla ₹500",
        "tagline": "Bina tension ke, pehla investment.",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
