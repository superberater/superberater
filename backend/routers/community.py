"""Community API router: public debates and visibility toggles."""

from fastapi import APIRouter, HTTPException, Depends
import models
from auth import require_auth

router = APIRouter()


@router.get("/community/debates")
async def list_public_debates(limit: int = 50):
    """List all public completed debates. No auth required."""
    debates = models.get_public_debates(limit=limit)
    return {"debates": debates}


@router.post("/debates/{debate_id}/publish")
async def publish_debate(debate_id: str, user: dict = Depends(require_auth)):
    """Make a debate public so all users can see it. Requires auth + ownership."""
    debate = models.get_debate(debate_id)
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your debate")
    if debate["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed debates can be published")

    result = models.set_debate_public(debate_id, True)
    return {"id": debate_id, "is_public": True}


@router.post("/debates/{debate_id}/unpublish")
async def unpublish_debate(debate_id: str, user: dict = Depends(require_auth)):
    """Make a debate private again. Requires auth + ownership."""
    debate = models.get_debate(debate_id)
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your debate")

    result = models.set_debate_public(debate_id, False)
    return {"id": debate_id, "is_public": False}
