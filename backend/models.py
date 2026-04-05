"""Database access layer using Supabase Python client.

All DB operations go through this module. Uses service_role for
backend operations (bypasses RLS when needed).
"""

import secrets
from typing import Optional
from datetime import datetime, timezone

# Handle different supabase SDK versions
try:
    from supabase import create_client, Client
except ImportError:
    try:
        from supabase import create_client
    except ImportError:
        # Last resort: maybe installed as supabase-py
        from supabase.client import create_client  # type: ignore
    Client = None  # type: ignore

from config import get_settings


_client = None


def get_db():
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


# ══════════════════════════════════════════════════════════════
# PERSONALITIES
# ══════════════════════════════════════════════════════════════

def get_all_personalities(user_id: Optional[str] = None) -> list[dict]:
    db = get_db()
    query = db.table("personalities").select("*").or_("user_id.is.null,is_public.eq.true")
    result = query.execute()
    items = result.data or []
    if user_id:
        own = db.table("personalities").select("*").eq("user_id", user_id).execute()
        existing_ids = {i["id"] for i in items}
        for p in (own.data or []):
            if p["id"] not in existing_ids:
                items.append(p)
    return items


def create_personality(data: dict) -> dict:
    db = get_db()
    result = db.table("personalities").insert(data).execute()
    return result.data[0] if result.data else {}


# ══════════════════════════════════════════════════════════════
# DEBATES
# ══════════════════════════════════════════════════════════════

def create_debate(data: dict) -> dict:
    db = get_db()
    data["share_token"] = secrets.token_urlsafe(32)
    result = db.table("debates").insert(data).execute()
    return result.data[0] if result.data else {}


def get_debate(debate_id: str) -> Optional[dict]:
    db = get_db()
    result = db.table("debates").select("*").eq("id", debate_id).single().execute()
    return result.data


def get_debate_by_share_token(token: str) -> Optional[dict]:
    db = get_db()
    result = db.table("debates").select("*").eq("share_token", token).single().execute()
    return result.data


def update_debate(debate_id: str, data: dict) -> dict:
    db = get_db()
    if data.get("completed_at") == "now()":
        data["completed_at"] = datetime.now(timezone.utc).isoformat()
    result = db.table("debates").update(data).eq("id", debate_id).execute()
    return result.data[0] if result.data else {}


def delete_debate(debate_id: str) -> bool:
    """Delete a debate and all related data (messages, agents).
    
    Order matters due to foreign keys: messages -> debate_agents -> debates
    """
    db = get_db()
    # 1. Delete messages
    db.table("messages").delete().eq("debate_id", debate_id).execute()
    # 2. Delete debate agents
    db.table("debate_agents").delete().eq("debate_id", debate_id).execute()
    # 3. Delete debate itself
    db.table("debates").delete().eq("id", debate_id).execute()
    return True


def get_user_debates(user_id: str, limit: int = 50) -> list[dict]:
    db = get_db()
    result = (
        db.table("debates").select("*").eq("user_id", user_id)
        .order("created_at", desc=True).limit(limit).execute()
    )
    return result.data or []


def get_public_debates(limit: int = 50) -> list[dict]:
    db = get_db()
    result = (
        db.table("debates").select("*").eq("is_public", True)
        .eq("status", "completed").order("created_at", desc=True).limit(limit).execute()
    )
    return result.data or []


def set_debate_public(debate_id: str, is_public: bool) -> dict:
    db = get_db()
    result = db.table("debates").update({"is_public": is_public}).eq("id", debate_id).execute()
    return result.data[0] if result.data else {}


# ══════════════════════════════════════════════════════════════
# DEBATE AGENTS
# ══════════════════════════════════════════════════════════════

def create_debate_agents(debate_id: str, agents: list[dict]) -> list[dict]:
    db = get_db()
    records = []
    for a in agents:
        rec = {
            "debate_id": debate_id,
            "model": a.get("model", "anthropic/claude-haiku-4.5"),
            "temperature": a.get("temperature", 0.7),
            "max_tokens": a.get("max_tokens", 300),
            "sort_order": a.get("sort_order", 0),
        }
        # personality_id can be None for custom agents
        if a.get("personality_id"):
            rec["personality_id"] = a["personality_id"]
        # Custom agent fields
        if a.get("custom_name"):
            rec["custom_name"] = a["custom_name"]
        if a.get("custom_icon"):
            rec["custom_icon"] = a["custom_icon"]
        if a.get("custom_system_prompt"):
            rec["custom_system_prompt"] = a["custom_system_prompt"]
        records.append(rec)
    result = db.table("debate_agents").insert(records).execute()
    return result.data or []


def get_debate_agents(debate_id: str) -> list[dict]:
    db = get_db()
    result = (
        db.table("debate_agents").select("*, personalities(*)")
        .eq("debate_id", debate_id).order("sort_order").execute()
    )
    return result.data or []


def update_debate_agent_vote(agent_id: str, vote: str) -> dict:
    db = get_db()
    result = db.table("debate_agents").update({"vote": vote}).eq("id", agent_id).execute()
    return result.data[0] if result.data else {}


# ══════════════════════════════════════════════════════════════
# MESSAGES
# ══════════════════════════════════════════════════════════════

def create_message(data: dict) -> dict:
    db = get_db()
    result = db.table("messages").insert(data).execute()
    return result.data[0] if result.data else {}


def get_debate_messages(debate_id: str) -> list[dict]:
    db = get_db()
    result = (
        db.table("messages").select("*").eq("debate_id", debate_id)
        .order("round_number").order("created_at").execute()
    )
    return result.data or []


def bulk_create_messages(messages: list[dict]) -> list[dict]:
    if not messages:
        return []
    db = get_db()
    result = db.table("messages").insert(messages).execute()
    return result.data or []


# ════════════════════════════════════════════════════════════════
# USER SETTINGS
# ════════════════════════════════════════════════════════════════

def get_user_settings(user_id: str) -> Optional[dict]:
    db = get_db()
    try:
        result = db.table("user_settings").select("*").eq("user_id", user_id).single().execute()
        return result.data
    except Exception:
        return None


def upsert_user_settings(user_id: str, data: dict) -> dict:
    db = get_db()
    data["user_id"] = user_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = db.table("user_settings").upsert(data, on_conflict="user_id").execute()
    return result.data[0] if result.data else {}
