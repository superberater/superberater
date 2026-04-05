"""Models API router: fetches available models from OpenRouter with caching."""

import time
from fastapi import APIRouter
import httpx
from config import get_settings

router = APIRouter()

_models_cache: dict = {"data": [], "fetched_at": 0}
CACHE_TTL = 3600  # 1 hour

# ── Curated model list with tiers ──
# tier: "budget" = fast+cheap, "standard" = good balance, "premium" = best quality
PREFERRED_MODELS = {
    # Budget – schnell, guenstig, gut fuer einfache Rollen
    "openai/gpt-5.4-nano":       {"tier": "budget"},
    "openai/gpt-4o-mini":        {"tier": "budget"},
    "google/gemini-2.5-flash":           {"tier": "budget"},
    "deepseek/deepseek-chat-v3-0324":  {"tier": "budget"},
    "anthropic/claude-haiku-4.5": {"tier": "budget"},
    # Standard – gute Qualitaet, moderate Kosten
    "openai/gpt-5.4-mini":       {"tier": "standard"},
    "openai/gpt-4o":             {"tier": "standard"},
    "anthropic/claude-sonnet-4":  {"tier": "standard"},
    "google/gemini-2.5-pro":             {"tier": "standard"},
    # Premium – beste Qualitaet, teuer
    "openai/gpt-5.4":            {"tier": "premium"},
    "anthropic/claude-sonnet-4.6":{"tier": "premium"},
    "anthropic/claude-opus-4.6":  {"tier": "premium"},
}

TIER_LABELS = {
    "free": "Free",
    "budget": "Budget",
    "standard": "Standard",
    "premium": "Premium",
}

# ── Free models (no API key cost, rate-limited) ──
# These models are available on OpenRouter at zero cost.
# Model IDs end with :free — rate limited (~20 req/min, ~200 req/day)
# Updated: April 2026 — verified via live API calls
# Removed: deepseek-r1:free (404), devstral-2:free (400), gemma-3:free,
#          openai/gpt-oss-120b:free (404 privacy policy), qwen3.6-plus-preview:free (404)
FREE_MODELS = {
    # Tier 1: Large, capable models (verified working)
    "qwen/qwen3-coder:free":                 {"label": "Qwen3 Coder 480B", "context": 262144},
    "stepfun/step-3.5-flash:free":            {"label": "StepFun Step 3.5 Flash", "context": 256000},
    "nvidia/nemotron-3-super-120b-a12b:free": {"label": "NVIDIA Nemotron 3 Super 120B", "context": 262144},
    "arcee-ai/trinity-large-preview:free":    {"label": "Arcee Trinity Large", "context": 131072},
    # Tier 2: Mid-size, reliable models
    "meta-llama/llama-3.3-70b-instruct:free": {"label": "Llama 3.3 70B", "context": 66000},
    "qwen/qwen3-next-80b-a3b-instruct:free":  {"label": "Qwen3 Next 80B", "context": 262144},
    "z-ai/glm-4.5-air:free":                  {"label": "GLM 4.5 Air", "context": 131072},
    "minimax/minimax-m2.5:free":              {"label": "MiniMax M2.5", "context": 197000},
    # Tier 3: Small/efficient models
    "openai/gpt-oss-20b:free":                {"label": "OpenAI GPT-OSS 20B", "context": 131072},
    "nvidia/nemotron-3-nano-30b-a3b:free":    {"label": "NVIDIA Nemotron 3 Nano 30B", "context": 256000},
}


async def _fetch_models_from_openrouter() -> list[dict]:
    settings = get_settings()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                timeout=10.0,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            return data.get("data", [])
    except Exception:
        return []


def _format_cost(pricing: dict) -> str:
    prompt = float(pricing.get("prompt", 0))
    completion = float(pricing.get("completion", 0))
    avg = (prompt + completion) / 2
    if avg == 0:
        return "free"
    per_m = avg * 1_000_000
    if per_m < 1:
        return f"${per_m:.2f}/1M"
    return f"${per_m:.1f}/1M"


