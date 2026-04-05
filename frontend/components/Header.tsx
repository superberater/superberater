"use client";

import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const { locale, toggleLocale } = useLocale();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-brand tracking-tight">
          super<span className="text-brand-accent">berater</span>
        </a>
        <nav className="flex items-center gap-3 text-sm">
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
