"use client";
import { useState, useEffect, useCallback } from "react";
import { getStoredLocale, setLocale as storeLocale, type Locale } from "@/lib/i18n";

/**
 * Hook that provides current locale and a toggle function.
 * All components using this hook update together when locale changes.
 */
export function useLocale() {
  const [locale, setLoc] = useState<Locale>("en");

  useEffect(() => {
    // Read from localStorage on mount
    setLoc(getStoredLocale());

    // Listen for locale changes from other components
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Locale>).detail;
      if (detail) setLoc(detail);
    };
    window.addEventListener("superberater-locale-change", handler);
    return () => window.removeEventListener("superberater-locale-change", handler);
  }, []);

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === "en" ? "de" : "en";
    storeLocale(next);  // saves to localStorage + dispatches event
    setLoc(next);
  }, [locale]);

  return { locale, toggleLocale };
}