@router.get("/models")
async def list_models(include_free: bool = False):
    """Return curated list of available models with pricing and tier info.
    
    In demo_mode, only free models are returned unless include_free=false explicitly.
    If include_free=true, free-tier models are prepended.
    """
    settings = get_settings()
    is_demo = settings.demo_mode

    # In demo mode: return ONLY free models (paid models need user's own key)
    if is_demo and not include_free:
        # Even without ?include_free, demo mode always shows free models
        return {"models": _get_free_models(), "cached": False, "demo_mode": True}

    now = time.time()

    if _models_cache["data"] and (now - _models_cache["fetched_at"]) < CACHE_TTL:
        if include_free:
            free_models = _get_free_models()
            return {"models": free_models + _models_cache["data"], "cached": True}
        return {"models": _models_cache["data"], "cached": True}

    raw_models = await _fetch_models_from_openrouter()

    if raw_models:
        models = []
        for m in raw_models:
            model_id = m.get("id", "")
            if model_id not in PREFERRED_MODELS:
                continue
            pricing = m.get("pricing", {})
            tier_info = PREFERRED_MODELS[model_id]
            models.append({
                "value": model_id,
                "label": m.get("name", model_id),
                "cost": _format_cost(pricing),
                "tier": tier_info["tier"],
                "tier_label": TIER_LABELS[tier_info["tier"]],
                "context_length": m.get("context_length", 0),
            })

        # Sort by tier order then cost
        tier_order = {"budget": 0, "standard": 1, "premium": 2}
        models.sort(key=lambda x: (tier_order.get(x["tier"], 1), x["cost"]))

        _models_cache["data"] = models
        _models_cache["fetched_at"] = now

        if include_free:
            free_models = _get_free_models()
            return {"models": free_models + models, "cached": False}
        return {"models": models, "cached": False}

    # Fallback
    fallback = [
        {"value": "openai/gpt-5.4-nano", "label": "GPT-5.4 Nano", "cost": "$0.20/1M", "tier": "budget", "tier_label": "Budget"},
        {"value": "anthropic/claude-haiku-4.5", "label": "Claude Haiku 4.5", "cost": "$1/1M", "tier": "budget", "tier_label": "Budget"},
        {"value": "openai/gpt-4o-mini", "label": "GPT-4o Mini", "cost": "$0.15/1M", "tier": "budget", "tier_label": "Budget"},
        {"value": "google/gemini-2.5-flash", "label": "Gemini 2.5 Flash", "cost": "$0.30/1M", "tier": "budget", "tier_label": "Budget"},
        {"value": "openai/gpt-5.4-mini", "label": "GPT-5.4 Mini", "cost": "$0.75/1M", "tier": "standard", "tier_label": "Standard"},
        {"value": "anthropic/claude-sonnet-4", "label": "Claude Sonnet 4", "cost": "$3/1M", "tier": "standard", "tier_label": "Standard"},
        {"value": "openai/gpt-5.4", "label": "GPT-5.4", "cost": "$1.25/1M", "tier": "premium", "tier_label": "Premium"},
        {"value": "anthropic/claude-sonnet-4.6", "label": "Claude Sonnet 4.6", "cost": "$3/1M", "tier": "premium", "tier_label": "Premium"},
        {"value": "anthropic/claude-opus-4.6", "label": "Claude Opus 4.6", "cost": "$15/1M", "tier": "premium", "tier_label": "Premium"},
    ]
    if include_free:
        free_models = _get_free_models()
        return {"models": free_models + fallback, "cached": False, "fallback": True}
    return {"models": fallback, "cached": False, "fallback": True}


def _get_free_models() -> list[dict]:
    """Return curated list of free models available on OpenRouter."""
    return [
        {
            "value": model_id,
            "label": info["label"],
            "cost": "free",
            "tier": "free",
            "tier_label": TIER_LABELS["free"],
            "context_length": info.get("context", 0),
        }
        for model_id, info in FREE_MODELS.items()
    ]


def get_free_model_ids() -> set[str]:
    """Return set of free model IDs for validation."""
    return set(FREE_MODELS.keys())


@router.post("/validate-key")
async def validate_key(body: dict):
    """Validate an OpenRouter API key by making a lightweight request.
    Returns {valid: true/false, error?: string}.
    Key is NOT stored — used only for this single validation request."""
    key = (body.get("key") or "").strip()
    if not key or len(key) < 10:
        return {"valid": False, "error": "Key too short"}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://openrouter.ai/api/v1/auth/key",
                headers={"Authorization": f"Bearer {key}"},
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                label = data.get("label", "")
                limit = data.get("limit", None)
                usage = data.get("usage", 0)
                return {"valid": True, "label": label, "limit": limit, "usage": usage}
            elif resp.status_code == 401:
                return {"valid": False, "error": "Invalid API key"}
            else:
                return {"valid": False, "error": f"OpenRouter returned {resp.status_code}"}
    except Exception as e:
        return {"valid": False, "error": f"Connection error: {str(e)}"}
