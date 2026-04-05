"""Debates API router: create, read, start, result, export, share, delete."""

import asyncio
import re
import json as json_module
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, UploadFile, File, Depends
from fastapi.responses import Response
from uuid import uuid4

import models
from pydantic import BaseModel, Field
from schemas import (
    DebateCreateRequest, DebateResponse, DebateResultResponse,
    AgentConfig, AgentInfo, StreamChunk, DebateStyle, ParallelMode, DecisionMode,
)
from orchestrator import DebateOrchestrator, DebateState, AgentMessage
from openrouter_client import OpenRouterClient
from config import get_settings
from auth import get_current_user, require_auth, get_user_id, get_user_id_optional

router = APIRouter()

active_debates: dict[str, DebateState] = {}
stream_queues: dict[str, dict[str, asyncio.Queue]] = {}

MODEL_COST_PER_M = {
    "anthropic/claude-opus-4.6": 15.0, "anthropic/claude-sonnet-4.6": 9.0,
    "anthropic/claude-sonnet-4": 9.0, "anthropic/claude-haiku-4.5": 3.0,
    "openai/gpt-5.4": 5.6, "openai/gpt-5.4-mini": 2.6, "openai/gpt-5.4-nano": 0.6,
    "openai/gpt-4o": 5.0, "openai/gpt-4o-mini": 0.3,
    "google/gemini-2.5-flash": 0.3, "google/gemini-2.5-pro": 3.0, "deepseek/deepseek-chat-v3-0324": 1.0,
}

# Default free moderator model for free-mode runs
FREE_MODERATOR_MODEL = "qwen/qwen3-coder:free"

def _estimate_cost_cents(model: str, tokens: int) -> int:
    rate = MODEL_COST_PER_M.get(model, 1.0)
    return max(1, int(tokens * rate / 1_000_000 * 100))

def _get_or_create_queue(debate_id: str, agent_id: str) -> asyncio.Queue:
    if debate_id not in stream_queues: stream_queues[debate_id] = {}
    if agent_id not in stream_queues[debate_id]: stream_queues[debate_id][agent_id] = asyncio.Queue()
    return stream_queues[debate_id][agent_id]

def get_all_queues(debate_id: str) -> dict[str, asyncio.Queue]:
    return stream_queues.get(debate_id, {})


def _repair_truncated_json(text: str) -> dict:
    """Try to repair truncated JSON from LLM output."""
    repaired = text.rstrip()
    # Remove trailing incomplete key-value pair (after last comma)
    pattern = re.compile(r',\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$')
    repaired = pattern.sub('', repaired)
    # Count and close open braces/brackets
    open_braces = repaired.count('{') - repaired.count('}')
    open_brackets = repaired.count('[') - repaired.count(']')
    repaired = repaired.rstrip(', \n\t')
    repaired += ']' * max(0, open_brackets)
    repaired += '}' * max(0, open_braces)
    return json_module.loads(repaired)


def _resolve_agent_info(da: dict) -> dict:
    """Get name/icon/system_prompt for a debate_agent, preferring custom fields over personality."""
    p = da.get("personalities") or {}
    return {
        "name": da.get("custom_name") or p.get("name", "Agent"),
        "icon": da.get("custom_icon") or p.get("icon", "?"),
        "system_prompt": da.get("custom_system_prompt") or p.get("system_prompt", "Du bist ein KI-Agent."),
    }


