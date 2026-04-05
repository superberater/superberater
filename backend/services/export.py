"""Export service: Generate PDF and Markdown reports from debate results."""

import io
from datetime import datetime
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


BRAND_DARK = HexColor("#1B2A4A")


def _round_label(rn: int) -> str:
    """Human-readable round label, handling interlude rounds (50+n)."""
    if rn == 0:
        return "Eroeffnung"
    if rn == 99:
        return "Fazit"
    if 50 <= rn <= 90:
        return f"Feedback nach Runde {rn - 50}"
    return f"Runde {rn}"


def _strip_emojis(text: str) -> str:
    """Remove emoji characters that ReportLab can't render."""
    import re
    # Remove most emoji ranges
    emoji_pattern = re.compile(
        "[" "\U0001F600-\U0001F64F" "\U0001F300-\U0001F5FF" "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF" "\U00002702-\U000027B0" "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF" "\U0001FA00-\U0001FA6F" "\U0001FA70-\U0001FAFF"
        "\U00002600-\U000026FF" "\U0000FE00-\U0000FE0F" "\U0000200D"
        "]+", flags=re.UNICODE
    )
    return emoji_pattern.sub("", text).strip()


BRAND_BLUE = HexColor("#2471A3")
BRAND_ACCENT = HexColor("#E94560")
GRAY_LIGHT = HexColor("#F2F3F4")
GRAY_MED = HexColor("#808080")


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "Title2", parent=styles["Title"], fontSize=22,
        textColor=BRAND_DARK, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        "Subtitle", parent=styles["Normal"], fontSize=11,
        textColor=GRAY_MED, alignment=TA_CENTER, spaceAfter=20
    ))
    styles.add(ParagraphStyle(
        "H2", parent=styles["Heading2"], fontSize=14,
        textColor=BRAND_BLUE, spaceBefore=16, spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        "H3", parent=styles["Heading3"], fontSize=12,
        textColor=BRAND_ACCENT, spaceBefore=12, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        "AgentName", parent=styles["Normal"], fontSize=11,
        textColor=BRAND_DARK, fontName="Helvetica-Bold"
    ))
    styles.add(ParagraphStyle(
        "Body", parent=styles["Normal"], fontSize=10,
        leading=14, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        "Small", parent=styles["Normal"], fontSize=8,
        textColor=GRAY_MED
    ))
    return styles


def generate_pdf(
    topic: str,
    context: str,
    messages: list[dict],
    moderator_summary: Optional[str],
    total_tokens: int,
    total_cost_cents: int,
    agents: list[dict],
) -> bytes:
    """Generate a PDF report and return as bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
    )
    styles = _build_styles()
    story = []

    # Title
    story.append(Paragraph("superberater Report", styles["Title2"]))
    story.append(Paragraph(
        f"Erstellt am {datetime.now().strftime('%d.%m.%Y %H:%M')}",
        styles["Subtitle"]
    ))
    story.append(HRFlowable(width="100%", color=BRAND_BLUE, thickness=1))
    story.append(Spacer(1, 12))

    # Topic
    story.append(Paragraph("Thema", styles["H2"]))
    story.append(Paragraph(topic, styles["Body"]))
    if context:
        story.append(Paragraph("Kontext", styles["H3"]))
        story.append(Paragraph(context, styles["Body"]))

    # Agents
    story.append(Paragraph("Beteiligte Agenten", styles["H2"]))
    for a in agents:
        p_info = a.get("personalities", {}) or {}
        name = p_info.get("name", a.get("name", "Agent"))
        icon = p_info.get("icon", "")
        model = a.get("model", "")
        story.append(Paragraph(f"{_strip_emojis(icon)} <b>{_strip_emojis(name)}</b> \u2014 {model}", styles["Body"]))

    # Moderator Summary
    if moderator_summary:
        story.append(Spacer(1, 12))
        story.append(Paragraph("Moderator-Fazit", styles["H2"]))
        for line in moderator_summary.split("\n"):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 4))
            elif line.startswith("##"):
                story.append(Paragraph(_strip_emojis(line.lstrip("#").strip()), styles["H3"]))
            else:
                story.append(Paragraph(_strip_emojis(line), styles["Body"]))

    # Debate Rounds
    story.append(Spacer(1, 12))
    story.append(Paragraph("Debattenverlauf", styles["H2"]))

    current_round = None
    for m in messages:
        rn = m.get("round_number", 0)
        if rn == 99:
            continue  # Skip moderator (already shown above)
        if rn != current_round:
            current_round = rn
            story.append(Spacer(1, 8))
            story.append(Paragraph(_round_label(rn), styles["H3"]))

        agent_name = m.get("agent_name", "Agent")
        agent_icon = m.get("agent_icon", "\U0001f916")
        content = m.get("content", "")
        model = m.get("model_used", "")

        story.append(Paragraph(
            f"{_strip_emojis(agent_icon)} <b>{_strip_emojis(agent_name)}</b> <font size=7 color='#808080'>({model})</font>",
            styles["AgentName"]
        ))
        for line in content.split("\n"):
            if line.strip():
                story.append(Paragraph(_strip_emojis(line), styles["Body"]))
        story.append(Spacer(1, 6))

    # Stats
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", color=GRAY_MED, thickness=0.5))
    story.append(Paragraph(
        f"Tokens: {total_tokens} | Kosten: ~${total_cost_cents / 100:.2f} | "
        f"Beitr\u00e4ge: {len(messages)}",
        styles["Small"]
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


def generate_markdown(
    topic: str,
    context: str,
    messages: list[dict],
    moderator_summary: Optional[str],
    total_tokens: int,
    total_cost_cents: int,
    agents: list[dict],
) -> str:
    """Generate a Markdown report."""
    lines = []
    lines.append("# superberater Report")
    lines.append(f"*Erstellt am {datetime.now().strftime('%d.%m.%Y %H:%M')}*\n")

    lines.append(f"## Thema\n{topic}\n")
    if context:
        lines.append(f"### Kontext\n{context}\n")

    lines.append("## Beteiligte Agenten\n")
    for a in agents:
        p_info = a.get("personalities", {}) or {}
        name = p_info.get("name", a.get("name", "Agent"))
        icon = p_info.get("icon", "\U0001f916")
        model = a.get("model", "")
        lines.append(f"- {icon} **{name}** \u2014 {model}")
    lines.append("")

    if moderator_summary:
        lines.append("## Moderator-Fazit\n")
        lines.append(moderator_summary)
        lines.append("")

    lines.append("## Debattenverlauf\n")
    current_round = None
    for m in messages:
        rn = m.get("round_number", 0)
        if rn == 99:
            continue
        if rn != current_round:
            current_round = rn
            lines.append(f"\n### {_round_label(rn)}\n")

        agent_name = m.get("agent_name", "Agent")
        agent_icon = m.get("agent_icon", "\U0001f916")
        content = m.get("content", "")
        model = m.get("model_used", "")

        lines.append(f"#### {agent_icon} {agent_name} *({model})*\n")
        lines.append(content)
        lines.append("")

    lines.append("---")
    lines.append(f"*Tokens: {total_tokens} | Kosten: ~${total_cost_cents / 100:.2f} | Beitr\u00e4ge: {len(messages)}*")

    return "\n".join(lines)
