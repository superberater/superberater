"""Prompt builder: constructs system prompts and conversation history for agents and moderator.

All prompt text is bilingual (DE/EN) based on the `language` parameter.
"""

from schemas import DebateStyle, DecisionMode


# ════════════════════════════════════════════════════════════════
# BILINGUAL TEXT HELPERS
# ════════════════════════════════════════════════════════════════

def _l(language: str, de: str, en: str) -> str:
    """Pick German or English text based on language code."""
    return en if language == "en" else de


# ════════════════════════════════════════════════════════════════
# STYLE & DECISION MODE INSTRUCTIONS (bilingual)
# ════════════════════════════════════════════════════════════════

def _style_instructions(style: DebateStyle, language: str) -> str:
    m = {
        DebateStyle.structured: _l(language,
            "FORMAT deines Beitrags:\n1. HAUPTARGUMENT: Dein staerkstes Argument in 2-3 Saetzen\n2. GEGENARGUMENT: Ein moegliches Gegenargument und deine Antwort darauf\n3. LOESUNGSVORSCHLAG: Ein konkreter, umsetzbarer Vorschlag",
            "FORMAT of your contribution:\n1. MAIN ARGUMENT: Your strongest argument in 2-3 sentences\n2. COUNTERARGUMENT: A possible counterargument and your response\n3. PROPOSED SOLUTION: A concrete, actionable proposal"),
        DebateStyle.socratic: _l(language,
            "STIL: Sokratisch - Stelle den anderen Agenten Fragen. Fordere Begruendungen. Hinterfrage Annahmen durch gezielte Rueckfragen.",
            "STYLE: Socratic - Ask other agents questions. Demand justifications. Challenge assumptions through targeted follow-up questions."),
        DebateStyle.confrontational: _l(language,
            "STIL: Konfrontativ - Direkte Kritik ist erlaubt und erwuenscht. Benenne Schwaechen klar und deutlich. Sei respektvoll aber unnachgiebig.",
            "STYLE: Confrontational - Direct criticism is allowed and encouraged. Name weaknesses clearly. Be respectful but relentless."),
        DebateStyle.freeform: _l(language,
            "STIL: Freeform - Keine formalen Vorgaben. Antworte so, wie es deiner Persoenlichkeit entspricht.",
            "STYLE: Freeform - No formal constraints. Respond as fits your personality."),
    }
    return m.get(style, "")


def _style_short(style: DebateStyle, language: str) -> str:
    """Compact style label for budget models."""
    m = {
        DebateStyle.structured: _l(language, "Strukturiert: Argument + Gegenargument + Loesung.", "Structured: Argument + Counter + Solution."),
        DebateStyle.socratic: _l(language, "Sokratisch: Stelle Fragen statt Behauptungen.", "Socratic: Ask questions instead of making claims."),
        DebateStyle.confrontational: _l(language, "Konfrontativ: Direkte Kritik erlaubt.", "Confrontational: Direct criticism allowed."),
        DebateStyle.freeform: _l(language, "Freeform: Antworte frei.", "Freeform: Respond freely."),
    }
    return m.get(style, "")


def _decision_instruction(mode: DecisionMode, language: str) -> str:
    m = {
        DecisionMode.vote: _l(language, "Lasse jeden Agenten abstimmen. Mehrheit gewinnt.", "Have each agent vote. Majority wins."),
        DecisionMode.consensus: _l(language, "Suche den groessten gemeinsamen Nenner aller Positionen.", "Find the greatest common ground across all positions."),
        DecisionMode.logic: _l(language, "Bewerte die Argumentationsqualitaet objektiv. Staerkstes Argument gewinnt.", "Evaluate argument quality objectively. Strongest argument wins."),
        DecisionMode.best_solution: _l(language, "Fokussiere auf konstruktive Loesungsvorschlaege statt auf Positionen.", "Focus on constructive solution proposals rather than positions."),
        DecisionMode.ranking: _l(language, "Ranke alle vorgeschlagenen Optionen nach Qualitaet.", "Rank all proposed options by quality."),
    }
    return m.get(mode, "")


