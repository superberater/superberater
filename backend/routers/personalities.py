"""Personalities API router."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

import models
from openrouter_client import OpenRouterClient
from config import get_settings
from auth import get_current_user, require_auth, get_user_id, get_user_id_optional

router = APIRouter()


class PersonalityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    icon: str = "🤖"
    description: str = Field(..., min_length=5)
    system_prompt: str = Field(..., min_length=50)
    default_model: str = "anthropic/claude-haiku-4.5"
    default_temperature: float = Field(default=0.7, ge=0.0, le=1.0)


class PersonalityGenerateRequest(BaseModel):
    domain: str = Field(..., min_length=3, max_length=100)
    trait: str = Field(..., min_length=3, max_length=100)


@router.get("/personalities")
async def list_personalities(user: dict = Depends(get_current_user)):
    """List all available personalities. No auth required (presets are public)."""
    user_id = get_user_id_optional(user)
    items = models.get_all_personalities(user_id)
    return {"personalities": items}


@router.post("/personalities", status_code=201)
async def create_personality(data: PersonalityCreate, user: dict = Depends(require_auth)):
    """Create a custom personality. Requires auth."""
    record = models.create_personality({
        "user_id": user["id"],
        "name": data.name,
        "icon": data.icon,
        "description": data.description,
        "system_prompt": data.system_prompt,
        "default_model": data.default_model,
        "default_temperature": float(data.default_temperature),
        "is_public": False,
    })
    return record


@router.post("/personalities/generate")
async def generate_personality(req: PersonalityGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate a personality via LLM."""
    # Resolve API key — use global .env key for generation
    settings = get_settings()
    api_key = settings.openrouter_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="No OpenRouter API key configured on server.")
    client = OpenRouterClient()

    prompt = (
        f"Generiere eine Debattier-Persönlichkeit für folgende Angaben:\n"
        f"Domäne: {req.domain}\n"
        f"Charakterzug: {req.trait}\n\n"
        f"Antworte NUR mit folgendem JSON (keine Erklärung, kein Markdown):\n"
        f'{{\n'
        f'  "name": "Der/Die ...",\n'
        f'  "icon": "<passendes Emoji>",\n'
        f'  "description": "<1 Satz: Kernperspektive>",\n'
        f'  "system_prompt": "<vollständiger System-Prompt, min. 200 Zeichen, '
        f'mit Platzhaltern für Debattenkontext>",\n'
        f'  "default_temperature": 0.7\n'
        f'}}'
    )

    try:
        result = await client.complete(
            model=settings.effective_moderator_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=500,
        )

        import json
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        personality = json.loads(text)

        return {
            "name": personality.get("name", "Neuer Agent"),
            "icon": personality.get("icon", "🤖"),
            "description": personality.get("description", ""),
            "system_prompt": personality.get("system_prompt", ""),
            "default_temperature": personality.get("default_temperature", 0.7),
            "generated": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    finally:
        await client.close()
