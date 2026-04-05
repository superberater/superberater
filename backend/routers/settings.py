"""Settings API router: per-user settings like OpenRouter API key."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

import models
from auth import require_auth
from config import get_settings

router = APIRouter()


class UserSettingsResponse(BaseModel):
    has_openrouter_key: bool = False
    openrouter_key_preview: str = ""  # "sk-or-...xxxx" (masked)
    has_global_key: bool = False


class UserSettingsUpdate(BaseModel):
    openrouter_api_key: str = Field(default="", max_length=200)


def _mask_key(key: str) -> str:
    """Show first 8 and last 4 chars of a key."""
    if not key or len(key) < 16:
        return ""
    return key[:8] + "..." + key[-4:]


@router.get("/settings")
async def get_settings_endpoint(user: dict = Depends(require_auth)):
    """Get current user settings (keys are masked)."""
    settings = get_settings()
    has_global = bool(settings.openrouter_api_key)

    user_key = ""
    try:
        user_settings = models.get_user_settings(user["id"])
        user_key = (user_settings or {}).get("openrouter_api_key", "")
    except Exception:
        pass  # user_settings table might not exist yet

    return UserSettingsResponse(
        has_openrouter_key=bool(user_key),
        openrouter_key_preview=_mask_key(user_key),
        has_global_key=has_global,
    )


@router.put("/settings")
async def update_settings_endpoint(data: UserSettingsUpdate, user: dict = Depends(require_auth)):
    """Update user settings. OpenRouter key is stored encrypted-at-rest in DB."""
    # Basic validation
    key = data.openrouter_api_key.strip()
    if key and not key.startswith("sk-or-"):
        raise HTTPException(status_code=400, detail="OpenRouter Key muss mit 'sk-or-' beginnen")

    models.upsert_user_settings(user["id"], {
        "openrouter_api_key": key,
    })

    return {
        "updated": True,
        "has_openrouter_key": bool(key),
        "openrouter_key_preview": _mask_key(key),
    }


@router.delete("/settings/openrouter-key")
async def delete_openrouter_key(user: dict = Depends(require_auth)):
    """Remove user's OpenRouter key."""
    models.upsert_user_settings(user["id"], {
        "openrouter_api_key": "",
    })
    return {"deleted": True}