@router.post("/debates", status_code=201)
async def create_debate(request: DebateCreateRequest, user: dict = Depends(require_auth)):
    user_id = get_user_id(user)
    try:
        all_personalities = models.get_all_personalities()
        personality_map = {str(p["id"]): p for p in all_personalities}
        debate_record = models.create_debate({
            "user_id": user_id, "topic": request.topic, "context": request.context,
            "language": request.language, "num_rounds": request.num_rounds,
            "style": request.style.value, "parallel_mode": request.parallel_mode.value,
            "decision_mode": request.decision_mode.value, "moderator_model": request.moderator_model,
            "moderator_system_prompt": request.moderator_system_prompt,
            "active_moderator": request.active_moderator,
            "summary_length": getattr(request, 'summary_length', 'medium'),
        })
        debate_id = debate_record["id"]
        agent_infos = []
        for ac in request.agents:
            personality = personality_map.get(str(ac.personality_id)) if ac.personality_id else None
            is_custom = personality is None
            da_data = {
                "personality_id": str(ac.personality_id) if personality else None,
                "model": ac.model, "temperature": float(ac.temperature),
                "max_tokens": ac.max_tokens, "sort_order": ac.sort_order,
            }
            # Custom agents: store name/icon/system_prompt directly on debate_agents
            if is_custom:
                da_data["custom_name"] = ac.name or "Custom Agent"
                da_data["custom_icon"] = ac.icon or "\U0001f916"
                da_data["custom_system_prompt"] = ac.system_prompt or "Du bist ein KI-Agent."
            da_record = models.create_debate_agents(debate_id, [da_data])
            da_id = da_record[0]["id"] if da_record else str(uuid4())
            name = ac.name or (personality["name"] if personality else "Agent")
            icon = ac.icon or (personality["icon"] if personality else "?")
            agent_infos.append({"id": da_id, "name": name, "icon": icon, "model": ac.model})
        return {"id": debate_id, "status": "created", "topic": request.topic,
                "current_round": 0, "agents": agent_infos, "created_at": debate_record.get("created_at")}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=f"Failed to create debate: {str(e)}")


def _resolve_openrouter_key(user_id: str) -> str:
    """Get OpenRouter API key. Priority: user's personal key > global .env key.
    
    If the user stored their own key, use it (so their own OpenRouter account is billed).
    Otherwise fall back to the global key from .env (server-admin provided).
    """
    # 1. Try user's personal key from DB
    if user_id:
        try:
            user_settings = models.get_user_settings(user_id)
            user_key = (user_settings or {}).get("openrouter_api_key", "")
            if user_key:
                return user_key
        except Exception:
            pass  # user_settings table might not exist yet
    # 2. Fall back to global key from .env
    settings = get_settings()
    if settings.openrouter_api_key:
        return settings.openrouter_api_key
    return ""


class StartDebateRequest(BaseModel):
    session_api_key: str = Field(default="", max_length=200)
    free_mode: bool = False


