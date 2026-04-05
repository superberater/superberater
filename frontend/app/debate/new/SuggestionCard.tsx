"use client";
import { t, localizePersonalityName, findPersonalityDbName } from "@/lib/i18n";
import { getStyles, getDecisionModes, getModeratorModels } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { SuggestionData } from "./wizardTypes";

export default function SuggestionCard({ suggestion, onDismiss, locale }: { suggestion: SuggestionData; onDismiss: () => void; locale: Locale }) {
  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><span className="text-xl">&#x1F4A1;</span><h3 className="font-bold text-amber-900 text-sm">{t("wiz.crew.ai_suggestion", locale)}</h3></div>
        <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600 text-sm">{t("wiz.crew.hide", locale)}</button>
      </div>
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-semibold text-amber-800">{t("wiz.crew.suggested_agents", locale)}</span>
          <div className="mt-1 space-y-1.5">
            {suggestion.suggested_agents.map((a, i) => (
              <div key={i} className="bg-white/60 rounded-lg px-3 py-2 border border-amber-200">
                <div className="font-medium text-amber-900">{localizePersonalityName(findPersonalityDbName(a.name), locale)}</div>
                <div className="text-xs text-amber-700">{a.reason}</div>
                {a.suggested_model && <div className="text-xs text-amber-600 mt-1">&#x1F916; {a.suggested_model} — {a.model_reason}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 rounded-lg px-3 py-2 border border-amber-200"><div className="font-semibold text-amber-800 text-xs">{t("wiz.params.style", locale)}: {getStyles(locale).find(s => s.value === suggestion.suggested_style)?.label || suggestion.suggested_style}</div><div className="text-xs text-amber-700">{suggestion.style_reason}</div></div>
          <div className="bg-white/60 rounded-lg px-3 py-2 border border-amber-200"><div className="font-semibold text-amber-800 text-xs">{t("wiz.params.rounds", locale)}: {suggestion.suggested_rounds}</div><div className="text-xs text-amber-700">{suggestion.rounds_reason}</div></div>
          <div className="bg-white/60 rounded-lg px-3 py-2 border border-amber-200"><div className="font-semibold text-amber-800 text-xs">{t("wiz.params.decision", locale)}: {getDecisionModes(locale).find(m => m.value === suggestion.suggested_decision_mode)?.label || suggestion.suggested_decision_mode}</div><div className="text-xs text-amber-700">{suggestion.decision_reason}</div></div>
          {suggestion.suggested_moderator_model && (<div className="bg-white/60 rounded-lg px-3 py-2 border border-amber-200"><div className="font-semibold text-amber-800 text-xs">&#x2696;&#xFE0F; {getModeratorModels(locale).find(m => m.value === suggestion.suggested_moderator_model)?.label || suggestion.suggested_moderator_model}</div><div className="text-xs text-amber-700">{suggestion.moderator_model_reason}</div></div>)}
        </div>
        <p className="text-xs text-amber-600 italic">{t("wiz.crew.auto_applied", locale)}</p>
      </div>
    </div>
  );
}
