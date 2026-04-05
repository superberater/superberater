"""Pydantic schemas for CrewAI API contracts."""

from pydantic import BaseModel, Field
from enum import Enum
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional


class DebateStyle(str, Enum):
    structured = "structured"
    socratic = "socratic"
    confrontational = "confrontational"
    freeform = "freeform"

class ParallelMode(str, Enum):
    parallel = "parallel"
    sequential = "sequential"
    hybrid = "hybrid"

class DecisionMode(str, Enum):
    vote = "vote"
    consensus = "consensus"
    logic = "logic"
    best_solution = "best_solution"
    ranking = "ranking"

class DebateStatus(str, Enum):
    created = "created"
    running = "running"
    completed = "completed"
    failed = "failed"

class MessageRole(str, Enum):
    agent = "agent"
    moderator = "moderator"
    system = "system"

class AgentConfig(BaseModel):
    personality_id: Optional[UUID] = None
    name: str = "Agent"
    icon: str = "\U0001f916"
    system_prompt: str = ""
    model: str = "anthropic/claude-haiku-4.5"
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=300, ge=100, le=1000)
    sort_order: int = 0

class DebateCreateRequest(BaseModel):
    topic: str = Field(..., min_length=20, max_length=500)
    context: str = Field(default="", max_length=5000)
    language: str = "de"
    agents: list[AgentConfig] = Field(..., min_length=2, max_length=8)
    num_rounds: int = Field(default=2, ge=1, le=5)
    style: DebateStyle = DebateStyle.structured
    parallel_mode: ParallelMode = ParallelMode.parallel
    decision_mode: DecisionMode = DecisionMode.best_solution
    moderator_model: str = "anthropic/claude-sonnet-4"
    moderator_system_prompt: str = Field(default="", max_length=3000)
    active_moderator: bool = True
    summary_length: str = Field(default="medium")  # short, medium, long

class AgentInfo(BaseModel):
    id: str
    name: str
    icon: str
    model: str

class DebateResponse(BaseModel):
    id: str
    status: str
    topic: str
    current_round: int
    agents: list[AgentInfo]
    created_at: datetime

class MessageResponse(BaseModel):
    id: str
    agent_name: str
    agent_icon: str
    round_number: int
    role: str
    content: str
    model_used: str
    created_at: datetime

class DebateResultResponse(BaseModel):
    debate: DebateResponse
    messages: list[MessageResponse]
    moderator_summary: Optional[str] = None
    total_tokens: int
    total_cost_cents: int

class AgentInstance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    config: AgentConfig
    messages_history: list[dict] = Field(default_factory=list)

class DebateRound(BaseModel):
    round_number: int
    messages: list[dict] = Field(default_factory=list)
    completed: bool = False

class StreamChunk(BaseModel):
    """A single streaming chunk sent via SSE."""
    agent_id: str
    agent_name: str
    agent_icon: str
    round_number: int
    token: str = ""
    done: bool = False
    error: Optional[str] = None
    status: Optional[str] = None  # "thinking", "streaming", "round_start", "moderating"
