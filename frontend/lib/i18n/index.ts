/**
 * superberater i18n — modular translations.
 * Default language: English
 *
 * Structure:
 *   landing.ts       — Landing page (hero, how-it-works, features, CTA)
 *   wizard.ts        — Wizard + Modal (wiz.*, modal.*)
 *   live.ts          — Live view + Result (live.*, result.*)
 *   common.ts        — Nav, Auth, Settings, Dashboard, Round labels, Type labels
 *   personalities.ts — Agent name/desc maps + localize functions
 */

export type Locale = "en" | "de";

import landingKeys from "./landing";
import wizardKeys from "./wizard";
import liveKeys from "./live";
import commonKeys from "./common";

const translations: Record<string, Record<Locale, string>> = {
  ...landingKeys,
  ...wizardKeys,
  ...liveKeys,
  ...commonKeys,
};

export function t(key: string, locale: Locale): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[locale] || entry["en"] || key;
}

export function setLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem("superberater_locale", locale);
  window.dispatchEvent(new CustomEvent("superberater-locale-change", { detail: locale }));
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("superberater_locale") as Locale) || "en";
}

// Re-export personality functions
export { localizePersonalityName, findPersonalityDbName, localizePersonalityDesc } from "./personalities";
