"""Debate Orchestrator: Manages debate rounds, active moderator, and parallel agent calls."""

import asyncio
import logging
from typing import Optional, Callable, Awaitable
from dataclasses import dataclass, field
from uuid import uuid4

logger = logging.getLogger(__name__)

from openrouter_client import OpenRouterClient, StreamToken
from schemas import (
    AgentConfig, AgentInstance, DebateCreateRequest, DebateStyle,
    ParallelMode, DecisionMode, StreamChunk, MessageRole,
)
from services.prompt_builder import (
    build_agent_system_prompt, build_agent_messages,
    build_moderator_base_system_prompt,
    build_moderator_opening_messages,
    build_moderator_interlude_messages,
    build_moderator_system_prompt, build_moderator_messages,
)
from config import get_settings


# ── Model Fallback Map ──
# When a model fails or returns empty, try these alternatives (same tier first, then up)
# Updated: April 2026 — removed dead models (deepseek-r1:free, devstral-2:free, gemma-3:free)
MODEL_FALLBACKS: dict[str, list[str]] = {
    # Free → try other free models (spread across different providers to avoid upstream rate limits)
    # Removed: openai/gpt-oss-120b:free (404 privacy), qwen/qwen3.6-plus-preview:free (404)
    # Primary fallback: arcee-ai/trinity-large-preview:free (verified working, no privacy restrictions)
    "qwen/qwen3-coder:free":                 ["arcee-ai/trinity-large-preview:free", "stepfun/step-3.5-flash:free", "meta-llama/llama-3.3-70b-instruct:free"],
    "meta-llama/llama-3.3-70b-instruct:free": ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "stepfun/step-3.5-flash:free"],
    "nvidia/nemotron-3-super-120b-a12b:free":  ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "stepfun/step-3.5-flash:free"],
    "qwen/qwen3-next-80b-a3b-instruct:free":  ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "stepfun/step-3.5-flash:free"],
    "stepfun/step-3.5-flash:free":            ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "meta-llama/llama-3.3-70b-instruct:free"],
    "arcee-ai/trinity-large-preview:free":    ["qwen/qwen3-coder:free", "stepfun/step-3.5-flash:free", "meta-llama/llama-3.3-70b-instruct:free"],
    "z-ai/glm-4.5-air:free":                  ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "stepfun/step-3.5-flash:free"],
    "minimax/minimax-m2.5:free":              ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "stepfun/step-3.5-flash:free"],
    "openai/gpt-oss-20b:free":                ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "stepfun/step-3.5-flash:free"],
    "nvidia/nemotron-3-nano-30b-a3b:free":    ["arcee-ai/trinity-large-preview:free", "qwen/qwen3-coder:free", "openai/gpt-oss-20b:free"],
    # Budget → try other budget, then standard
    "google/gemini-2.5-flash": ["openai/gpt-4o-mini", "anthropic/claude-haiku-4.5", "openai/gpt-5.4-nano"],
    "openai/gpt-4o-mini":             ["openai/gpt-5.4-nano", "anthropic/claude-haiku-4.5"],
    "openai/gpt-5.4-nano":            ["openai/gpt-4o-mini", "anthropic/claude-haiku-4.5"],
    "deepseek/deepseek-chat-v3-0324": ["openai/gpt-4o-mini", "anthropic/claude-haiku-4.5"],
    "anthropic/claude-haiku-4.5":     ["openai/gpt-4o-mini", "openai/gpt-5.4-nano"],
    # Standard → try other standard, then premium
    "openai/gpt-5.4-mini":            ["anthropic/claude-sonnet-4", "openai/gpt-5.4"],
    "anthropic/claude-sonnet-4":       ["openai/gpt-5.4-mini", "openai/gpt-5.4"],
    "google/gemini-2.5-pro":            ["anthropic/claude-sonnet-4", "openai/gpt-5.4-mini"],
    # Premium → try other premium
    "openai/gpt-5.4":                 ["anthropic/claude-sonnet-4.6"],
    "anthropic/claude-sonnet-4.6":     ["openai/gpt-5.4"],
    "anthropic/claude-opus-4.6":       ["anthropic/claude-sonnet-4.6", "openai/gpt-5.4"],
}