@router.post("/debates/{debate_id}/start")
async def start_debate(
    debate_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    body: Optional[StartDebateRequest] = None,
):
    debate = models.get_debate(debate_id)
    if not debate: raise HTTPException(status_code=404, detail="Debate not found")
    if debate["user_id"] != user["id"]: raise HTTPException(status_code=403, detail="Not your debate")
    if debate["status"] == "running": raise HTTPException(status_code=409, detail="Already running")

    # Key resolution: session_api_key > global .env key
    session_key = (body.session_api_key.strip() if body and body.session_api_key else "")
    use_free_mode = body.free_mode if body else False

    if session_key:
        if not session_key.startswith("sk-or-"):
            raise HTTPException(status_code=400, detail="OpenRouter Key must start with 'sk-or-'")
        api_key = session_key  # One-time key, NOT stored
    else:
        # Fall back to global .env key (server-admin provided)
        settings = get_settings()
        api_key = settings.openrouter_api_key or ""

    if not api_key and not use_free_mode:
        raise HTTPException(
            status_code=400,
            detail="No OpenRouter API key configured. Please enter a key in Settings, provide a one-time key, or enable free-models-only mode."
        )

    # In free mode without any key, we still need an OpenRouter account key.
    # Free models require authentication but cost $0.
    # If truly no key at all, we cannot call OpenRouter — inform user.
    if use_free_mode and not api_key:
        raise HTTPException(
            status_code=400,
            detail="Free models still require an OpenRouter API key for authentication (no charges, no credit card needed). "
                   "Enter your key below or in Settings. "
                   "Get a free key at https://openrouter.ai/keys"
        )

    db_agents = models.get_debate_agents(debate_id)
    if len(db_agents) < 2: raise HTTPException(status_code=400, detail="Need at least 2 agents")

    # Validate free mode: all agent models must be :free models
    if use_free_mode:
        from routers.models import get_free_model_ids
        free_ids = get_free_model_ids()
        for da in db_agents:
            agent_model = da.get("model", "")
            if agent_model not in free_ids:
                info = _resolve_agent_info(da)
                raise HTTPException(
                    status_code=400,
                    detail=f"Free mode active but agent '{info['name']}' uses paid model '{agent_model}'. "
                           f"Please select a free model for all agents."
                )

    agent_configs = []
    for da in db_agents:
        info = _resolve_agent_info(da)
        agent_configs.append(AgentConfig(
            personality_id=da.get("personality_id"), name=info["name"], icon=info["icon"],
            system_prompt=info["system_prompt"],
            model=da.get("model", "anthropic/claude-haiku-4.5"),
            temperature=float(da.get("temperature", 0.7)), max_tokens=da.get("max_tokens", 300),
            sort_order=da.get("sort_order", 0),
        ))

    # Determine moderator model — override to free in free mode
    moderator_model = debate.get("moderator_model", "anthropic/claude-sonnet-4")
    if use_free_mode and not moderator_model.endswith(":free"):
        moderator_model = FREE_MODERATOR_MODEL

    request = DebateCreateRequest(
        topic=debate["topic"], context=debate.get("context", ""), language=debate.get("language", "de"),
        agents=agent_configs, num_rounds=debate.get("num_rounds", 2),
        style=DebateStyle(debate.get("style", "structured")),
        parallel_mode=ParallelMode(debate.get("parallel_mode", "parallel")),
        decision_mode=DecisionMode(debate.get("decision_mode", "best_solution")),
        moderator_model=moderator_model,
        moderator_system_prompt=debate.get("moderator_system_prompt", ""),
        active_moderator=debate.get("active_moderator", True),
        summary_length=debate.get("summary_length", "medium"),
    )
    # Create client — use session key if provided, otherwise global .env key
    settings = get_settings()
    if session_key:
        client = OpenRouterClient.with_api_key(session_key)
    elif api_key and api_key != settings.openrouter_api_key:
        client = OpenRouterClient.with_api_key(api_key)
    else:
        client = OpenRouterClient()
    orchestrator = DebateOrchestrator(client)
    state = orchestrator.create_debate(request)
    state.id = debate_id
    agent_id_map: dict[str, str] = {}
    for i, agent in enumerate(state.agents):
        if i < len(db_agents):
            agent_id_map[agent.id] = db_agents[i]["id"]
        _get_or_create_queue(debate_id, agent.id)
    _get_or_create_queue(debate_id, "moderator")
    active_debates[debate_id] = state
    models.update_debate(debate_id, {"status": "running"})
    background_tasks.add_task(_run_debate_background, debate_id, orchestrator, state, client, agent_id_map)
    return {"id": debate_id, "status": "running",
            "agents": [{"id": a.id, "name": a.config.name, "icon": a.config.icon, "model": a.config.model} for a in state.agents],
            "moderator_id": "moderator"}


async def _run_debate_background(debate_id, orchestrator, state, client, agent_id_map):
    saved_count = 0
    total_cost = 0

    def _save_new_messages():
        nonlocal saved_count, total_cost
        while saved_count < len(state.messages):
            msg = state.messages[saved_count]
            tokens = msg.tokens_prompt + msg.tokens_completion
            cost = _estimate_cost_cents(msg.model_used, tokens)
            total_cost += cost
            db_agent_id = agent_id_map.get(msg.agent_id)
            models.create_message({
                "debate_id": debate_id, "debate_agent_id": db_agent_id,
                "round_number": msg.round_number, "role": msg.role,
                "content": msg.content, "tokens_used": tokens,
                "cost_cents": cost, "model_used": msg.model_used,
            })
            saved_count += 1

    try:
        async def on_token(chunk):
            await _get_or_create_queue(debate_id, chunk.agent_id).put(chunk)
            if chunk.done and not chunk.error:
                _save_new_messages()

        await orchestrator.run_debate(state, on_token=on_token)
        _save_new_messages()
        mod = [m for m in state.messages if m.role == "moderator" and m.round_number == 99]
        models.update_debate(debate_id, {"status": "completed", "current_round": state.current_round,
            "moderator_summary": mod[-1].content if mod else None,
            "total_tokens": state.total_tokens, "total_cost_cents": total_cost, "completed_at": "now()"})
    except Exception as e:
        try:
            _save_new_messages()
        except Exception:
            pass
        models.update_debate(debate_id, {"status": "failed"})
        for aid, q in get_all_queues(debate_id).items():
            await q.put(StreamChunk(agent_id=aid, agent_name="System", agent_icon="!", round_number=0, done=True, error=str(e)))
    finally:
        await client.close()
        await asyncio.sleep(10)
        active_debates.pop(debate_id, None)
        stream_queues.pop(debate_id, None)


