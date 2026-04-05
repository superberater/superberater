#!/usr/bin/env python3
"""
DebateAI Step 1 - CLI Test Script
Runs a debate with 2 agents + moderator, streaming to console.

Usage:
  export OPENROUTER_API_KEY=sk-or-v1-...
  python test_debate.py
"""

import asyncio
import sys
import os
import time

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import DebateCreateRequest, AgentConfig, StreamChunk, DebateStyle, ParallelMode, DecisionMode
from orchestrator import DebateOrchestrator
from openrouter_client import OpenRouterClient
from config import get_settings


# ── ANSI Colors ──
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"

AGENT_COLORS = [Colors.CYAN, Colors.YELLOW, Colors.GREEN, Colors.MAGENTA, Colors.BLUE, Colors.RED]


# ── Predefined Personalities ──

SKEPTIKER = AgentConfig(
    name="Der Skeptiker",
    icon="🔍",
    system_prompt=(
        "Du bist 'Der Skeptiker' in einer strukturierten Debatte.\n"
        "Deine Rolle: Hinterfrage JEDE Annahme. Suche nach Risiken, "
        "blinden Flecken und Worst-Case-Szenarien. Sei respektvoll aber unnachgiebig.\n"
        "- Beginne mit deinem stärksten Gegenargument\n"
        "- Benenne konkrete Risiken (hoch/mittel/gering)\n"
        "- Frage: 'Was könnte schiefgehen?'"
    ),
    model="anthropic/claude-haiku-3.5",
    temperature=0.6,
    max_tokens=300,
    sort_order=0,
)

PRAGMATIKER = AgentConfig(
    name="Der Pragmatiker",
    icon="⚙️",
    system_prompt=(
        "Du bist 'Der Pragmatiker' in einer strukturierten Debatte.\n"
        "Deine Rolle: Fokussiere auf Umsetzbarkeit, Ressourcen und Quick Wins. "
        "Du bist nicht an Theorie interessiert, sondern an dem, was morgen funktioniert.\n"
        "- Beginne mit dem wichtigsten Quick Win\n"
        "- Benenne nötige Ressourcen (Zeit, Geld, Personal)\n"
        "- Schlage einen konkreten ersten Schritt vor"
    ),
    model="openai/gpt-4o-mini",
    temperature=0.7,
    max_tokens=300,
    sort_order=1,
)

INNOVATOR = AgentConfig(
    name="Der Innovator",
    icon="💡",
    system_prompt=(
        "Du bist 'Der Innovator' in einer strukturierten Debatte.\n"
        "Deine Rolle: Denke radikal anders. Suche nach disruptiven Ansätzen "
        "und unkonventionellen Lösungen. Inspiriere durch neue Perspektiven.\n"
        "- Beginne mit einer überraschenden Idee\n"
        "- Referenziere Beispiele aus anderen Branchen\n"
        "- Provoziere konstruktiv: 'Was wenn wir das Gegenteil tun?'"
    ),
    model="anthropic/claude-haiku-3.5",
    temperature=0.9,
    max_tokens=300,
    sort_order=2,
)


# ── Streaming Callback ──

current_agent = {"id": None}

async def console_stream_callback(chunk: StreamChunk):
    """Print streaming tokens to console with colors."""
    agent_idx = hash(chunk.agent_id) % len(AGENT_COLORS)
    color = AGENT_COLORS[agent_idx]

    if chunk.agent_id != current_agent["id"]:
        current_agent["id"] = chunk.agent_id
        round_label = "Fazit" if chunk.round_number == 99 else f"Runde {chunk.round_number}"
        print(f"\n{color}{Colors.BOLD}{chunk.agent_icon} {chunk.agent_name} ({round_label}):{Colors.RESET}")

    if chunk.token:
        print(f"{color}{chunk.token}{Colors.RESET}", end="", flush=True)

    if chunk.done:
        if chunk.error:
            print(f"\n{Colors.RED}  ⚠ {chunk.error}{Colors.RESET}")
        else:
            print()  # newline


# ── Main ──

async def main():
    settings = get_settings()

    # Check API key
    if not settings.openrouter_api_key:
        print(f"{Colors.RED}✗ OPENROUTER_API_KEY nicht gesetzt!{Colors.RESET}")
        print(f"  export OPENROUTER_API_KEY=sk-or-v1-...")
        sys.exit(1)

    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}  DebateAI – CLI Test (Step 1){Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")

    # ── Choose topic ──
    topic = "Soll ein mittelständisches Unternehmen mit 200 Mitarbeitern seine monolithische ERP-Lösung auf eine Microservices-Architektur umstellen?"

    print(f"\n{Colors.DIM}Thema:{Colors.RESET} {topic}")
    print(f"{Colors.DIM}Agenten:{Colors.RESET} {SKEPTIKER.icon} {SKEPTIKER.name} ({SKEPTIKER.model})")
    print(f"         {PRAGMATIKER.icon} {PRAGMATIKER.name} ({PRAGMATIKER.model})")
    print(f"{Colors.DIM}Runden:{Colors.RESET} 1")
    print(f"{Colors.DIM}Modus:{Colors.RESET} Parallel")
    print(f"{Colors.DIM}Moderator:{Colors.RESET} {settings.default_moderator_model}")

    # ── Create debate ──
    request = DebateCreateRequest(
        topic=topic,
        context="Das Unternehmen ist in der Automobilindustrie, hat eine SAP-Landschaft und begrenzte DevOps-Erfahrung.",
        language="de",
        agents=[SKEPTIKER, PRAGMATIKER],
        num_rounds=1,
        style=DebateStyle.structured,
        parallel_mode=ParallelMode.parallel,
        decision_mode=DecisionMode.best_solution,
        moderator_model=settings.default_moderator_model,
    )

    client = OpenRouterClient(settings)
    orchestrator = DebateOrchestrator(client)

    state = orchestrator.create_debate(request)

    print(f"\n{Colors.DIM}Debate ID: {state.id}{Colors.RESET}")
    print(f"\n{Colors.GREEN}{Colors.BOLD}▶ Debate startet...{Colors.RESET}")

    start_time = time.time()

    # ── Run debate ──
    try:
        state = await orchestrator.run_debate(state, on_token=console_stream_callback)
    except Exception as e:
        print(f"\n{Colors.RED}✗ Fehler: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await client.close()

    elapsed = time.time() - start_time

    # ── Summary ──
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.GREEN}{Colors.BOLD}✓ Debate abgeschlossen!{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"  Status:     {state.status}")
    print(f"  Runden:     {state.current_round}")
    print(f"  Messages:   {len(state.messages)}")
    print(f"  Tokens:     ~{state.total_tokens}")
    print(f"  Dauer:      {elapsed:.1f}s")

    # Rough cost estimate
    est_cost = state.total_tokens * 0.000002  # rough average
    print(f"  Kosten:     ~${est_cost:.4f}")

    print(f"\n{Colors.DIM}Alle {len(state.messages)} Messages:{Colors.RESET}")
    for msg in state.messages:
        rnd = "Fazit" if msg.round_number == 99 else f"R{msg.round_number}"
        preview = msg.content[:80].replace("\n", " ") + "..."
        print(f"  [{rnd}] {msg.agent_icon} {msg.agent_name}: {preview}")


if __name__ == "__main__":
    asyncio.run(main())
