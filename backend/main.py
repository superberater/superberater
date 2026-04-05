"""superberater FastAPI Application."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import debates, personalities, streaming, models, community
from routers import settings as settings_router

# Configure logging so we see warnings from openrouter_client and orchestrator
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings = get_settings()
    print(f"🚀 superberater Backend starting...")
    print(f"   OpenRouter: {settings.openrouter_base_url}")
    print(f"   Supabase:   {settings.supabase_url}")
    print(f"   Frontend:   {settings.frontend_url}")
    print(f"   Demo mode:  {settings.demo_mode}")
    yield
    print("👋 superberater Backend shutting down.")


app = FastAPI(
    title="superberater",
    description="Multi-Agent Decision Engine API",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS
_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        _settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(debates.router, prefix="/api")
app.include_router(personalities.router, prefix="/api")
app.include_router(streaming.router, prefix="/api")
app.include_router(models.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "superberater-backend"}


@app.get("/api/config")
async def get_public_config():
    """Public config for frontend: demo_mode, has_global_key, default models.
    No secrets exposed — just flags the frontend needs."""
    settings = get_settings()
    return {
        "demo_mode": settings.demo_mode,
        "has_global_key": bool(settings.openrouter_api_key),
        "default_moderator_model": settings.effective_moderator_model,
        "default_agent_model": settings.effective_agent_model,
    }


@app.get("/api/diagnose")
async def diagnose_openrouter():
    """Diagnose OpenRouter connectivity: key validity, credits, free model test.
    Use this to debug 'Alle Modelle fehlgeschlagen' errors."""
    import httpx
    settings = get_settings()
    result = {
        "key_present": bool(settings.openrouter_api_key),
        "key_prefix": settings.openrouter_api_key[:12] + "..." if settings.openrouter_api_key else "(none)",
        "demo_mode": settings.demo_mode,
    }

    # Step 1: Check key validity
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://openrouter.ai/api/v1/auth/key",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                result["key_valid"] = True
                result["key_label"] = data.get("label", "")
                result["credit_limit"] = data.get("limit")
                result["credit_usage"] = data.get("usage", 0)
                result["rate_limit_remaining"] = data.get("rate_limit", {}).get("remaining") if isinstance(data.get("rate_limit"), dict) else None
            else:
                result["key_valid"] = False
                result["key_error"] = f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        result["key_valid"] = False
        result["key_error"] = f"Connection error: {str(e)}"

    # Step 2: Try a tiny completion with a free model
    test_model = "meta-llama/llama-3.3-70b-instruct:free"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": settings.frontend_url,
                    "X-Title": "superberater-diagnose",
                },
                json={
                    "model": test_model,
                    "messages": [{"role": "user", "content": "Say OK"}],
                    "max_tokens": 5,
                    "stream": False,
                },
            )
            result["free_model_test"] = {
                "model": test_model,
                "status_code": resp.status_code,
            }
            if resp.status_code == 200:
                body = resp.json()
                choices = body.get("choices", [])
                content = choices[0].get("message", {}).get("content", "") if choices else ""
                result["free_model_test"]["success"] = True
                result["free_model_test"]["response"] = content[:50]
                result["free_model_test"]["model_used"] = body.get("model", test_model)
            else:
                result["free_model_test"]["success"] = False
                result["free_model_test"]["error"] = resp.text[:300]
    except Exception as e:
        result["free_model_test"] = {"success": False, "error": str(e)}

    return result