@router.get("/debates/{debate_id}")
async def get_debate(debate_id: str, user: dict = Depends(get_current_user)):
    debate = models.get_debate(debate_id)
    if not debate: raise HTTPException(status_code=404, detail="Not found")
    agents = models.get_debate_agents(debate_id)
    agent_infos = [{"id": da["id"], "name": _resolve_agent_info(da)["name"],
        "icon": _resolve_agent_info(da)["icon"], "model": da.get("model")} for da in agents]
    rt = [{"id": a.id, "name": a.config.name, "icon": a.config.icon, "model": a.config.model}
        for a in active_debates[debate_id].agents] if debate_id in active_debates else []
    return {"id": debate["id"], "status": debate["status"], "topic": debate["topic"],
        "context": debate.get("context", ""), "current_round": debate.get("current_round", 0),
        "num_rounds": debate.get("num_rounds", 2), "style": debate.get("style"),
        "parallel_mode": debate.get("parallel_mode"), "decision_mode": debate.get("decision_mode"),
        "agents": rt if rt else agent_infos, "created_at": debate.get("created_at"), "share_token": debate.get("share_token")}


@router.get("/debates/{debate_id}/result")
async def get_debate_result(debate_id: str):
    debate = models.get_debate(debate_id)
    if not debate: raise HTTPException(status_code=404, detail="Not found")
    messages = models.get_debate_messages(debate_id)
    agents = models.get_debate_agents(debate_id)
    amap = {da["id"]: _resolve_agent_info(da) for da in agents}
    msgs = [{"id": m["id"], "agent_name": amap.get(m.get("debate_agent_id"), {"name": "Moderator"})["name"],
        "agent_icon": amap.get(m.get("debate_agent_id"), {"icon": "?"})["icon"],
        "round_number": m["round_number"], "role": m["role"], "content": m["content"],
        "model_used": m.get("model_used", ""), "created_at": m.get("created_at")} for m in messages]
    return {"debate": {"id": debate["id"], "status": debate["status"], "topic": debate["topic"],
        "current_round": debate.get("current_round", 0), "created_at": debate.get("created_at")},
        "messages": msgs, "moderator_summary": debate.get("moderator_summary"),
        "total_tokens": debate.get("total_tokens", 0), "total_cost_cents": debate.get("total_cost_cents", 0),
        "share_token": debate.get("share_token")}


@router.get("/debates")
async def list_debates(user: dict = Depends(require_auth)):
    return {"debates": models.get_user_debates(user["id"])}


@router.delete("/debates/{debate_id}")
async def delete_debate_endpoint(debate_id: str, user: dict = Depends(require_auth)):
    debate = models.get_debate(debate_id)
    if not debate: raise HTTPException(status_code=404, detail="Not found")
    if debate["user_id"] != user["id"]: raise HTTPException(status_code=403, detail="Not your debate")
    if debate["status"] == "running": raise HTTPException(status_code=409, detail="Cannot delete while running")
    models.delete_debate(debate_id)
    return {"deleted": True, "id": debate_id}


