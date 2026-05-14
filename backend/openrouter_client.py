"""
OpenRouter chat-completions client.

Request flow:
1. Build messages (system + optional history + latest user turn).
2. POST https://openrouter.ai/api/v1/chat/completions with JSON body { model, messages }.
3. Authorization: Bearer OPENROUTER_API_KEY (never hardcode; read from environment).
4. Parse choices[0].message.content as the assistant reply text.

Timeouts:
- httpx.Timeout caps total wait and connect time so hung upstream calls do not block workers indefinitely.

Errors:
- Missing API key -> ValueError before network.
- HTTP errors / malformed JSON -> raised to the route layer for consistent HTTP error responses or safe fallbacks.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"


def _resolve_model() -> str:
    """OPENROUTER_MODEL from env, falling back to the project default free model."""
    return (os.getenv("OPENROUTER_MODEL") or DEFAULT_MODEL).strip() or DEFAULT_MODEL


def _resolve_api_key() -> str:
    key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
    if not key:
        raise ValueError("OPENROUTER_API_KEY is not set")
    return key


def _optional_openrouter_headers() -> dict[str, str]:
    """
    OpenRouter recommends optional attribution headers for rankings and debugging.
    Set OPENROUTER_HTTP_REFERER (site URL) and/or OPENROUTER_APP_NAME if you want them sent.
    """
    extra: dict[str, str] = {}
    referer = (os.getenv("OPENROUTER_HTTP_REFERER") or "").strip()
    if referer:
        extra["HTTP-Referer"] = referer
    title = (os.getenv("OPENROUTER_APP_NAME") or "").strip()
    if title:
        extra["X-Title"] = title
    return extra


async def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    timeout_seconds: float = 90.0,
    connect_timeout_seconds: float = 15.0,
) -> str:
    """
    Call OpenRouter non-streaming chat completions and return assistant message text.

    messages: OpenAI-style roles: system | user | assistant with string content.
    """
    api_key = _resolve_api_key()
    resolved_model = (model or _resolve_model()).strip() or DEFAULT_MODEL

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **_optional_openrouter_headers(),
    }
    payload: dict[str, Any] = {"model": resolved_model, "messages": messages}

    timeout = httpx.Timeout(timeout_seconds, connect=connect_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(OPENROUTER_CHAT_URL, headers=headers, json=payload)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = response.text[:2000] if response.text else ""
            raise RuntimeError(
                f"OpenRouter HTTP {response.status_code}: {detail}"
            ) from exc

        data = response.json()

    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise RuntimeError("OpenRouter response missing choices[]")

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(message, dict):
        raise RuntimeError("OpenRouter choice missing message object")

    content = message.get("content")
    if content is None:
        raise RuntimeError("OpenRouter message missing content")

    if isinstance(content, str):
        return content.strip()

    # Some models may return structured content parts; normalize to plain text.
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                t = part.get("text")
                if isinstance(t, str):
                    parts.append(t)
        return "\n".join(p for p in parts if p).strip()

    return str(content).strip()
