/**
 * Re-export from modular i18n.
 * All translations are now in lib/i18n/ directory.
 * This file exists for backward compatibility — all imports still work.
 */
export { t, setLocale, getStoredLocale, localizePersonalityName, findPersonalityDbName, localizePersonalityDesc } from "./i18n/index";
export type { Locale } from "./i18n/index";
