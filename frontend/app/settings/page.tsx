"use client";

import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLocale();

  if (authLoading) return (
    <div className="max-w-2xl mx-auto mt-16 text-center">
      <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto" />
    </div>
  );

  if (!user) return (
    <div className="max-w-2xl mx-auto mt-16 text-center">
      <h1 className="text-2xl font-bold text-brand mb-4">{t("set.title", locale)}</h1>
      <p className="text-gray-500 mb-4">
        {t("set.sign_in_first", locale)}{" "}
        <a href="/auth/login" className="text-brand underline">{t("nav.sign_in", locale)}</a>
      </p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-bold text-brand mb-6">{t("set.title", locale)}</h1>

      <div className="bg-white border rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{"\uD83D\uDC64"}</span>
          <h2 className="font-bold text-lg">{t("set.account", locale)}</h2>
        </div>
        <div className="text-sm text-gray-600">
          <span className="text-gray-400">{t("set.logged_in_as", locale)}</span>{" "}
          <span className="font-medium">{user.email}</span>
        </div>
      </div>

      <div className="bg-gray-50 border rounded-xl p-5 mt-6 text-sm text-gray-600 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{"\uD83D\uDD11"}</span>
          <p className="font-medium text-gray-700">OpenRouter API Key</p>
        </div>
        <p>{t("set.key_info", locale)}</p>
        <p>
          {t("set.key_get_free", locale)}{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-brand underline font-medium">openrouter.ai/keys</a>{" "}
          {t("set.key_no_cc", locale)}
        </p>
        <p className="text-xs text-gray-400">{t("set.key_selfhost", locale)}</p>
      </div>
    </div>
  );
}
