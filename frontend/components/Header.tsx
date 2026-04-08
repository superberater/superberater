"use client";

import { Github } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";
import { GITHUB_REPO_URL } from "@/lib/links";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const { locale, toggleLocale } = useLocale();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <a href="/" className="text-xl font-bold text-brand tracking-tight shrink-0">
          super<span className="text-brand-accent">berater</span>
        </a>
        <nav className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap justify-end">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="superberater/superberater"
            aria-label={locale === "de" ? "Quellcode auf GitHub" : "Source code on GitHub"}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-[#24292f] px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-black/20 ring-1 ring-black/10 transition hover:bg-[#2f363d]"
          >
            <Github className="h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0" strokeWidth={2} />
            <span>{t("nav.github", locale)}</span>
          </a>
          {!loading && (
            <>
              {user ? (
                <>
                  <a href="/debate/new" className="text-gray-600 hover:text-brand">{t("nav.new_run", locale)}</a>
                  <a href="/dashboard" className="text-gray-600 hover:text-brand">{t("nav.dashboard", locale)}</a>
                  <button onClick={() => signOut()} className="text-gray-400 hover:text-gray-600">{t("nav.sign_out", locale)}</button>
                </>
              ) : (
                <a href="/auth/login" className="px-4 py-1.5 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">{t("nav.sign_in", locale)}</a>
              )}
            </>
          )}
          <button
            onClick={toggleLocale}
            className="ml-1 px-2 py-1 text-xs text-gray-500 hover:text-brand border border-gray-200 rounded hover:border-brand-light transition-colors"
            title={locale === "en" ? "Auf Deutsch wechseln" : "Switch to English"}
          >
            {locale === "en" ? "DE" : "EN"}
          </button>
        </nav>
      </div>
    </header>
  );
}
