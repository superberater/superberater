"""Supabase Auth middleware: JWT verification for protected routes."""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import httpx
from functools import lru_cache

from config import get_settings

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Extract and verify user from Supabase JWT token.
    
    Returns user dict with at least 'id' and 'email', or None if no auth.
    """
    if not credentials:
        return None

    token = credentials.credentials
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_anon_key:
        return None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_anon_key,
                },
                timeout=5.0,
            )

        if resp.status_code != 200:
            return None

        user_data = resp.json()
        return {
            "id": user_data.get("id"),
            "email": user_data.get("email"),
            "role": user_data.get("role", "authenticated"),
        }
    except Exception:
        return None


async def require_auth(
    user: Optional[dict] = Depends(get_current_user),
) -> dict:
    """Dependency that REQUIRES authentication. Raises 401 if no valid token."""
    if not user or not user.get("id"):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_user_id(user: Optional[dict]) -> str:
    """Get user ID from auth. Raises if not authenticated."""
    if user and user.get("id"):
        return user["id"]
    raise HTTPException(
        status_code=401,
        detail="Authentication required to create resources.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_user_id_optional(user: Optional[dict]) -> Optional[str]:
    """Get user ID if authenticated, None otherwise. For read-only endpoints."""
    if user and user.get("id"):
        return user["id"]
    return None
