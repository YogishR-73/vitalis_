"""
VITALIS AI — FastAPI Backend
Advanced Healthcare Intelligence System

AI integration:
- Triage uses OpenRouter's OpenAI-compatible POST /api/v1/chat/completions.
- Secrets: OPENROUTER_API_KEY and OPENROUTER_MODEL are loaded from the environment (see .env.example).
- Conversation memory: optional session_id groups prior user/assistant turns before each new request.
"""

from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from openrouter_client import DEFAULT_MODEL, chat_completion

load_dotenv()

OPENROUTER_API_KEY = (os.getenv("OPENROUTER_API_KEY") or "").strip()
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(title="VITALIS AI CORE")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# session_id -> list of {role, content} messages (user/assistant only; system is injected per request)
sessions: dict[str, list[dict[str, str]]] = {}

MAX_HISTORY_TURNS = 12  # pairs of user+assistant capped loosely by message count


class MessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_triage_json(raw: str) -> dict[str, Any]:
    """
    Models return JSON triage payloads; tolerate markdown fences and minor formatting drift.
    On failure, degrade gracefully so the API still returns the shape the frontend expects.
    """
    cleaned = _strip_code_fences(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "ai_message": raw.strip(),
            "follow_up_question": "Can you describe the onset and severity of these symptoms?",
        }

    if not isinstance(data, dict):
        return {
            "ai_message": raw.strip(),
            "follow_up_question": "Can you add any related symptoms or medications?",
        }

    ai_message = data.get("ai_message")
    follow = data.get("follow_up_question")
    if not isinstance(ai_message, str) or not ai_message.strip():
        return {
            "ai_message": raw.strip(),
            "follow_up_question": "Can you share more detail about what you are experiencing?",
        }
    if not isinstance(follow, str) or not follow.strip():
        follow = "What other symptoms have you noticed recently?"
    return {"ai_message": ai_message.strip(), "follow_up_question": follow.strip()}


def _build_system_prompt() -> str:
    return """You are VITALIS CORE, a futuristic healthcare AI assistant.
You receive patient messages. Respond professionally, empathetically, with a concise sci-fi medical OS tone.
Always answer with a single JSON object (no surrounding prose) using exactly these keys:
{"ai_message": string, "follow_up_question": string}
The ai_message is your main reply. follow_up_question is one short follow-up question for the patient."""


@app.post("/api/triage")
async def triage(request: MessageRequest):
    """
    OpenRouter-backed triage: forwards conversation context, expects JSON-shaped assistant content,
    returns { session_id, ai_message, follow_up_question, timestamp } for the Next.js client.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY is not configured")

    sid = request.session_id or str(uuid.uuid4())
    if sid not in sessions:
        sessions[sid] = []

    history = sessions[sid][-MAX_HISTORY_TURNS:]

    user_turn = request.message.strip()
    if not user_turn:
        raise HTTPException(status_code=400, detail="message is required")

    messages: list[dict[str, str]] = [{"role": "system", "content": _build_system_prompt()}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_turn})

    try:
        raw = await chat_completion(messages)
        parsed = _parse_triage_json(raw)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="OpenRouter request failed") from exc

    # Persist this exchange for the next call with the same session_id
    sessions[sid].append({"role": "user", "content": user_turn})
    sessions[sid].append(
        {
            "role": "assistant",
            "content": json.dumps(
                {
                    "ai_message": parsed["ai_message"],
                    "follow_up_question": parsed["follow_up_question"],
                }
            ),
        }
    )

    return {
        "session_id": sid,
        "ai_message": parsed["ai_message"],
        "follow_up_question": parsed["follow_up_question"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "system": "VITALIS_CORE_ACTIVE",
        "ai": "openrouter",
        "default_model": DEFAULT_MODEL,
    }
