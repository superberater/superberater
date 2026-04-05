"""Async HTTP client for OpenRouter API with streaming support."""

import httpx
import json
import asyncio
import logging
from typing import AsyncGenerator, Optional
from dataclasses import dataclass, field
from config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class CompletionResult:
    """Result of a non-streaming completion."""
    content: str
    model: str
    tokens_prompt: int = 0
    tokens_completion: int = 0
    cost_cents: int = 0


@dataclass
class StreamToken:
    """A single token from a streaming completion."""
    token: str = ""
    done: bool = False
    error: Optional[str] = None
    model: str = ""
    tokens_prompt: int = 0
    tokens_completion: int = 0


class OpenRouterClient:
    """Async client for OpenRouter API."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._client: Optional[httpx.AsyncClient] = None
        self._api_key_override: Optional[str] = None

    @classmethod
    def with_api_key(cls, api_key: str) -> "OpenRouterClient":
        """Create a client with a specific API key (e.g. user's personal key)."""
        instance = cls()
        instance._api_key_override = api_key
        return instance

    @property
    def _effective_api_key(self) -> str:
        return self._api_key_override or self.settings.openrouter_api_key

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.settings.openrouter_base_url,
                headers={
                    "Authorization": f"Bearer {self._effective_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": self.settings.frontend_url,
                    "X-Title": "superberater",
                },
                timeout=httpx.Timeout(
                    connect=15.0,
                    read=180.0,
                    write=10.0,
                    pool=10.0,
                ),
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _build_payload(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 300,
        stream: bool = True,
    ) -> dict:
        return {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }

    async def stream_completion(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 300,
    ) -> AsyncGenerator[StreamToken, None]:
        """Stream a completion from OpenRouter, yielding tokens one by one."""
        client = await self._get_client()
        payload = self._build_payload(model, messages, temperature, max_tokens, stream=True)

        try:
            async with client.stream("POST", "/chat/completions", json=payload) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    body_text = body.decode()[:300]
                    # Parse specific error codes for actionable messages
                    if response.status_code == 401:
                        error_msg = f"API key invalid or expired (401). Check your OpenRouter key."
                    elif response.status_code == 402:
                        error_msg = f"Insufficient credits (402). Add credits at openrouter.ai or use :free models. Details: {body_text}"
                    elif response.status_code == 429:
                        error_msg = f"Rate limit exceeded (429) for {model}. Daily free limit may be reached. Details: {body_text}"
                    elif response.status_code == 403:
                        error_msg = f"Access denied (403) for {model}. Model may require credits. Details: {body_text}"
                    elif response.status_code >= 500:
                        error_msg = f"OpenRouter server error ({response.status_code}) for {model}. Try again later."
                    else:
                        error_msg = f"OpenRouter error {response.status_code} for {model}: {body_text}"
                    logger.error(f"[OpenRouter HTTP {response.status_code}] model={model} body={body_text}")
                    yield StreamToken(error=error_msg, done=True)
                    return

                last_model = model
                got_content = False

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue

                    data_str = line[6:].strip()

                    if data_str == "[DONE]":
                        # Don't return yet — yield done only if we haven't from finish_reason
                        break

                    try:
                        data = json.loads(data_str)

                        # OpenRouter error object in stream (Gemini often returns these)
                        if "error" in data:
                            err = data["error"]
                            err_msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                            logger.error(f"OpenRouter stream error for {model}: {err_msg}")
                            yield StreamToken(error=f"OpenRouter error: {err_msg}", done=True)
                            return

                        choices = data.get("choices", [])
                        if not choices:
                            # Some providers send usage-only chunks after finish
                            usage = data.get("usage", {})
                            if usage:
                                logger.debug(f"Usage chunk (no choices) for {model}: {usage}")
                            continue

                        delta = choices[0].get("delta", {})
                        content = delta.get("content")

                        if content:
                            got_content = True
                            last_model = data.get("model", model)
                            yield StreamToken(
                                token=content,
                                model=last_model,
                            )

                        # Check for finish reason
                        finish = choices[0].get("finish_reason")
                        if finish:
                            usage = data.get("usage", {})
                            last_model = data.get("model", model)
                            if not got_content:
                                logger.warning(
                                    f"Model {model} finished with finish_reason='{finish}' "
                                    f"but produced NO content. Usage: {usage}"
                                )
                            yield StreamToken(
                                done=True,
                                model=last_model,
                                tokens_prompt=usage.get("prompt_tokens", 0),
                                tokens_completion=usage.get("completion_tokens", 0),
                            )
                            return

                    except json.JSONDecodeError:
                        logger.debug(f"JSON decode error in stream for {model}: {data_str[:100]}")
                        continue

                # If we got here via [DONE] without a finish_reason chunk
                if not got_content:
                    logger.warning(f"Model {model} stream ended via [DONE] with NO content at all.")
                yield StreamToken(done=True, model=last_model)

        except httpx.TimeoutException:
            yield StreamToken(error="Request timed out", done=True)
        except httpx.ConnectError as e:
            yield StreamToken(error=f"Connection error: {e}", done=True)
        except Exception as e:
            yield StreamToken(error=f"Unexpected error: {e}", done=True)

    async def complete(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 300,
    ) -> CompletionResult:
        """Non-streaming completion (collects all tokens)."""
        full_content = ""
        final_model = model
        total_prompt = 0
        total_completion = 0

        async for token in self.stream_completion(model, messages, temperature, max_tokens):
            if token.error:
                raise RuntimeError(token.error)
            if token.token:
                full_content += token.token
            if token.model:
                final_model = token.model
            if token.done:
                total_prompt = token.tokens_prompt
                total_completion = token.tokens_completion

        return CompletionResult(
            content=full_content,
            model=final_model,
            tokens_prompt=total_prompt,
            tokens_completion=total_completion,
        )
