/**
 * Shared types for superberater frontend.
 */

export type DebateStyle = "structured" | "socratic" | "confrontational" | "freeform";
export type ParallelMode = "parallel" | "sequential" | "hybrid";
export type DecisionMode = "vote" | "consensus" | "logic" | "best_solution" | "ranking";
export type DebateStatus = "created" | "running" | "completed" | "failed";

export interface WizardState {
  topic: string;
  context: string;
  language: string;
  selectedAgents: SelectedAgent[];
  numRounds: number;
  style: DebateStyle;
  parallelMode: ParallelMode;
  decisionMode: DecisionMode;
  maxTokens: number;
  moderatorModel: string;
  moderatorSystemPrompt: string;
  activeModerator: boolean;
  summaryLength: "short" | "medium" | "long";
}

export interface SelectedAgent {
  personalityId: string;
  name: string;
  icon: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  sortOrder: number;
}

export interface StreamingAgent {
  id: string;
  name: string;
  icon: string;
  model: string;
  text: string;
  status: "idle" | "streaming" | "done" | "error";
  roundNumber: number;
  error?: string;
}

const PERSONALITY_TIER_DATA: Record<string, { tier: string; reason: { en: string; de: string } }> = {
  "Der Optimist":     { tier: "budget",   reason: { en: "Simple role, no deep reasoning needed", de: "Einfache Rolle, braucht kein tiefes Reasoning" } },
  "The Optimist":     { tier: "budget",   reason: { en: "Simple role, no deep reasoning needed", de: "Einfache Rolle, braucht kein tiefes Reasoning" } },
  "Der Historiker":   { tier: "budget",   reason: { en: "Associative role, budget models suffice", de: "Assoziative Rolle, Budget-Modelle reichen" } },
  "The Historian":    { tier: "budget",   reason: { en: "Associative role, budget models suffice", de: "Assoziative Rolle, Budget-Modelle reichen" } },
  "Der Nutzer-Anwalt":{ tier: "budget",   reason: { en: "UX perspective, no complex reasoning needed", de: "UX-Perspektive, kein komplexes Reasoning noetig" } },
  "The User Advocate":{ tier: "budget",   reason: { en: "UX perspective, no complex reasoning needed", de: "UX-Perspektive, kein komplexes Reasoning noetig" } },
  "Der Innovator":    { tier: "budget",   reason: { en: "Creativity doesn't need a premium model", de: "Kreativitaet braucht kein Premium-Modell" } },
  "The Innovator":    { tier: "budget",   reason: { en: "Creativity doesn't need a premium model", de: "Kreativitaet braucht kein Premium-Modell" } },
  "Der Skeptiker":    { tier: "standard", reason: { en: "Critical thinking benefits from better model", de: "Kritisches Denken profitiert von besserem Modell" } },
  "The Skeptic":      { tier: "standard", reason: { en: "Critical thinking benefits from better model", de: "Kritisches Denken profitiert von besserem Modell" } },
  "Der Pragmatiker":  { tier: "standard", reason: { en: "Needs good cost/benefit weighing", de: "Braucht gutes Abwaegen von Aufwand/Nutzen" } },
  "The Pragmatist":   { tier: "standard", reason: { en: "Needs good cost/benefit weighing", de: "Braucht gutes Abwaegen von Aufwand/Nutzen" } },
  "Der CFO":          { tier: "standard", reason: { en: "Financial analysis needs precise reasoning", de: "Finanzanalyse braucht praezises Reasoning" } },
  "The CFO":          { tier: "standard", reason: { en: "Financial analysis needs precise reasoning", de: "Finanzanalyse braucht praezises Reasoning" } },
  "Der Ingenieur":    { tier: "standard", reason: { en: "Technical depth needs solid model", de: "Technische Tiefe braucht solides Modell" } },
  "The Engineer":     { tier: "standard", reason: { en: "Technical depth needs solid model", de: "Technische Tiefe braucht solides Modell" } },
  "Der Stratege":     { tier: "premium",  reason: { en: "Long-term strategic thinking = Premium", de: "Langfristiges strategisches Denken = Premium" } },
  "The Strategist":   { tier: "premium",  reason: { en: "Long-term strategic thinking = Premium", de: "Langfristiges strategisches Denken = Premium" } },
  "Der Fachexperte":  { tier: "premium",  reason: { en: "Domain expertise needs best model", de: "Domaenenwissen braucht bestes Modell" } },
  "The Expert":       { tier: "premium",  reason: { en: "Domain expertise needs best model", de: "Domaenenwissen braucht bestes Modell" } },
  "Der Jurist":       { tier: "premium",  reason: { en: "Regulatory precision needs Premium", de: "Regulatorische Praezision braucht Premium" } },
  "The Lawyer":       { tier: "premium",  reason: { en: "Regulatory precision needs Premium", de: "Regulatorische Praezision braucht Premium" } },
  "Devil's Advocate": { tier: "standard", reason: { en: "Counter-arguments need good reasoning", de: "Gegenargumente brauchen gutes Reasoning" } },
};