def _style_label(style: DebateStyle, language: str) -> str:
    m = {
        DebateStyle.structured: _l(language, "Strukturiert (Argument + Gegenargument + Loesung)", "Structured (Argument + Counter + Solution)"),
        DebateStyle.socratic: _l(language, "Sokratisch (Fragen statt Behauptungen)", "Socratic (Questions instead of claims)"),
        DebateStyle.confrontational: _l(language, "Konfrontativ (Direkte Kritik erlaubt)", "Confrontational (Direct criticism allowed)"),
        DebateStyle.freeform: _l(language, "Freeform (Keine Vorgaben)", "Freeform (No constraints)"),
    }
    return m.get(style, str(style))


# ════════════════════════════════════════════════════════════════
# AGENT PROMPTS
# ════════════════════════════════════════════════════════════════

BUDGET_MODELS = {
    "google/gemini-2.5-flash", "openai/gpt-4o-mini",
    "openai/gpt-5.4-nano", "deepseek/deepseek-chat-v3-0324",
}


def _compact_system_prompt(base_prompt: str) -> str:
    sentences = base_prompt.replace('\n', ' ').split('.')
    short = '. '.join(s.strip() for s in sentences[:2] if s.strip())
    if short and not short.endswith('.'):
        short += '.'
    if len(short) > 200:
        short = short[:200].rsplit(' ', 1)[0] + '...'
    return short or base_prompt[:200]


def _tokens_to_words(max_tokens: int) -> int:
    return int(max_tokens * 0.7)


def _word_limit_instruction(max_tokens: int, language: str) -> str:
    words = _tokens_to_words(max_tokens)
    w = _l(language, "Woerter", "words")
    if words <= 150:
        return _l(language,
            f"LAENGE: Maximal {words} {w}. Sei extrem knapp und praezise. Kein Fliesstext.",
            f"LENGTH: Maximum {words} {w}. Be extremely concise and precise. No filler.")
    elif words <= 250:
        return _l(language,
            f"LAENGE: Maximal {words} {w}. Fasse dich kurz. Jeder Satz muss Substanz haben.",
            f"LENGTH: Maximum {words} {w}. Keep it short. Every sentence must have substance.")
    elif words <= 400:
        return _l(language,
            f"LAENGE: Ca. {words} {w}. Ausfuehrlich aber fokussiert. Kein Abschweifen.",
            f"LENGTH: Approx. {words} {w}. Detailed but focused. No digressions.")
    else:
        return _l(language,
            f"LAENGE: Ca. {words} {w}. Ausfuehrliche Analyse erlaubt. Bleib beim Thema.",
            f"LENGTH: Approx. {words} {w}. Detailed analysis allowed. Stay on topic.")


def build_agent_system_prompt(
    name: str, base_prompt: str, style: DebateStyle, language: str,
    max_tokens: int, topic: str, context: str, model: str = "",
) -> str:
    is_budget = model in BUDGET_MODELS
    word_limit = _word_limit_instruction(max_tokens, language)

    if is_budget:
        compact_role = _compact_system_prompt(base_prompt)
        words = _tokens_to_words(max_tokens)
        w = _l(language, "Woerter", "words")
        ctx_short = context[:150] + "..." if context and len(context) > 150 else (context or "")
        return (
            f"{compact_role} "
            f"{_l(language, 'Stil', 'Style')}: {_style_short(style, language)} "
            f"{_l(language, 'Sprache', 'Language')}: {language}. Max {words} {w}. "
            f"{_l(language, 'Thema', 'Topic')}: {topic}" +
            (f" {_l(language, 'Kontext', 'Context')}: {ctx_short}" if ctx_short else "")
        )

    style_block = _style_instructions(style, language)
    no_ctx = _l(language, "Kein zusaetzlicher Kontext", "No additional context")
    return (
        f"{base_prompt}\n\n"
        f"{_l(language, 'DISKUSSIONSSTIL', 'DISCUSSION STYLE')}:\n{style_block}\n\n"
        f"{_l(language, 'REGELN', 'RULES')}:\n"
        f"- {_l(language, 'Sprache', 'Language')}: {language}\n"
        f"- {word_limit}\n"
        f"- {_l(language, 'Beziehe dich auf Beitraege anderer Agenten wenn vorhanden', 'Reference contributions from other agents when available')}\n"
        f"- {_l(language, 'Beachte Hinweise und Fragen des Moderators', 'Follow the moderator hints and questions')}\n"
        f"- {_l(language, 'Sei konkret und praxisnah', 'Be concrete and practical')}\n"
        f"- {_l(language, 'Beende deinen Beitrag mit einem klaren Schlusspunkt - nicht mitten im Satz abbrechen', 'End your contribution with a clear conclusion - do not cut off mid-sentence')}\n\n"
        f"{_l(language, 'THEMA', 'TOPIC')}: {topic}\n"
        f"{_l(language, 'KONTEXT', 'CONTEXT')}: {context if context else no_ctx}"
    )


