"use client";
import { t, localizePersonalityName, localizePersonalityDesc, findPersonalityDbName } from "@/lib/i18n";
import { TIER_COLORS, TIER_LABELS, getPersonalityTier } from "@/lib/types";
import SuggestionCard from "./SuggestionCard";
import type { StepCrewProps } from "./wizardTypes";

export default function StepCrew(props: StepCrewProps) {
  const { state, setState, locale, appConfig, freeMode, models, personalities, toggleAgent, removeAgent, suggestion, showSuggestion, setShowSuggestion, suggesting, showCustomModal, setShowCustomModal, handleAddCustomAgent } = props;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-brand">{t("wiz.crew.title", locale)}</h2>

      {/* Free mode reminder */}
      {appConfig.demo_mode && freeMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
          <span>{"\u2728"}</span>
          <span>{locale === "de" ? `Free-Modus: Maximal 3 Agenten (${state.selectedAgents.length}/3 ausgewaehlt)` : `Free mode: Maximum 3 agents (${state.selectedAgents.length}/3 selected)`}</span>
        </div>
      )}

      {/* AI suggesting */}
      {suggesting && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
          <div className="flex items-center justify-center gap-3"><div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin" /><span className="text-sm text-amber-800 font-medium">{t("wiz.crew.ai_analyzing", locale)}</span></div>
        </div>
      )}

      {/* Suggestion card */}
      {!suggesting && suggestion && showSuggestion && (
        <SuggestionCard suggestion={suggestion} onDismiss={() => setShowSuggestion(false)} locale={locale} />
      )}

      <p className="text-gray-600">{t("wiz.crew.desc", locale)}</p>

      {/* Personality grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {personalities.map((p) => {
          const selected = state.selectedAgents.some((a) => a.personalityId === p.id);
          const maxAgents = (appConfig.demo_mode && freeMode) ? 3 : 8;
          const atLimit = !selected && state.selectedAgents.length >= maxAgents;
          return (
            <button key={p.id} onClick={() => !atLimit && toggleAgent(p)} className={`text-left p-3 rounded-lg border-2 transition-all ${selected ? "border-brand bg-blue-50 shadow-sm" : atLimit ? "border-gray-100 opacity-40 cursor-not-allowed" : "border-gray-200 hover:border-gray-400"}`}>
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className="font-semibold text-sm">{localizePersonalityName(p.name, locale)}</div>
              <div className="text-xs text-gray-500 line-clamp-2">{localizePersonalityDesc(p.description, locale)}</div>
            </button>
          );
        })}
        <button onClick={() => { const maxAgents = (appConfig.demo_mode && freeMode) ? 3 : 8; if (state.selectedAgents.length < maxAgents) setShowCustomModal(true); }} className={`text-left p-3 rounded-lg border-2 border-dashed transition-all ${state.selectedAgents.length >= ((appConfig.demo_mode && freeMode) ? 3 : 8) ? "border-gray-200 opacity-40 cursor-not-allowed" : "border-brand-accent/50 hover:border-brand-accent hover:bg-red-50/30"}`}>
          <div className="text-2xl mb-1">&#x2795;</div>
          <div className="font-semibold text-sm text-brand-accent">{t("wiz.crew.custom", locale)}</div>
          <div className="text-xs text-gray-500">{t("wiz.crew.custom_desc", locale)}</div>
        </button>
      </div>

      {/* Selected agents with model dropdowns */}
      {state.selectedAgents.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">{t("wiz.crew.your_crew", locale)} ({state.selectedAgents.length}/{(appConfig.demo_mode && freeMode) ? 3 : 8}):</h3>
          {state.selectedAgents.map((a, i) => {
            const isCustom = a.personalityId?.startsWith("custom-") || !personalities.find((p) => p.id === a.personalityId);
            const tierInfo = getPersonalityTier(a.name, locale);
            const recTier = tierInfo?.tier || (isCustom ? "" : "standard");
            const tierColor = recTier ? (TIER_COLORS[recTier] || "") : "";
            const tierLabel = recTier ? (TIER_LABELS[recTier] || "Standard") : "";
            const sugAgent = suggestion?.suggested_agents.find(sa => findPersonalityDbName(sa.name) === a.name || sa.name === a.name);
            return (
              <div key={a.personalityId} className="bg-white rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{a.icon}</span>
                  <span className="font-medium text-sm flex-1">{localizePersonalityName(a.name, locale)}</span>
                  {isCustom && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Custom</span>}
                  <button onClick={() => removeAgent(a.personalityId)} className="text-red-400 hover:text-red-600 text-lg">x</button>
                </div>
                {recTier && <div className="flex items-center gap-2 flex-wrap"><span className={`text-xs px-2 py-0.5 rounded-full border ${tierColor}`}>{t("wiz.crew.recommended", locale)}: {tierLabel}</span></div>}
                {sugAgent?.model_reason && <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">&#x1F4A1; {sugAgent.model_reason}</div>}
                <select value={a.model} onChange={(e) => { const updated = [...state.selectedAgents]; updated[i] = { ...a, model: e.target.value }; setState((prev) => ({ ...prev, selectedAgents: updated })); }} className="w-full text-sm border rounded px-3 py-1.5 bg-gray-50">
                  {models.some((m) => m.tier === "free") && <optgroup label={"\u2728 Free"}>{models.filter((m) => m.tier === "free").map((m) => (<option key={m.value} value={m.value}>{m.label} (free)</option>))}</optgroup>}
                  {!(appConfig.demo_mode && freeMode) && <>
                    <optgroup label="Budget">{models.filter((m) => m.tier === "budget").map((m) => (<option key={m.value} value={m.value}>{m.label} ({m.cost})</option>))}</optgroup>
                    <optgroup label="Standard">{models.filter((m) => m.tier === "standard").map((m) => (<option key={m.value} value={m.value}>{m.label} ({m.cost})</option>))}</optgroup>
                    <optgroup label="Premium">{models.filter((m) => m.tier === "premium").map((m) => (<option key={m.value} value={m.value}>{m.label} ({m.cost})</option>))}</optgroup>
                  </>}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