/** Get tier info for a personality name. Returns localized reason. */
export function getPersonalityTier(name: string, locale: string = "de"): { tier: string; reason: string } | undefined {
  const entry = PERSONALITY_TIER_DATA[name];
  if (!entry) return undefined;
  const l = locale === "en" ? "en" : "de";
  return { tier: entry.tier, reason: entry.reason[l] };
}

/** Legacy export for backward compat */
export const PERSONALITY_TIER_MAP: Record<string, { tier: string; reason: string }> = Object.fromEntries(
  Object.entries(PERSONALITY_TIER_DATA).map(([k, v]) => [k, { tier: v.tier, reason: v.reason.de }])
);

export const TIER_COLORS: Record<string, string> = {
  free:     "text-emerald-700 bg-emerald-50 border-emerald-300",
  budget:   "text-green-600 bg-green-50 border-green-200",
  standard: "text-blue-600 bg-blue-50 border-blue-200",
  premium:  "text-purple-600 bg-purple-50 border-purple-200",
};

export const TIER_LABELS: Record<string, string> = {
  free:     "Free",
  budget:   "Budget",
  standard: "Standard",
  premium:  "Premium",
};

export const MODELS = [
  { value: "openai/gpt-5.4-nano", label: "GPT-5.4 Nano", cost: "$0.20/1M", tier: "budget" },
  { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", cost: "$1/1M", tier: "budget" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini", cost: "$0.15/1M", tier: "budget" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", cost: "$0.30/1M", tier: "budget" },
  { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", cost: "$0.75/1M", tier: "standard" },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", cost: "$3/1M", tier: "standard" },
  { value: "openai/gpt-5.4", label: "GPT-5.4", cost: "$1.25/1M", tier: "premium" },
  { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", cost: "$3/1M", tier: "premium" },
  { value: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6", cost: "$15/1M", tier: "premium" },
] as const;

// Updated April 2026 — verified via live API calls
// Removed: openai/gpt-oss-120b:free (404 privacy), qwen3.6-plus-preview:free (404)
const FREE_MODERATOR_MODELS_I18N = [
  { value: "arcee-ai/trinity-large-preview:free", label: "Arcee Trinity Large (Free)", cost: "free", recommended: true, reason: { en: "400B MoE, verified reliable, no privacy restrictions", de: "400B MoE, verifiziert zuverlaessig, keine Privacy-Einschraenkungen" } },
  { value: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B (Free)", cost: "free", recommended: false, reason: { en: "Strong but often rate-limited, 262K context", de: "Stark aber oft rate-limited, 262K Kontext" } },
  { value: "stepfun/step-3.5-flash:free", label: "StepFun Step 3.5 Flash (Free)", cost: "free", recommended: false, reason: { en: "Fast MoE model, 256K context", de: "Schnelles MoE-Modell, 256K Kontext" } },
  { value: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (Free)", cost: "free", recommended: false, reason: { en: "Hybrid Mamba-Transformer, 262K context", de: "Hybrid Mamba-Transformer, 262K Kontext" } },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)", cost: "free", recommended: false, reason: { en: "Reliable multilingual model", de: "Zuverlaessiges mehrsprachiges Modell" } },
];

const MODERATOR_MODELS_I18N = [
  { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", cost: "$3/1M", recommended: true, reason: { en: "Best price/performance for synthesis", de: "Bestes Preis-Leistungs-Verhaeltnis fuer Synthese" } },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", cost: "$3/1M", recommended: false, reason: { en: "Solid, slightly older model", de: "Solide, etwas aelteres Modell" } },
  { value: "openai/gpt-5.4", label: "GPT-5.4", cost: "$1.25/1M", recommended: true, reason: { en: "Strong reasoning, cheaper than Claude", de: "Starkes Reasoning, guenstiger als Claude" } },
  { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", cost: "$0.75/1M", recommended: false, reason: { en: "Budget option, weaker in complex debates", de: "Budget-Option, bei komplexen Debatten schwaecher" } },
  { value: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6", cost: "$15/1M", recommended: true, reason: { en: "Best model, expensive — for critical decisions", de: "Bestes Modell, teuer - fuer kritische Entscheidungen" } },
];

export function getModeratorModels(locale: string = "de", includeFree: boolean = false) {
  const l = locale === "en" ? "en" : "de";
  const paid = MODERATOR_MODELS_I18N.map(m => ({ ...m, reason: m.reason[l] }));
  if (!includeFree) return paid;
  const free = FREE_MODERATOR_MODELS_I18N.map(m => ({ ...m, reason: m.reason[l] }));
  return [...free, ...paid];
}

export function getFreeModeratorModels(locale: string = "de") {
  const l = locale === "en" ? "en" : "de";
  return FREE_MODERATOR_MODELS_I18N.map(m => ({ ...m, reason: m.reason[l] }));
}

export const MODERATOR_MODELS = getModeratorModels("de");

export const DEFAULT_MODERATOR_PROMPT =
  "Du bist ein erfahrener Moderator einer strukturierten KI-Debatte. " +
  "Du leitest die Diskussion professionell, stellst sicher dass alle beim Thema bleiben, " +
  "und foerderst konstruktiven Austausch. Du bist neutral aber bestimmt.";

type LocaleOption<T extends string> = { value: T; label: { en: string; de: string }; desc: { en: string; de: string } };
type SimpleOption<T extends string> = { value: T; label: string; desc: string };

const STYLES_I18N: LocaleOption<DebateStyle>[] = [
  { value: "structured", label: { en: "Structured", de: "Strukturiert" }, desc: { en: "Argument + Counterargument + Solution", de: "Argument + Gegenargument + Loesung" } },
  { value: "socratic", label: { en: "Socratic", de: "Sokratisch" }, desc: { en: "Agents question each other", de: "Agenten stellen sich gegenseitig Fragen" } },
  { value: "confrontational", label: { en: "Confrontational", de: "Konfrontativ" }, desc: { en: "Direct criticism allowed", de: "Direkte Kritik erlaubt" } },
  { value: "freeform", label: { en: "Freeform", de: "Freeform" }, desc: { en: "No constraints", de: "Keine Vorgaben" } },
];

const DECISION_MODES_I18N: LocaleOption<DecisionMode>[] = [
  { value: "best_solution", label: { en: "Best Solution", de: "Beste Loesung" }, desc: { en: "Focus on constructive proposals", de: "Fokus auf konstruktive Vorschlaege" } },
  { value: "vote", label: { en: "Vote", de: "Abstimmung" }, desc: { en: "Each agent votes", de: "Jeder Agent stimmt ab" } },
  { value: "consensus", label: { en: "Consensus", de: "Konsens" }, desc: { en: "Largest common denominator", de: "Groesster gemeinsamer Nenner" } },
  { value: "logic", label: { en: "Logic Wins", de: "Logik-Sieg" }, desc: { en: "Strongest argument wins", de: "Staerkstes Argument gewinnt" } },
  { value: "ranking", label: { en: "Ranking", de: "Ranking" }, desc: { en: "Borda count across all agents", de: "Borda-Count ueber alle Agenten" } },
];

const PARALLEL_MODES_I18N: LocaleOption<ParallelMode>[] = [
  { value: "parallel", label: { en: "Parallel", de: "Parallel" }, desc: { en: "All at once, fast", de: "Alle gleichzeitig, schnell" } },
  { value: "hybrid", label: { en: "Hybrid", de: "Hybrid" }, desc: { en: "R1 parallel, then sequential", de: "R1 parallel, dann sequenziell" } },
  { value: "sequential", label: { en: "Sequential", de: "Sequenziell" }, desc: { en: "One after another", de: "Einer nach dem anderen" } },
];

function resolveOptions<T extends string>(items: LocaleOption<T>[], locale: string = "de"): SimpleOption<T>[] {
  const l = (locale === "en" ? "en" : "de") as "en" | "de";
  return items.map(i => ({ value: i.value, label: i.label[l], desc: i.desc[l] }));
}

/** Get localized STYLES/DECISION_MODES/PARALLEL_MODES. Pass locale or defaults to "de". */
export function getStyles(locale?: string) { return resolveOptions(STYLES_I18N, locale); }
export function getDecisionModes(locale?: string) { return resolveOptions(DECISION_MODES_I18N, locale); }
export function getParallelModes(locale?: string) { return resolveOptions(PARALLEL_MODES_I18N, locale); }

/** Legacy exports for backwards compat (default: German) */
export const STYLES = resolveOptions(STYLES_I18N, "de");
export const DECISION_MODES = resolveOptions(DECISION_MODES_I18N, "de");
export const PARALLEL_MODES = resolveOptions(PARALLEL_MODES_I18N, "de");

/** Helper: is this a moderator interlude round (50-90)? */
export function isInterludeRound(roundNumber: number): boolean {
  return roundNumber >= 50 && roundNumber <= 90;
}

/** Helper: get the actual debate round from an interlude round number */
export function getInterludeSourceRound(roundNumber: number): number {
  return roundNumber - 50;
}

/** Helper: human-readable round label */
export function getRoundLabel(roundNumber: number, locale: string = "de"): string {
  const en = locale === "en";
  if (roundNumber === 0) return en ? "Opening" : "Eroeffnung";
  if (roundNumber === 99) return en ? "Summary" : "Fazit";
  if (isInterludeRound(roundNumber)) return en ? `Feedback after round ${getInterludeSourceRound(roundNumber)}` : `Feedback nach Runde ${getInterludeSourceRound(roundNumber)}`;
  return en ? `Round ${roundNumber}` : `Runde ${roundNumber}`;
}