@dataclass
class AgentMessage:
    agent_id: str
    agent_name: str
    agent_icon: str
    round_number: int
    role: str
    content: str
    model_used: str
    tokens_prompt: int = 0
    tokens_completion: int = 0


@dataclass
class DebateState:
    id: str = field(default_factory=lambda: str(uuid4()))
    topic: str = ""
    context: str = ""
    language: str = "de"
    style: DebateStyle = DebateStyle.structured
    parallel_mode: ParallelMode = ParallelMode.parallel
    decision_mode: DecisionMode = DecisionMode.best_solution
    num_rounds: int = 2
    moderator_model: str = "anthropic/claude-sonnet-4"
    moderator_system_prompt: str = ""
    active_moderator: bool = True
    summary_length: str = "medium"  # short, medium, long
    agents: list[AgentInstance] = field(default_factory=list)
    messages: list[AgentMessage] = field(default_factory=list)
    current_round: int = 0
    status: str = "created"
    total_tokens: int = 0


StreamCallback = Callable[[StreamChunk], Awaitable[None]]

MOD_ICON = "\u2696\uFE0F"


class DebateOrchestrator:
    def __init__(self, client: Optional[OpenRouterClient] = None):
        self.client = client or OpenRouterClient()
        self.settings = get_settings()

    def create_debate(self, request: DebateCreateRequest) -> DebateState:
        agents = []
        for ac in request.agents:
            agents.append(AgentInstance(id=str(uuid4()), config=ac))
        return DebateState(
            topic=request.topic, context=request.context, language=request.language,
            style=request.style, parallel_mode=request.parallel_mode,
            decision_mode=request.decision_mode, num_rounds=request.num_rounds,
            moderator_model=request.moderator_model, agents=agents,
            moderator_system_prompt=getattr(request, 'moderator_system_prompt', ''),
            active_moderator=getattr(request, 'active_moderator', True),
            summary_length=getattr(request, 'summary_length', 'medium'),
        )

    async def run_debate(self, state: DebateState, on_token: Optional[StreamCallback] = None) -> DebateState:
        state.status = "running"
        # Free mode: force sequential to avoid rate-limit storms
        is_free_run = all(":free" in a.config.model.lower() for a in state.agents)
        if is_free_run:
            state.parallel_mode = ParallelMode.sequential
            logger.info("Free-mode detected: forcing sequential execution + inter-agent delay")
        try:
            # === OPENING: Moderator introduces the debate ===
            if state.active_moderator:
                if on_token:
                    await on_token(StreamChunk(
                        agent_id="moderator", agent_name="Moderator",
                        agent_icon=MOD_ICON, round_number=0,
                        status="moderating",
                    ))
                await self._run_moderator_opening(state, on_token)

            # === ROUNDS ===
            for round_num in range(1, state.num_rounds + 1):
                state.current_round = round_num

                if on_token:
                    for agent in state.agents:
                        await on_token(StreamChunk(
                            agent_id=agent.id, agent_name=agent.config.name,
                            agent_icon=agent.config.icon, round_number=round_num,
                            status="round_start",
                        ))

                if state.parallel_mode == ParallelMode.parallel:
                    await self._run_round_parallel(state, round_num, on_token)
                elif state.parallel_mode == ParallelMode.sequential:
                    await self._run_round_sequential(state, round_num, on_token)
                elif state.parallel_mode == ParallelMode.hybrid:
                    if round_num == 1:
                        await self._run_round_parallel(state, round_num, on_token)
                    else:
                        await self._run_round_sequential(state, round_num, on_token)

                # === INTERLUDE: Moderator feedback between rounds ===
                if state.active_moderator and round_num < state.num_rounds:
                    interlude_round = 50 + round_num
                    if on_token:
                        await on_token(StreamChunk(
                            agent_id="moderator", agent_name="Moderator",
                            agent_icon=MOD_ICON, round_number=interlude_round,
                            status="moderating",
                        ))
                    await self._run_moderator_interlude(state, round_num, on_token)

            # === FINAL SUMMARY ===
            if on_token:
                await on_token(StreamChunk(
                    agent_id="moderator", agent_name="Moderator",
                    agent_icon=MOD_ICON, round_number=99,
                    status="moderating",
                ))
            await self._run_moderator_final(state, on_token)
            state.status = "completed"
        except Exception:
            state.status = "failed"
            raise
        return state

    async def _run_round_parallel(self, state, round_number, on_token=None):
        history = self._build_history_dicts(state.messages)
        if on_token:
            for agent in state.agents:
                await on_token(StreamChunk(
                    agent_id=agent.id, agent_name=agent.config.name,
                    agent_icon=agent.config.icon, round_number=round_number,
                    status="thinking",
                ))
        tasks = [self._run_single_agent(state, agent, round_number, history, on_token) for agent in state.agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                agent = state.agents[i]
                state.messages.append(AgentMessage(
                    agent_id=agent.id, agent_name=agent.config.name,
                    agent_icon=agent.config.icon, round_number=round_number,
                    role="agent", content=f"[Fehler: {str(result)[:200]}]",
                    model_used=agent.config.model,
                ))

    async def _run_round_sequential(self, state, round_number, on_token=None):
        is_free = all(":free" in a.config.model.lower() for a in state.agents)
        for idx, agent in enumerate(state.agents):
            # Inter-agent delay for free models to avoid rate-limit cascades
            if is_free and idx > 0:
                delay = 2
                logger.debug(f"Free-mode inter-agent delay: {delay}s before {agent.config.name}")
                await asyncio.sleep(delay)
            history = self._build_history_dicts(state.messages)
            if on_token:
                await on_token(StreamChunk(
                    agent_id=agent.id, agent_name=agent.config.name,
                    agent_icon=agent.config.icon, round_number=round_number,
                    status="thinking",
                ))
            try:
                await self._run_single_agent(state, agent, round_number, history, on_token)
            except Exception as e:
                state.messages.append(AgentMessage(
                    agent_id=agent.id, agent_name=agent.config.name,
                    agent_icon=agent.config.icon, round_number=round_number,
                    role="agent", content=f"[Fehler: {str(e)[:200]}]",
                    model_used=agent.config.model,
                ))

    async def _run_single_agent(self, state, agent, round_number, history, on_token=None):
        system_prompt = build_agent_system_prompt(
            name=agent.config.name, base_prompt=agent.config.system_prompt,
            style=state.style, language=state.language,
            max_tokens=agent.config.max_tokens, topic=state.topic, context=state.context,
            model=agent.config.model,
        )
        messages = build_agent_messages(
            system_prompt=system_prompt, history=history,
            round_number=round_number, num_rounds=state.num_rounds,
            language=state.language,
        )
        # Use 2x buffer on max_tokens so the LLM can finish its thought
        # The prompt's word-limit instruction keeps output concise
        # 1.5x was still causing mid-sentence cutoffs, especially in German
        agent_token_limit = int(agent.config.max_tokens * 2.0)
        full_content, model_used, tokens_p, tokens_c = await self._stream_llm_with_fallback(
            model=agent.config.model, messages=messages,
            temperature=agent.config.temperature, max_tokens=agent_token_limit,
            agent_id=agent.id, agent_name=agent.config.name,
            agent_icon=agent.config.icon, round_number=round_number,
            on_token=on_token,
        )
        msg = AgentMessage(
            agent_id=agent.id, agent_name=agent.config.name,
            agent_icon=agent.config.icon, round_number=round_number,
            role="agent", content=full_content, model_used=model_used,
            tokens_prompt=tokens_p, tokens_completion=tokens_c,
        )
        state.messages.append(msg)
        state.total_tokens += tokens_p + tokens_c
        return msg

    async def _run_moderator_opening(self, state, on_token=None):
        system_prompt = build_moderator_base_system_prompt(
            language=state.language, custom_prompt=state.moderator_system_prompt,
        )
        agents_info = [
            {"name": a.config.name, "icon": a.config.icon,
             "description": a.config.system_prompt[:120]}
            for a in state.agents
        ]
        messages = build_moderator_opening_messages(
            system_prompt=system_prompt, topic=state.topic, context=state.context,
            agents=agents_info, style=state.style, num_rounds=state.num_rounds,
            decision_mode=state.decision_mode, language=state.language,
        )
        full_content, model_used, tp, tc = await self._stream_llm_with_fallback(
            model=state.moderator_model, messages=messages,
            temperature=0.6, max_tokens=800,  # 200 words target + 2x buffer
            agent_id="moderator", agent_name="Moderator",
            agent_icon=MOD_ICON, round_number=0,
            on_token=on_token,
        )
        msg = AgentMessage(
            agent_id="moderator", agent_name="Moderator",
            agent_icon=MOD_ICON, round_number=0,
            role="moderator", content=full_content, model_used=model_used,
            tokens_prompt=tp, tokens_completion=tc,
        )
        state.messages.append(msg)
        state.total_tokens += tp + tc

    async def _run_moderator_interlude(self, state, round_just_finished, on_token=None):
        interlude_round = 50 + round_just_finished
        system_prompt = build_moderator_base_system_prompt(
            language=state.language, custom_prompt=state.moderator_system_prompt,
        )
        history = self._build_history_dicts(state.messages)
        messages = build_moderator_interlude_messages(
            system_prompt=system_prompt, topic=state.topic, context=state.context,
            all_messages=history, round_just_finished=round_just_finished,
            num_rounds=state.num_rounds, decision_mode=state.decision_mode,
            language=state.language, num_agents=len(state.agents),
        )
        # Scale interlude tokens by agent count with 2x buffer
        # Word target: 150 + agents*40, Token target: words/0.7, then 2x buffer
        interlude_word_target = 150 + len(state.agents) * 40
        interlude_tokens = int(interlude_word_target / 0.7 * 2.0)
        full_content, model_used, tp, tc = await self._stream_llm_with_fallback(
            model=state.moderator_model, messages=messages,
            temperature=0.5, max_tokens=interlude_tokens,
            agent_id="moderator", agent_name="Moderator",
            agent_icon=MOD_ICON, round_number=interlude_round,
            on_token=on_token,
        )
        msg = AgentMessage(
            agent_id="moderator", agent_name="Moderator",
            agent_icon=MOD_ICON, round_number=interlude_round,
            role="moderator", content=full_content, model_used=model_used,
            tokens_prompt=tp, tokens_completion=tc,
        )
        state.messages.append(msg)
        state.total_tokens += tp + tc

    # Summary length → max_tokens mapping (2x buffer over desired word count)
    # short: ~200 words → ~286 tokens × 2 = 572 → round up to 600
    # medium: ~500 words → ~714 tokens × 2 = 1428 → round up to 1500
    # long: ~1200 words → ~1714 tokens × 2 = 3428 → round up to 3500
    SUMMARY_TOKENS = {"short": 600, "medium": 1500, "long": 3500}

    async def _run_moderator_final(self, state, on_token=None):
        summary_max = self.SUMMARY_TOKENS.get(state.summary_length, 1500)
        system_prompt = build_moderator_system_prompt(
            language=state.language, decision_mode=state.decision_mode,
            custom_prompt=state.moderator_system_prompt,
            summary_length=state.summary_length,
        )
        history = self._build_history_dicts(state.messages)
        messages = build_moderator_messages(
            system_prompt=system_prompt, topic=state.topic,
            context=state.context, all_messages=history,
            language=state.language,
        )
        full_content, model_used, tp, tc = await self._stream_llm_with_fallback(
            model=state.moderator_model, messages=messages,
            temperature=0.5, max_tokens=summary_max,
            agent_id="moderator", agent_name="Moderator",
            agent_icon=MOD_ICON, round_number=99,
            on_token=on_token,
        )
        msg = AgentMessage(
            agent_id="moderator", agent_name="Moderator",
            agent_icon=MOD_ICON, round_number=99,
            role="moderator", content=full_content, model_used=model_used,
            tokens_prompt=tp, tokens_completion=tc,
        )
        state.messages.append(msg)
        state.total_tokens += tp + tc

    # ── Fallback wrapper ──

    async def _stream_llm_with_fallback(
        self, model, messages, temperature, max_tokens,
        agent_id, agent_name, agent_icon, round_number,
        on_token=None,
    ) -> tuple[str, str, int, int]:
        """Try primary model, on failure/empty try fallback models from MODEL_FALLBACKS."""
        # First attempt: primary model with built-in retry (retry_count handled inside _stream_llm)
        last_error = ""
        try:
            content, model_used, tp, tc = await self._stream_llm(
                model=model, messages=messages,
                temperature=temperature, max_tokens=max_tokens,
                agent_id=agent_id, agent_name=agent_name,
                agent_icon=agent_icon, round_number=round_number,
                on_token=on_token,
            )
            # Check for real content (not just error markers)
            clean = content.strip()
            is_failed = (
                not clean
                or clean.startswith("[Keine Antwort")
                or clean.startswith("[Timeout]")
                or clean == "\n[Timeout]"
            )
            if not is_failed:
                return content, model_used, tp, tc

            # Primary model failed — try fallbacks
            last_error = clean
            logger.warning(f"Primary model {model} failed for {agent_name}: {clean[:100]}, trying fallbacks...")

            # If it's an auth or payment error, don't bother with fallbacks (same key = same problem)
            # But 429 "upstream" rate limits are per-model, so fallbacks to OTHER models/providers can work
            if any(code in clean for code in ["(401)", "(402)"]):
                logger.error(f"Skipping fallbacks — error is key/account-level: {clean[:150]}")
                return f"[{clean}]", model, 0, 0

        except Exception as e:
            last_error = str(e)
            logger.warning(f"Primary model {model} error for {agent_name}: {e}, trying fallbacks...")
            content = ""
            # Also skip fallbacks for key-level errors
            if any(code in str(e) for code in ["(401)", "(402)"]):
                logger.error(f"Skipping fallbacks — error is key/account-level: {e}")
                return f"[{str(e)[:200]}]", model, 0, 0

        # Fallback chain
        fallbacks = MODEL_FALLBACKS.get(model, [])
        if not fallbacks:
            # No fallbacks defined, return whatever we got
            if content.strip():
                return content, model, 0, 0
            return f"[Keine Antwort von {model} erhalten — kein Fallback verfuegbar]", model, 0, 0

        for fb_model in fallbacks:
            logger.info(f"Fallback: trying {fb_model} for {agent_name} (original: {model})")

            # Wait before fallback if the failure was a rate limit (429)
            if "429" in last_error or "rate" in last_error.lower():
                wait = 3 if ":free" in model else 1
                logger.info(f"Rate-limit backoff: waiting {wait}s before trying {fb_model}")
                await asyncio.sleep(wait)

            # Notify frontend about the fallback via a status event (not inline text)
            if on_token:
                await on_token(StreamChunk(
                    agent_id=agent_id, agent_name=agent_name,
                    agent_icon=agent_icon, round_number=round_number,
                    status="fallback",
                    token="",  # no inline text — frontend can show a subtle indicator
                ))

            try:
                fb_content, fb_model_used, fb_tp, fb_tc = await self._stream_llm(
                    model=fb_model, messages=messages,
                    temperature=temperature, max_tokens=max_tokens,
                    agent_id=agent_id, agent_name=agent_name,
                    agent_icon=agent_icon, round_number=round_number,
                    on_token=on_token,
                    _retry_count=1,  # Skip the built-in retry for fallback attempts
                )
                fb_clean = fb_content.strip()
                is_fb_failed = (
                    not fb_clean
                    or fb_clean.startswith("[Keine Antwort")
                    or fb_clean.startswith("[Timeout]")
                    or fb_clean == "\n[Timeout]"
                )
                if not is_fb_failed:
                    logger.info(f"Fallback {fb_model} succeeded for {agent_name}")
                    return fb_content, fb_model_used, fb_tp, fb_tc

            except Exception as fb_e:
                logger.warning(f"Fallback {fb_model} also failed for {agent_name}: {fb_e}")
                continue

        # All fallbacks exhausted
        logger.error(f"All models failed for {agent_name}: {model} + {fallbacks}. Last error: {last_error[:200]}")
        error_hint = ""
        if "429" in last_error or "rate" in last_error.lower():
            error_hint = " Ursache: Rate-Limit erreicht. Warte einige Minuten oder kaufe $10 Credits auf openrouter.ai fuer 1000 Requests/Tag."
        elif "402" in last_error:
            error_hint = " Ursache: Kein Guthaben. Lade Credits auf openrouter.ai auf."
        elif "401" in last_error:
            error_hint = " Ursache: API-Key ungueltig. Pruefe den Key in der .env-Datei."
        return f"[Alle Modelle fehlgeschlagen ({model} + Fallbacks).{error_hint} Bitte erneut versuchen.]", model, 0, 0

    # ── Core LLM streaming ──

    async def _stream_llm(
        self, model, messages, temperature, max_tokens,
        agent_id, agent_name, agent_icon, round_number,
        on_token=None, _retry_count=0,
    ) -> tuple[str, str, int, int]:
        full_content = ""
        model_used = model
        tokens_p = 0
        tokens_c = 0
        # Moderator gets longer timeout (large context window for final summary)
        is_moderator = agent_id == "moderator"
        is_free = ":free" in model.lower()
        base_timeout = self.settings.moderator_timeout_seconds if is_moderator else self.settings.agent_timeout_seconds
        # Budget models (Gemini etc.) and free models get extra timeout for cold starts
        timeout = base_timeout
        if "gemini" in model.lower() or "deepseek" in model.lower():
            timeout += 15
        if is_free:
            timeout += 30  # Free models can be very slow
        try:
            async with asyncio.timeout(timeout):
                async for token in self.client.stream_completion(
                    model=model, messages=messages,
                    temperature=temperature, max_tokens=max_tokens,
                ):
                    if token.error:
                        raise RuntimeError(token.error)
                    if token.token:
                        full_content += token.token
                        if on_token:
                            await on_token(StreamChunk(
                                agent_id=agent_id, agent_name=agent_name,
                                agent_icon=agent_icon, round_number=round_number,
                                token=token.token, status="streaming",
                            ))
                    if token.done:
                        model_used = token.model or model
                        tokens_p = token.tokens_prompt
                        tokens_c = token.tokens_completion
                        if on_token:
                            await on_token(StreamChunk(
                                agent_id=agent_id, agent_name=agent_name,
                                agent_icon=agent_icon, round_number=round_number,
                                done=True,
                            ))
        except asyncio.TimeoutError:
            full_content += "\n[Timeout]"
            logger.warning(f"Timeout for {agent_name} ({model}) after {timeout}s")
            if on_token:
                await on_token(StreamChunk(
                    agent_id=agent_id, agent_name=agent_name,
                    agent_icon=agent_icon, round_number=round_number,
                    done=True, error="Timeout",
                ))

        # Retry if model returned empty content (common with free and Gemini models)
        max_retries = 2 if ":free" in model.lower() else 1
        if not full_content.strip() and _retry_count < max_retries:
            wait_time = 2 if ":free" in model.lower() else 1
            logger.warning(f"Empty response from {model} for {agent_name}, retrying in {wait_time}s (attempt {_retry_count + 1}/{max_retries})...")
            await asyncio.sleep(wait_time)
            return await self._stream_llm(
                model=model, messages=messages, temperature=temperature,
                max_tokens=max_tokens, agent_id=agent_id, agent_name=agent_name,
                agent_icon=agent_icon, round_number=round_number,
                on_token=on_token, _retry_count=_retry_count + 1,
            )

        if not full_content.strip():
            logger.error(f"Model {model} returned empty content for {agent_name} after retries.")
            full_content = f"[Keine Antwort von {model} erhalten]"

        return full_content, model_used, tokens_p, tokens_c

    def _build_history_dicts(self, messages):
        return [{"agent_name": m.agent_name, "agent_icon": m.agent_icon,
                 "round_number": m.round_number, "content": m.content, "role": m.role}
                for m in messages]
