"use client";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  sessionApiKey: string;
  setSessionApiKey: (v: string) => void;
  keyValidated: boolean;
  setKeyValidated: (v: boolean) => void;
  keyValidating: boolean;
  keyError: string;
  setKeyError: (v: string) => void;
  setFreeMode: (v: boolean) => void;
  handleValidateKey: () => void;
  demoMode: boolean;
}

export default function ApiKeyBlock({ locale, sessionApiKey, setSessionApiKey, keyValidated, setKeyValidated, keyValidating, keyError, setKeyError, setFreeMode, handleValidateKey, demoMode }: Props) {
  if (!demoMode) return null;

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 transition-colors ${keyValidated ? "border-emerald-400 bg-emerald-50/50" : "border-blue-300 bg-blue-50/50"}`}>
      {keyValidated ? (
        <div className="flex items-start gap-3">
          <span className="text-lg">{"\uD83D\uDD13"}</span>
          <div className="flex-1">
            <div className="font-semibold text-sm text-emerald-800">{t("wiz.key.validated_title", locale)}</div>
            <div className="text-xs text-emerald-600 mt-0.5">{t("wiz.key.validated_desc", locale)}</div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className="text-lg">{"\u2728"}</span>
          <div className="flex-1">
            <div className="font-semibold text-sm text-blue-800">{t("wiz.key.free_title", locale)}</div>
            <div className="text-xs text-blue-600 mt-0.5">{t("wiz.key.free_desc", locale)}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <input
            type="password"
            value={sessionApiKey}
            onChange={(e) => {
              setSessionApiKey(e.target.value);
              setKeyValidated(false);
              setKeyError("");
              if (!e.target.value.trim()) setFreeMode(true);
            }}
            placeholder="sk-or-v1-..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-light outline-none font-mono bg-white"
            maxLength={200}
            autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Enter" && sessionApiKey.trim().length > 10) handleValidateKey(); }}
          />
        </div>
        <button
          onClick={handleValidateKey}
          disabled={keyValidating || sessionApiKey.trim().length < 10 || keyValidated}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            keyValidated
              ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
              : "bg-brand text-white hover:bg-brand-light disabled:opacity-40"
          }`}
        >
          {keyValidating ? "..." : keyValidated ? "\u2713" : t("wiz.key.validate_btn", locale)}
        </button>
        {(sessionApiKey || keyValidated) && (
          <button
            onClick={() => { setSessionApiKey(""); setKeyValidated(false); setFreeMode(true); setKeyError(""); }}
            className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 border rounded-lg"
          >
            {t("wiz.key.clear_btn", locale)}
          </button>
        )}
      </div>

      {keyError && <p className="text-xs text-red-500">{keyError}</p>}
      {!sessionApiKey && (
        <div className="text-xs text-gray-400">
          {t("wiz.key.get_free", locale)} <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-brand underline">openrouter.ai/keys</a> {t("wiz.key.no_credit_card", locale)}
        </div>
      )}
    </div>
  );
}
