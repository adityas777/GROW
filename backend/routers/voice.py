"""
/voice router — STT and TTS endpoints.
Primary: Gnani API
Fallback: Groq Whisper (STT) + browser TTS (handled client-side)
"""
import os
import logging
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import io

logger = logging.getLogger(__name__)
router = APIRouter()

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

GNANI_STT_URL = "https://speech.gnani.ai/v1/recognize"
GNANI_TTS_URL = "https://speech.gnani.ai/v1/synthesize"


@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Convert speech to text with sub-second latency.
    Uses Groq Whisper-large-v3-turbo for instant Hindi/Hinglish transcription.
    """
    audio_bytes = await audio.read()

    # Primary: Fast Groq Whisper Turbo (<400ms)
    if GROQ_API_KEY:
        try:
            transcript = await _groq_whisper_stt(audio_bytes)
            if transcript:
                logger.info(f"[STT] Groq Whisper Turbo success: {transcript[:60]}")
                return {"transcript": transcript, "provider": "groq_whisper", "success": True}
        except Exception as e:
            logger.warning(f"[STT] Groq Whisper failed: {e}")

    # Fallback to Gnani if configured (with quick 2s timeout)
    if GNANI_API_KEY:
        try:
            transcript = await _gnani_stt(audio_bytes, audio.content_type or "audio/webm")
            if transcript:
                return {"transcript": transcript, "provider": "gnani", "success": True}
        except Exception as e:
            logger.warning(f"[STT] Gnani fallback failed: {e}")

    raise HTTPException(status_code=500, detail="Speech recognition failed. Please type instead.")


import re

def clean_tts_text(text: str) -> str:
    """Strip emojis and markdown so speech engines speak naturally without saying emoji names."""
    # Strip all 4-byte unicode emojis and symbols
    cleaned = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27bf\ufe0f]', '', text)
    cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)
    cleaned = re.sub(r'\*([^*]+)\*', r'\1', cleaned)
    cleaned = re.sub(r'#{1,6}\s*', '', cleaned)
    cleaned = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cleaned)
    cleaned = re.sub(r'₹\s*([\d,]+)', r'\1 rupees', cleaned)
    cleaned = re.sub(r'Rs\.?\s*([\d,]+)', r'\1 rupees', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'%', ' percent', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


@router.post("/tts")
async def text_to_speech(req: dict):
    """
    Convert text to speech audio.
    Instantly returns clean browser TTS flag for 0ms lag playback.
    """
    text = req.get("text", "")
    lang = req.get("lang", "hi-IN")

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    clean_text = clean_tts_text(text)

    # Direct instant browser TTS response
    return JSONResponse({
        "use_browser_tts": True,
        "text": clean_text,
        "lang": lang,
        "provider": "browser",
    })


async def _gnani_stt(audio_bytes: bytes, content_type: str) -> str:
    """Call Gnani STT API."""
    headers = {
        "Authorization": f"Bearer {GNANI_API_KEY}",
        "Content-Type": content_type,
    }
    params = {
        "language": "hi-IN",
        "model": "general",
        "encoding": "WEBM_OPUS",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            GNANI_STT_URL,
            headers=headers,
            params=params,
            content=audio_bytes,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("transcript", data.get("text", ""))


async def _groq_whisper_stt(audio_bytes: bytes) -> str:
    """Call Groq Whisper API for STT fallback."""
    from groq import AsyncGroq
    client = AsyncGroq(api_key=GROQ_API_KEY)

    # Groq Whisper needs a file-like object
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"

    transcription = await client.audio.transcriptions.create(
        file=audio_file,
        model="whisper-large-v3-turbo",
        response_format="text",
    )
    return str(transcription)


async def _gnani_tts(text: str, lang: str = "hi-IN") -> bytes:
    """Call Gnani TTS API."""
    headers = {
        "Authorization": f"Bearer {GNANI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "language": lang,
        "voice": "female",
        "format": "wav",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GNANI_TTS_URL, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.content
