import type { Locale } from "./index";

const landingKeys: Record<string, Record<Locale, string>> = {
  // Hero
  "hero.badge": { en: "Free models available — no API key required", de: "Kostenlose Modelle verfügbar — kein API-Key nötig" },
  "hero.h1.line1": { en: "One question.", de: "Eine Frage." },
  "hero.h1.line2": { en: "Multiple AI minds.", de: "Mehrere KI-Köpfe." },
  "hero.h1.line3": { en: "Better decisions.", de: "Bessere Entscheidungen." },
  "hero.subtitle": { en: "Stop asking one AI and hoping for the best. superberater sends a crew of specialized AI agents — each with a different perspective — to debate your question and deliver a structured recommendation.", de: "Hör auf, eine KI zu fragen und auf das Beste zu hoffen. superberater schickt eine Crew spezialisierter KI-Agenten — jeder mit eigener Perspektive — um deine Frage zu debattieren und eine strukturierte Empfehlung zu liefern." },
  "hero.cta": { en: "Start a superRun", de: "superRun starten" },
  "hero.cta_login": { en: "Sign in to start", de: "Anmelden zum Starten" },
  "hero.demo": { en: "See live example", de: "Live-Beispiel ansehen" },
  "hero.opensource": { en: "Open Source (MIT)", de: "Open Source (MIT)" },

  // Hero preview
  "hero.preview.title": { en: "superRun", de: "superRun" },
  "hero.preview.live": { en: "Live", de: "Live" },
  "hero.preview.recommendation": { en: "Recommendation", de: "Empfehlung" },
  "hero.preview.text": { en: "Hybrid model. 3 days remote, 2 office. 90-day pilot →", de: "Hybrid-Modell. 3 Tage Remote, 2 Büro. 90-Tage-Pilot →" },

  // Value Proposition
  "value.label": { en: "Why not just ask ChatGPT?", de: "Warum nicht einfach ChatGPT fragen?" },
  "value.title": { en: "One AI gives you an answer. A crew gives you a decision.", de: "Eine KI gibt dir eine Antwort. Eine Crew gibt dir eine Entscheidung." },
  "value.subtitle": { en: "A single AI reflects one perspective and tends to agree with you. superberater forces structured disagreement — so blind spots get exposed before they become costly mistakes.", de: "Eine einzelne KI spiegelt eine Perspektive und neigt dazu, dir zuzustimmen. superberater erzwingt strukturierten Widerspruch — damit blinde Flecken aufgedeckt werden, bevor sie teure Fehler werden." },
  "value.old.title": { en: "Single AI Chat", de: "Einzelner KI-Chat" },
  "value.old.1": { en: "One perspective, one bias", de: "Eine Perspektive, ein Bias" },
  "value.old.2": { en: "Tends to agree with you", de: "Neigt dazu, dir zuzustimmen" },
  "value.old.3": { en: "Unstructured wall of text", de: "Unstrukturierte Textwand" },
  "value.old.4": { en: "No challenge, no debate", de: "Kein Widerspruch, keine Debatte" },
  "value.old.5": { en: "Can't compare model reasoning", de: "Kein Vergleich der Modell-Argumentation" },
  "value.new.title": { en: "superberater Crew", de: "superberater Crew" },
  "value.new.1": { en: "4-8 agents with distinct perspectives", de: "4-8 Agenten mit unterschiedlichen Perspektiven" },
  "value.new.2": { en: "Built-in Skeptic challenges every claim", de: "Eingebauter Skeptiker hinterfragt jede These" },
  "value.new.3": { en: "Structured rounds with moderator", de: "Strukturierte Runden mit Moderator" },
  "value.new.4": { en: "Agents debate and react to each other", de: "Agenten debattieren und reagieren aufeinander" },
  "value.new.5": { en: "Mix Claude, GPT, Gemini in one run", de: "Claude, GPT, Gemini in einem Run mischen" },

  // Use Cases
  "cases.label": { en: "Use Cases", de: "Anwendungsfälle" },
  "cases.title": { en: "What decisions can a superRun help with?", de: "Bei welchen Entscheidungen hilft ein superRun?" },
  "case.strategy.title": { en: "Strategy Decisions", de: "Strategische Entscheidungen" },
  "case.strategy.desc": { en: "Market entry, pricing strategy, competitive positioning, M&A evaluation", de: "Markteintritt, Preisstrategie, Wettbewerbspositionierung, M&A-Bewertung" },
  "case.strategy.example": { en: "\"Should we expand to the US market in Q3?\"", de: "\"Sollen wir in Q3 in den US-Markt expandieren?\"" },
  "case.finance.title": { en: "Investment & Finance", de: "Investment & Finanzen" },
  "case.finance.desc": { en: "Budget allocation, build vs. buy, vendor selection, risk assessment", de: "Budgetverteilung, Build vs. Buy, Anbieterauswahl, Risikobewertung" },
  "case.finance.example": { en: "\"Migrate to AWS or stay on-premise?\"", de: "\"Zu AWS migrieren oder On-Premise bleiben?\"" },
  "case.tech.title": { en: "Technology Choices", de: "Technologieentscheidungen" },
  "case.tech.desc": { en: "Architecture decisions, framework evaluation, migration planning", de: "Architekturentscheidungen, Framework-Bewertung, Migrationsplanung" },
  "case.tech.example": { en: "\"SAP S/4HANA: greenfield or brownfield?\"", de: "\"SAP S/4HANA: Greenfield oder Brownfield?\"" },
  "case.people.title": { en: "People & Organization", de: "Personal & Organisation" },
  "case.people.desc": { en: "Remote policy, team structure, hiring strategy, culture shifts", de: "Remote-Strategie, Teamstruktur, Hiring-Strategie, Kulturwandel" },
  "case.people.example": { en: "\"Should we adopt a remote-first policy?\"", de: "\"Sollen wir auf Remote-First umstellen?\"" },
  "case.risk.title": { en: "Risk & Compliance", de: "Risiko & Compliance" },
  "case.risk.desc": { en: "Regulatory impact analysis, compliance trade-offs, security posture", de: "Regulatorische Auswirkungsanalyse, Compliance-Abwägungen, Security" },
  "case.risk.example": { en: "\"Impact of EU AI Act on our ML pipeline?\"", de: "\"Auswirkung des EU AI Act auf unsere ML-Pipeline?\"" },
  "case.product.title": { en: "Product Decisions", de: "Produktentscheidungen" },
  "case.product.desc": { en: "Feature prioritization, launch timing, go-to-market strategy", de: "Feature-Priorisierung, Launch-Timing, Go-to-Market-Strategie" },
  "case.product.example": { en: "\"Launch MVP now or wait for feature X?\"", de: "\"MVP jetzt launchen oder auf Feature X warten?\"" },

  // Demo
  "example.label": { en: "Live Example", de: "Live-Beispiel" },
  "example.title": { en: "Watch a superRun in action", de: "Sieh einen superRun in Aktion" },
  "example.subtitle": { en: "4 AI agents analyze a real business decision — each from their specialist perspective", de: "4 KI-Agenten analysieren eine echte Business-Entscheidung — jeder aus seiner Spezialistenperspektive" },
  "example.topic": { en: "Should our company adopt a remote-first work policy?", de: "Soll unser Unternehmen auf eine Remote-First-Strategie umstellen?" },
  "example.tag": { en: "superRun", de: "superRun" },
  "example.mod_opening": { en: "Moderator · Opening", de: "Moderator · Eröffnung" },
  "example.mod_opening_text": { en: "Welcome. Strategist — evaluate long-term opportunities. Skeptic — challenge the cost arguments. CFO — analyze the business case. Pragmatist — show a feasible path forward.", de: "Willkommen zur Analyse. Stratege — bewerte die langfristigen Chancen. Skeptiker — prüfe die Kostenargumente kritisch. CFO — analysiere den Business Case. Pragmatiker — zeige einen umsetzbaren Weg." },
  "example.summary_label": { en: "Moderator · Recommendation", de: "Moderator · Empfehlung" },
  "example.summary_text": { en: "Recommendation: Hybrid model. 3 days remote, 2 office. 90-day pilot with 2 teams. Expected savings: ~$800K/year while preserving culture.", de: "Empfehlung: Hybrid-Modell starten. 3 Tage Remote, 2 Büro. 90-Tage-Pilotphase mit 2 Teams. Erwartete Einsparung: ~800K EUR/Jahr bei gleichzeitiger Kulturpflege." },

  // How it works
  "how.label": { en: "How it works", de: "So funktioniert's" },
  "how.title": { en: "From question to recommendation in 4 steps", de: "Von der Frage zur Empfehlung in 4 Schritten" },
  "how.step1.title": { en: "Define your topic", de: "Thema definieren" },
  "how.step1.desc": { en: "Describe the decision. Add context, upload documents (PDF, DOCX, XLSX).", de: "Beschreibe die Entscheidung. Füge Kontext hinzu, lade Dokumente hoch (PDF, DOCX, XLSX)." },
  "how.step2.title": { en: "AI assembles the crew", de: "KI stellt die Crew zusammen" },
  "how.step2.desc": { en: "superberater suggests the right agents, models, and discussion style. Or configure manually.", de: "superberater schlägt passende Agenten, Modelle und Diskussionsstil vor. Oder konfiguriere manuell." },
  "how.step3.title": { en: "Watch the debate live", de: "Debatte live verfolgen" },
  "how.step3.desc": { en: "Agents argue in real-time via streaming. A moderator guides the discussion.", de: "Agenten argumentieren in Echtzeit via Streaming. Ein Moderator leitet die Diskussion." },
  "how.step4.title": { en: "Get a recommendation", de: "Empfehlung erhalten" },
  "how.step4.desc": { en: "The moderator synthesizes all arguments into a structured summary with next steps.", de: "Der Moderator fasst alle Argumente in einem strukturierten Fazit mit nächsten Schritten zusammen." },

  // Features
  "features.label": { en: "Features", de: "Features" },
  "features.title": { en: "Everything you need for better decisions", de: "Alles was du für bessere Entscheidungen brauchst" },
  "feat.agents.title": { en: "12+ Agent Personalities", de: "12+ Agenten-Persönlichkeiten" },
  "feat.agents.desc": { en: "Skeptic, CFO, Engineer, Strategist, Legal, Innovator — each with a unique perspective. Or create your own custom agents.", de: "Skeptiker, CFO, Ingenieur, Stratege, Jurist, Innovator — jeder mit eigener Perspektive. Oder erstelle eigene Agenten." },
  "feat.models.title": { en: "Multi-Model in One Run", de: "Multi-Modell in einem Run" },
  "feat.models.desc": { en: "Assign different LLMs to each agent. Mix Claude, GPT-5.4, Gemini, DeepSeek — from free to premium tier.", de: "Weise jedem Agenten ein anderes LLM zu. Mische Claude, GPT-5.4, Gemini, DeepSeek — von Free bis Premium." },
  "feat.moderator.title": { en: "Active Moderator", de: "Aktiver Moderator" },
  "feat.moderator.desc": { en: "Opens the debate, gives inter-round feedback, corrects off-track agents, writes the final recommendation.", de: "Eröffnet die Debatte, gibt Zwischenfeedback, korrigiert abschweifende Agenten, schreibt die Empfehlung." },
  "feat.streaming.title": { en: "Real-Time Streaming", de: "Echtzeit-Streaming" },
  "feat.streaming.desc": { en: "Watch every agent think and write live. Parallel or sequential execution with status indicators.", de: "Sieh jedem Agenten beim Denken und Schreiben zu. Parallele oder sequenzielle Ausführung mit Status." },
  "feat.upload.title": { en: "Document Upload", de: "Dokument-Upload" },
  "feat.upload.desc": { en: "Upload PDF, DOCX, XLSX, PPTX or text files as context. Agents analyze your documents alongside the topic.", de: "Lade PDF, DOCX, XLSX, PPTX oder Textdateien als Kontext hoch. Agenten analysieren deine Dokumente." },
  "feat.export.title": { en: "Export & Share", de: "Export & Teilen" },
  "feat.export.desc": { en: "Export results as PDF or Markdown. Share superRuns publicly with a link. View community runs.", de: "Exportiere Ergebnisse als PDF oder Markdown. Teile superRuns öffentlich per Link." },

  // Models bar
  "models.label": { en: "Powered by leading AI models", de: "Angetrieben von führenden KI-Modellen" },
  "models.free": { en: "8+ Free Models", de: "8+ kostenlose Modelle" },
  "models.free_sub": { en: "No key needed", de: "Kein Key nötig" },

  // CTA
  "cta.title": { en: "Ready to make better decisions?", de: "Bereit für bessere Entscheidungen?" },
  "cta.subtitle": { en: "Start your first superRun in under 2 minutes. Free models included — no API key required.", de: "Starte deinen ersten superRun in unter 2 Minuten. Kostenlose Modelle inklusive — kein API-Key nötig." },
  "cta.signup": { en: "Sign Up Free", de: "Kostenlos registrieren" },
  "cta.free_note": { en: "Free forever · No credit card · Open source (MIT)", de: "Für immer kostenlos · Keine Kreditkarte · Open Source (MIT)" },

  // Footer — open source & GitHub
  "footer.brand_desc": {
    en: "MIT-licensed open source. Full source code and license on GitHub (superberater/superberater). This demo is hosted by superLab GmbH — not a commercial service.",
    de: "Open Source unter der MIT-Lizenz. Vollständiger Quelltext und Lizenz auf GitHub (superberater/superberater). Diese Demo wird von der superLab GmbH betrieben — kein kommerzieller Dienst.",
  },
  "footer.demo_disclaimer": {
    en: "Open-source project (MIT) — live demo for github.com/superberater/superberater. Not a commercial product or paid service. Results are generated by third-party AI models and may be inaccurate. No consulting, no warranty.",
    de: "Open-Source-Projekt (MIT) — Live-Demo zu github.com/superberater/superberater. Kein kommerzielles Produkt, kein Bezahldienst. Ergebnisse werden von KI-Modellen Dritter generiert und können fehlerhaft sein. Keine Beratung, keine Gewähr.",
  },
  "footer.link_github": { en: "Repository on GitHub", de: "Repository auf GitHub" },
  "footer.link_license": { en: "MIT License", de: "MIT-Lizenz" },
};

export default landingKeys;
