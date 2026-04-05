import type { Locale } from "./index";

/** Personality name translations (DB stores German) */
const personalityNames: Record<string, { en: string; de: string }> = {
  "Der Optimist":      { en: "The Optimist",       de: "Der Optimist" },
  "Der Skeptiker":     { en: "The Skeptic",        de: "Der Skeptiker" },
  "Der Pragmatiker":   { en: "The Pragmatist",     de: "Der Pragmatiker" },
  "Devil's Advocate":  { en: "Devil's Advocate",   de: "Devil's Advocate" },
  "Der Fachexperte":   { en: "The Expert",         de: "Der Fachexperte" },
  "Der CFO":           { en: "The CFO",            de: "Der CFO" },
  "Der Stratege":      { en: "The Strategist",     de: "Der Stratege" },
  "Der Ingenieur":     { en: "The Engineer",       de: "Der Ingenieur" },
  "Der Nutzer-Anwalt": { en: "The User Advocate",  de: "Der Nutzer-Anwalt" },
  "Der Innovator":     { en: "The Innovator",      de: "Der Innovator" },
  "Der Historiker":    { en: "The Historian",       de: "Der Historiker" },
  "Der Jurist":        { en: "The Lawyer",         de: "Der Jurist" },
};

const personalityDescs: Record<string, { en: string; de: string }> = {
  "Der Optimist":      { en: "Sees opportunities, growth and positive scenarios.",  de: "Sieht Chancen, Wachstum und positive Szenarien." },
  "Der Skeptiker":     { en: "Questions assumptions, seeks risks and worst cases.", de: "Hinterfragt Annahmen, sucht Risiken und Worst-Cases." },
  "Der Pragmatiker":   { en: "Focuses on feasibility, resources and quick wins.",   de: "Fokussiert auf Umsetzbarkeit, Ressourcen und Quick Wins." },
  "Devil's Advocate":  { en: "Takes the opposing view, provokes constructively.",   de: "Nimmt bewusst die Gegenposition ein und provoziert konstruktiv." },
  "Der Fachexperte":   { en: "Brings deep domain expertise and best practices.",    de: "Bringt tiefes Domaenenwissen und Best Practices ein." },
  "Der CFO":           { en: "Evaluates everything by cost, ROI and business case.", de: "Bewertet alles nach Kosten, ROI und Business Case." },
  "Der Stratege":      { en: "Thinks long-term: positioning, competition, market.",  de: "Denkt langfristig: Positionierung, Wettbewerb, Marktentwicklung." },
  "Der Ingenieur":     { en: "Evaluates technical feasibility and scalability.",     de: "Bewertet technische Machbarkeit, Architektur und Skalierbarkeit." },
  "Der Nutzer-Anwalt": { en: "Represents end-user perspective: UX, adoption.",       de: "Vertritt die Perspektive der Endnutzer: UX, Akzeptanz, Change." },
  "Der Innovator":     { en: "Thinks radically different, seeks disruptive ideas.",  de: "Denkt radikal anders, sucht disruptive Ansaetze." },
  "Der Historiker":    { en: "Learns from the past: patterns, lessons learned.",     de: "Lernt aus der Vergangenheit: Analogien, Muster, Lessons Learned." },
  "Der Jurist":        { en: "Evaluates compliance, regulation and legal risks.",    de: "Bewertet Compliance, Regulierung und rechtliche Risiken." },
};

/** Translate a personality name from DB (German) to current locale */
export function localizePersonalityName(name: string, locale: Locale): string {
  return personalityNames[name]?.[locale] || name;
}

/** Reverse lookup: find DB name (German) from any locale name */
export function findPersonalityDbName(name: string): string {
  if (personalityNames[name]) return name;
  for (const [dbName, trans] of Object.entries(personalityNames)) {
    if (trans.en === name || trans.de === name) return dbName;
  }
  return name;
}

/** Translate a personality description from DB (German) to current locale */
export function localizePersonalityDesc(desc: string, locale: Locale): string {
  for (const [, v] of Object.entries(personalityDescs)) {
    if (v.de === desc) return v[locale];
  }
  return desc;
}
