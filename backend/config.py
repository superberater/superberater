"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    backend_url: str = "http://localhost:9000"
    frontend_url: str = "http://localhost:3000"

    default_moderator_model: str = "anthropic/claude-sonnet-4.6"
    default_agent_model: str = "anthropic/claude-haiku-4.5"

    agent_timeout_seconds: int = 60
    moderator_timeout_seconds: int = 120
    max_retries: int = 3

    # Demo mode: only free models by default, users must provide own key for paid models
    demo_mode: bool = False

    @property
    def effective_moderator_model(self) -> str:
        """In demo mode, force free model if default is a paid model."""
        if self.demo_mode and ":free" not in self.default_moderator_model:
            return "arcee-ai/trinity-large-preview:free"
        return self.default_moderator_model

    @property
    def effective_agent_model(self) -> str:
        """In demo mode, force free model if default is a paid model."""
        if self.demo_mode and ":free" not in self.default_agent_model:
            return "arcee-ai/trinity-large-preview:free"
        return self.default_agent_model

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