def build_history_text(messages: list[dict], language: str = "de") -> str:
    if not messages:
        return _l(language, "Noch keine Beitraege.", "No contributions yet.")
    parts = []
    current_round = None
    for msg in messages:
        rn = msg.get("round_number", 0)
        if rn != current_round:
            current_round = rn
            if rn == 0:
                parts.append(f"\n--- {_l(language, 'Eroeffnung durch den Moderator', 'Opening by the Moderator')} ---")
            elif 50 <= rn <= 90:
                actual_round = rn - 50
                parts.append(f"\n--- {_l(language, f'Moderator-Feedback nach Runde {actual_round}', f'Moderator feedback after round {actual_round}')} ---")
            elif rn == 99:
                parts.append(f"\n--- {_l(language, 'Schlussfazit des Moderators', 'Final summary by the Moderator')} ---")
            else:
                parts.append(f"\n--- {_l(language, f'Runde {rn}', f'Round {rn}')} ---")
        name = msg.get("agent_name", _l(language, "Unbekannt", "Unknown"))
        icon = msg.get("agent_icon", "")
        content = msg.get("content", "")
        parts.append(f"{icon} {name}: {content}")
    return "\n".join(parts)


def build_agent_messages(
    system_prompt: str, history: list[dict], round_number: int, num_rounds: int,
    language: str = "de",
) -> list[dict]:
    history_text = build_history_text(history, language)
    is_last = round_number == num_rounds
    round_hint = _l(language,
        "Das ist die letzte Runde. Bringe deine Position klar auf den Punkt." if is_last else f"Es folgen noch {num_rounds - round_number} Runde(n).",
        "This is the final round. Make your position crystal clear." if is_last else f"{num_rounds - round_number} round(s) remaining.")
    user_content = (
        f"{_l(language, 'Runde', 'Round')} {round_number} {_l(language, 'von', 'of')} {num_rounds}. {round_hint}\n\n"
        f"{_l(language, 'BISHERIGE DISKUSSION', 'PREVIOUS DISCUSSION')}:\n{history_text}\n\n"
        f"{_l(language, 'Bitte gib jetzt deinen Beitrag ab. Halte dich an die vereinbarte Laenge und beende mit einem klaren Schlusspunkt.', 'Please submit your contribution now. Stick to the agreed length and end with a clear conclusion.')}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


# ════════════════════════════════════════════════════════════════
# MODERATOR PROMPTS
# ════════════════════════════════════════════════════════════════

def build_moderator_base_system_prompt(language: str, custom_prompt: str = "") -> str:
    base = custom_prompt if custom_prompt else _l(language,
        "Du bist ein erfahrener Moderator einer strukturierten KI-Debatte. Du leitest die Diskussion professionell, stellst sicher dass alle beim Thema bleiben, und foerderst konstruktiven Austausch. Du bist neutral aber bestimmt.",
        "You are an experienced moderator of a structured AI debate. You lead the discussion professionally, ensure everyone stays on topic, and foster constructive exchange. You are neutral but firm.")
    return f"{base}\n\n{_l(language, 'Sprache', 'Language')}: {language}"


def build_moderator_opening_messages(
    system_prompt: str, topic: str, context: str, agents: list[dict],
    style: DebateStyle, num_rounds: int, decision_mode: DecisionMode,
    language: str = "de",
) -> list[dict]:
    sl = _style_label(style, language)
    dl = _decision_instruction(decision_mode, language)
    no_ctx = _l(language, "Kein zusaetzlicher Kontext", "No additional context")
    agents_text = "\n".join(
        f"- {a.get('icon', '')} {a.get('name', 'Agent')}: {a.get('description', a.get('system_prompt', '')[:100])}"
        for a in agents
    )
    user_content = _l(language,
        f"THEMA: {topic}\nKONTEXT: {context if context else no_ctx}\n\nTEILNEHMER:\n{agents_text}\n\nPARAMETER:\n- Diskussionsstil: {sl}\n- Runden: {num_rounds}\n- Entscheidungsmodus: {dl}\n\nDEINE AUFGABE JETZT:\nEroeffne die Diskussion. Du sollst:\n1. Das Thema kurz einordnen und die Kernfrage schaerfen\n2. Jeden Agenten direkt ansprechen und ihm einen spezifischen Fokus zuweisen\n3. Den Rahmen setzen: Was soll am Ende herauskommen?\n4. Die Teilnehmer zur ersten Runde auffordern\n\nHalte dich kurz (max 200 Woerter). Sei klar und strukturiert.",
        f"TOPIC: {topic}\nCONTEXT: {context if context else no_ctx}\n\nPARTICIPANTS:\n{agents_text}\n\nPARAMETERS:\n- Discussion style: {sl}\n- Rounds: {num_rounds}\n- Decision mode: {dl}\n\nYOUR TASK NOW:\nOpen the discussion. You should:\n1. Briefly frame the topic and sharpen the core question\n2. Address each agent directly and assign a specific focus\n3. Set the frame: What should the outcome be?\n4. Ask participants to begin the first round\n\nKeep it brief (max 200 words). Be clear and structured.")
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


def build_moderator_interlude_messages(
    system_prompt: str, topic: str, context: str, all_messages: list[dict],
    round_just_finished: int, num_rounds: int, decision_mode: DecisionMode,
    language: str = "de", num_agents: int = 3,
) -> list[dict]:
    history_text = build_history_text(all_messages, language)
    dl = _decision_instruction(decision_mode, language)
    no_ctx = _l(language, "Kein zusaetzlicher Kontext", "No additional context")
    is_before_last = round_just_finished == num_rounds - 1
    remaining = num_rounds - round_just_finished
    # Scale word limit by number of agents: base 150 + 40 per agent
    word_limit = 150 + num_agents * 40

    de_text = (f"THEMA: {topic}\nKONTEXT: {context if context else no_ctx}\n\nBISHERIGE DISKUSSION:\n{history_text}\n\nRunde {round_just_finished} von {num_rounds} ist abgeschlossen.\n{'Es folgt die letzte Runde.' if is_before_last else f'Es folgen noch {remaining} Runden.'}\n\nDEINE AUFGABE JETZT (Zwischenmoderation):\n1. Fasse die wichtigsten Punkte dieser Runde in 2-3 Saetzen zusammen\n2. Identifiziere: Gibt es Agenten die vom Thema abweichen? Sprich sie direkt an.\n3. Wenn ein Agent zu ausfuehrlich oder zu knapp war: Weise darauf hin und fordere Anpassung.\n4. Gibt es blinde Flecken die noch niemand adressiert hat? Benenne sie.\n5. Stelle 1-2 gezielte Fragen fuer die naechste Runde\n6. {'Erinnere die Agenten dass die naechste Runde die letzte ist - sie sollen ihre Position auf den Punkt bringen.' if is_before_last else 'Lenke den Fokus fuer die naechste Runde.'}\n\nEntscheidungsmodus: {dl}\nDu hast Platz fuer ca. {word_limit} Woerter. Sprich JEDEN Agenten namentlich an.\nWICHTIG: Beende JEDEN Punkt und JEDEN Satz vollstaendig. Brich niemals mitten im Gedanken ab.")
    en_text = (f"TOPIC: {topic}\nCONTEXT: {context if context else no_ctx}\n\nPREVIOUS DISCUSSION:\n{history_text}\n\nRound {round_just_finished} of {num_rounds} is complete.\n{'The final round follows.' if is_before_last else f'{remaining} rounds remaining.'}\n\nYOUR TASK NOW (Interlude):\n1. Summarize the key points of this round in 2-3 sentences\n2. Identify: Are any agents straying from the topic? Address them directly.\n3. If an agent was too verbose or too brief: Point it out and request adjustment.\n4. Are there blind spots nobody has addressed? Name them.\n5. Pose 1-2 targeted questions for the next round\n6. {'Remind agents the next round is the last - they should sharpen their position.' if is_before_last else 'Steer focus for the next round.'}\n\nDecision mode: {dl}\nYou have space for approx. {word_limit} words. Address EVERY agent by name.\nIMPORTANT: Complete EVERY point and EVERY sentence fully. Never cut off mid-thought.")
    user_content = _l(language, de_text, en_text)
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


# ════════════════════════════════════════════════════════════════
# SUMMARY LENGTH CONFIGS (bilingual)
# ════════════════════════════════════════════════════════════════

def _summary_config(summary_length: str, language: str) -> dict:
    configs = {
        "short": {
            "instruction": _l(language,
                "DEINE AUFGABE (KURZES FAZIT - max 200 Woerter!):\n1. Kernaussage in 2-3 Saetzen\n2. Staerkstes Argument\n3. Klare Empfehlung in einem Satz\nWICHTIG: Halte dich STRIKT an max 200 Woerter. Kein Fliesstext, nur das Wesentliche.",
                "YOUR TASK (SHORT SUMMARY - max 200 words!):\n1. Core conclusion in 2-3 sentences\n2. Strongest argument\n3. Clear recommendation in one sentence\nIMPORTANT: STRICTLY stay under 200 words. No filler, only essentials."),
            "format": _l(language,
                "FORMAT (KURZ):\n## Ergebnis\n[Kernaussage + staerkstes Argument + Empfehlung in max 200 Woertern]",
                "FORMAT (SHORT):\n## Result\n[Core conclusion + strongest argument + recommendation in max 200 words]"),
        },
        "medium": {
            "instruction": _l(language,
                "DEINE AUFGABE (SCHLUSSFAZIT - ca. 400-500 Woerter):\n1. Fasse die Kernargumente jedes Agenten in 1-2 Saetzen zusammen\n2. Identifiziere die 3 staerksten Argumente ueber alle Agenten\n3. Benenne Konsens-Punkte und verbleibende Dissense\n4. Gib eine KLARE EMPFEHLUNG mit Begruendung\n5. Schlage konkrete naechste Schritte vor",
                "YOUR TASK (FINAL SUMMARY - approx. 400-500 words):\n1. Summarize each agent's core arguments in 1-2 sentences\n2. Identify the 3 strongest arguments across all agents\n3. Name points of consensus and remaining disagreements\n4. Give a CLEAR RECOMMENDATION with reasoning\n5. Propose concrete next steps"),
            "format": _l(language,
                "FORMAT:\n## Zusammenfassung der Positionen\n[Jeder Agent in 1-2 Saetzen]\n\n## Staerkste Argumente\n[Top 3 Argumente]\n\n## Konsens & Dissens\n[Was ist unstrittig, was bleibt offen]\n\n## Empfehlung\n[Klare Handlungsempfehlung]\n\n## Naechste Schritte\n[2-3 konkrete Aktionen]",
                "FORMAT:\n## Summary of Positions\n[Each agent in 1-2 sentences]\n\n## Strongest Arguments\n[Top 3 arguments]\n\n## Consensus & Dissent\n[What is agreed, what remains open]\n\n## Recommendation\n[Clear action recommendation]\n\n## Next Steps\n[2-3 concrete actions]"),
        },
        "long": {
            "instruction": _l(language,
                "DEINE AUFGABE (AUSFUEHRLICHES FAZIT - ca. 800-1200 Woerter):\n1. Fasse die Kernargumente jedes Agenten ausfuehrlich zusammen (3-5 Saetze pro Agent)\n2. Identifiziere die 5 staerksten Argumente ueber alle Agenten mit Begruendung\n3. Detaillierte Analyse von Konsens-Punkten und Dissensen\n4. Gib eine AUSFUEHRLICHE EMPFEHLUNG mit Pro/Contra-Abwaegung\n5. Schlage 3-5 konkrete, priorisierte naechste Schritte vor\n6. Bewerte die Argumentationsqualitaet jedes Agenten",
                "YOUR TASK (DETAILED SUMMARY - approx. 800-1200 words):\n1. Summarize each agent's core arguments in detail (3-5 sentences per agent)\n2. Identify the 5 strongest arguments across all agents with reasoning\n3. Detailed analysis of consensus points and disagreements\n4. Give a DETAILED RECOMMENDATION with pros/cons weighing\n5. Propose 3-5 concrete, prioritized next steps\n6. Evaluate the argumentation quality of each agent"),
            "format": _l(language,
                "FORMAT:\n## Zusammenfassung der Positionen\n[Jeder Agent ausfuehrlich, 3-5 Saetze]\n\n## Staerkste Argumente\n[Top 5 Argumente mit Begruendung]\n\n## Konsens & Dissens\n[Detaillierte Analyse]\n\n## Empfehlung\n[Ausfuehrliche Handlungsempfehlung mit Abwaegung]\n\n## Naechste Schritte\n[3-5 priorisierte Aktionen]\n\n## Bewertung der Agenten\n[Rangliste nach Argumentationsqualitaet]",
                "FORMAT:\n## Summary of Positions\n[Each agent in detail, 3-5 sentences]\n\n## Strongest Arguments\n[Top 5 arguments with reasoning]\n\n## Consensus & Dissent\n[Detailed analysis]\n\n## Recommendation\n[Detailed recommendation with pros/cons]\n\n## Next Steps\n[3-5 prioritized actions]\n\n## Agent Evaluation\n[Ranking by argumentation quality]"),
        },
    }
    return configs.get(summary_length, configs["medium"])


def build_moderator_system_prompt(
    language: str, decision_mode: DecisionMode, custom_prompt: str = "",
    summary_length: str = "medium",
) -> str:
    di = _decision_instruction(decision_mode, language)
    base = custom_prompt if custom_prompt else _l(language,
        "Du bist der Moderator einer strukturierten KI-Debatte zwischen mehreren Agenten.",
        "You are the moderator of a structured AI debate between multiple agents.")
    cfg = _summary_config(summary_length, language)
    return (
        f"{base}\n\n"
        f"{cfg['instruction']}\n\n"
        f"{_l(language, 'ENTSCHEIDUNGSMODUS', 'DECISION MODE')}: {di}\n\n"
        f"{cfg['format']}\n\n"
        f"{_l(language, 'Sprache', 'Language')}: {language}"
    )


def build_moderator_messages(
    system_prompt: str, topic: str, context: str, all_messages: list[dict],
    language: str = "de",
) -> list[dict]:
    history_text = build_history_text(all_messages, language)
    no_ctx = _l(language, "Kein zusaetzlicher Kontext", "No additional context")
    user_content = (
        f"{_l(language, 'THEMA', 'TOPIC')}: {topic}\n"
        f"{_l(language, 'KONTEXT', 'CONTEXT')}: {context if context else no_ctx}\n\n"
        f"{_l(language, 'VOLLSTAENDIGE DEBATTE', 'COMPLETE DEBATE')}:\n{history_text}\n\n"
        f"{_l(language, 'Bitte erstelle jetzt dein Moderator-Fazit.', 'Please create your moderator summary now.')}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


# ════════════════════════════════════════════════════════════════
# SETUP SUGGESTION
# ════════════════════════════════════════════════════════════════

def build_setup_suggestion_prompt(topic: str, context: str, language: str = "de") -> list[dict]:
    """Prompt for AI to suggest complete debate setup with model recommendations."""
    respond_lang = _l(language, "Antworte auf Deutsch.", "Respond in English.")
    system = (
        f"{_l(language, 'Du bist ein Experte fuer Debattendesign und KI-Modell-Auswahl.', 'You are an expert in debate design and AI model selection.')} "
        f"{_l(language, 'Basierend auf einem Thema empfiehlst du die optimale Crew-Zusammenstellung mit konkreten LLM-Modell-Empfehlungen.', 'Based on a topic you recommend the optimal crew composition with concrete LLM model recommendations.')}\n\n"
        f"{respond_lang}\n\n"
        "AVAILABLE MODELS:\n"
        "Budget: openai/gpt-5.4-nano ($0.20/1M), anthropic/claude-haiku-4.5 ($1/1M), openai/gpt-4o-mini ($0.15/1M), google/gemini-2.5-flash ($0.30/1M)\n"
        "Standard: openai/gpt-5.4-mini ($0.75/1M), anthropic/claude-sonnet-4 ($3/1M)\n"
        "Premium: openai/gpt-5.4 ($1.25/1M), anthropic/claude-sonnet-4.6 ($3/1M), anthropic/claude-opus-4.6 ($15/1M)\n\n"
        "MODEL RULES:\n"
        "- Simple roles (Optimist, Historian, User Advocate): Budget suffices\n"
        "- Analytical roles (Skeptic, CFO, Engineer, Devil's Advocate): Standard needed\n"
        "- Complex roles (Strategist, Expert, Lawyer): Premium recommended\n"
        "- Moderator: ALWAYS needs strong reasoning for synthesis - at least Standard, better Premium\n\n"
        f"{_l(language, 'Antworte NUR mit folgendem JSON (kein Markdown, keine Erklaerung)', 'Respond ONLY with the following JSON (no Markdown, no explanation)')}:\n"
        '{\n'
        '  "suggested_agents": [\n'
        '    {\n'
        f'      "name": "{_l(language, "Der/Die ...", "The ...")}",\n'
        f'      "reason": "{_l(language, "Warum diese Perspektive wichtig ist", "Why this perspective matters")}",\n'
        '      "suggested_model": "provider/model-name",\n'
        f'      "model_reason": "{_l(language, "Warum dieses Modell passt", "Why this model fits")}"\n'
        '    }\n'
        '  ],\n'
        '  "suggested_style": "structured|socratic|confrontational|freeform",\n'
        f'  "style_reason": "{_l(language, "Warum dieser Stil passt", "Why this style fits")}",\n'
        '  "suggested_rounds": 2,\n'
        f'  "rounds_reason": "{_l(language, "Warum diese Anzahl Runden", "Why this number of rounds")}",\n'
        '  "suggested_decision_mode": "best_solution|vote|consensus|logic|ranking",\n'
        f'  "decision_reason": "{_l(language, "Warum dieser Modus passt", "Why this mode fits")}",\n'
        '  "suggested_moderator_model": "provider/model-name",\n'
        f'  "moderator_model_reason": "{_l(language, "Warum dieses Moderator-Modell", "Why this moderator model")}"\n'
        '}'
    )
    personalities_de = "Der Optimist, Der Skeptiker, Der Pragmatiker, Devil's Advocate, Der Fachexperte, Der CFO, Der Stratege, Der Ingenieur, Der Nutzer-Anwalt, Der Innovator, Der Historiker, Der Jurist"
    personalities_en = "The Optimist, The Skeptic, The Pragmatist, Devil's Advocate, The Expert, The CFO, The Strategist, The Engineer, The User Advocate, The Innovator, The Historian, The Lawyer"
    no_ctx = _l(language, "Kein zusaetzlicher Kontext", "No additional context")
    user = (
        f"{_l(language, 'THEMA', 'TOPIC')}: {topic}\n"
        f"{_l(language, 'KONTEXT', 'CONTEXT')}: {context if context else no_ctx}\n\n"
        f"{_l(language, 'Empfehle 3-5 Agenten aus', 'Recommend 3-5 agents from')}: "
        f"{_l(language, personalities_de, personalities_en)}.\n"
        f"{_l(language, 'Oder schlage custom Agenten vor wenn noetig.', 'Or suggest custom agents if needed.')}\n\n"
        f"{_l(language, 'Fuer JEDEN Agenten: Empfehle ein konkretes Modell mit Begruendung.', 'For EACH agent: Recommend a specific model with reasoning.')}\n"
        f"{_l(language, 'Fuer den MODERATOR: Empfehle ein Modell das gut synthetisieren kann.', 'For the MODERATOR: Recommend a model that can synthesize well.')}"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