@router.get("/debates/{debate_id}/export/pdf")
async def export_pdf(debate_id: str):
    from services.export import generate_pdf
    d, m, a = _load_export(debate_id)
    b = generate_pdf(topic=d["topic"], context=d.get("context",""), messages=m, moderator_summary=d.get("moderator_summary"),
        total_tokens=d.get("total_tokens",0), total_cost_cents=d.get("total_cost_cents",0), agents=a)
    return Response(content=b, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=superberater-{debate_id[:8]}.pdf"})

@router.get("/debates/{debate_id}/export/markdown")
async def export_markdown(debate_id: str):
    from services.export import generate_markdown
    d, m, a = _load_export(debate_id)
    t = generate_markdown(topic=d["topic"], context=d.get("context",""), messages=m, moderator_summary=d.get("moderator_summary"),
        total_tokens=d.get("total_tokens",0), total_cost_cents=d.get("total_cost_cents",0), agents=a)
    return Response(content=t.encode("utf-8"), media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename=superberater-{debate_id[:8]}.md"})

def _load_export(debate_id):
    debate = models.get_debate(debate_id)
    if not debate: raise HTTPException(status_code=404, detail="Not found")
    messages = models.get_debate_messages(debate_id)
    agents = models.get_debate_agents(debate_id)
    amap = {da["id"]: _resolve_agent_info(da) for da in agents}
    m = [{"agent_name": amap.get(x.get("debate_agent_id"),{"name":"Moderator"})["name"],
        "agent_icon": amap.get(x.get("debate_agent_id"),{"icon":"?"})["icon"],
        "round_number": x["round_number"], "content": x["content"], "model_used": x.get("model_used","")} for x in messages]
    return debate, m, agents

@router.get("/shared/{share_token}")
async def get_shared_debate(share_token: str):
    debate = models.get_debate_by_share_token(share_token)
    if not debate: raise HTTPException(status_code=404, detail="Not found")
    if debate["status"] != "completed": raise HTTPException(status_code=400, detail="Not completed")
    messages = models.get_debate_messages(debate["id"])
    agents = models.get_debate_agents(debate["id"])
    amap = {da["id"]: _resolve_agent_info(da) for da in agents}
    msgs = [{"id": m["id"], "agent_name": amap.get(m.get("debate_agent_id"),{"name":"Moderator"})["name"],
        "agent_icon": amap.get(m.get("debate_agent_id"),{"icon":"?"})["icon"],
        "round_number": m["round_number"], "role": m["role"], "content": m["content"],
        "model_used": m.get("model_used",""), "created_at": m.get("created_at")} for m in messages]
    return {"topic": debate["topic"], "context": debate.get("context",""), "messages": msgs,
        "moderator_summary": debate.get("moderator_summary"), "total_tokens": debate.get("total_tokens",0),
        "agents": [{"name": _resolve_agent_info(a)["name"],
            "icon": _resolve_agent_info(a)["icon"], "model": a.get("model","")} for a in agents]}

@router.post("/upload/extract")
async def upload_and_extract(file: UploadFile = File(...)):
    from services.file_parser import extract_text
    if not file.filename: raise HTTPException(status_code=400, detail="No filename")
    content = await file.read()
    if len(content) > 10*1024*1024: raise HTTPException(status_code=413, detail="Max 10MB")
    try:
        text = await extract_text(content, file.filename)
        if len(text) > 5000: text = text[:5000] + "\n\n[... gekuerzt]"
        return {"text": text, "filename": file.filename, "chars": len(text)}
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))


class SetupSuggestionRequest(BaseModel):
    topic: str = Field(..., min_length=20, max_length=500)
    context: str = Field(default="", max_length=5000)
    language: str = Field(default="de", max_length=5)
    session_api_key: str = Field(default="", max_length=200)


@router.post("/debates/suggest-setup")
async def suggest_setup(req: SetupSuggestionRequest, user: dict = Depends(get_current_user)):
    """AI-powered setup suggestion based on the debate topic."""
    from services.prompt_builder import build_setup_suggestion_prompt

    # Use session key if provided, otherwise global .env key
    settings = get_settings()
    api_key = req.session_api_key.strip() if req.session_api_key else settings.openrouter_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="No OpenRouter API key. Enter your key in Step 1 or configure OPENROUTER_API_KEY in .env.")
    client = OpenRouterClient.with_api_key(api_key) if req.session_api_key else OpenRouterClient()
    try:
        messages = build_setup_suggestion_prompt(req.topic, req.context, language=req.language)
        # If user provided their own key, use a better model for analysis
        suggest_model = settings.effective_moderator_model
        if req.session_api_key:
            suggest_model = settings.default_moderator_model  # use the non-overridden (paid) model
        result = await client.complete(
            model=suggest_model,
            messages=messages,
            temperature=0.7,
            max_tokens=1500,
        )
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        # Try direct parse first, fall back to repair
        try:
            suggestion = json_module.loads(text)
        except json_module.JSONDecodeError:
            suggestion = _repair_truncated_json(text)
        return {"suggestion": suggestion}
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "Too Many" in error_msg or "rate" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Rate limit reached. Please wait a moment and try again.")
        raise HTTPException(status_code=500, detail=f"Setup suggestion failed: {error_msg}")
    finally:
        await client.close()
