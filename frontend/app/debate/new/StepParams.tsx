"use client";
import { t } from "@/lib/i18n";
import { DEFAULT_MODERATOR_PROMPT, getStyles, getDecisionModes, getParallelModes } from "@/lib/types";
import type { StepParamsProps } from "./wizardTypes";

export default function StepParams(props: StepParamsProps) {
  const { state, setState, locale, appConfig, freeMode, suggestion, showModPrompt, setShowModPrompt, moderatorModels } = props;
  const STYLES = getStyles(locale);
  const DECISION_MODES = getDecisionModes(locale);
  const PARALLEL_MODES = getParallelModes(locale);
  const isFreeMode = appConfig.demo_mode && freeMode;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-brand">{t("wiz.params.title", locale)}</h2>

      {isFreeMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
          <span>{"\u2728"}</span>
          <span>{locale === "de" ? "Free-Modus aktiv: Antwortlaenge und Ausfuehrung sind optimiert fuer kostenlose Modelle (kurze Antworten, sequenziell, max. 2 Runden)." : "Free mode active: Response length and execution are optimized for free models (short answers, sequential, max 2 rounds)."}</span>
        </div>
      )}

      {suggestion && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
          {suggestion.style_reason && <div>&#x1F4A1; <strong>{t("wiz.params.style", locale)}:</strong> {suggestion.style_reason}</div>}
          {suggestion.rounds_reason && <div>&#x1F4A1; <strong>{t("wiz.params.rounds", locale)}:</strong> {suggestion.rounds_reason}</div>}
          {suggestion.decision_reason && <div>&#x1F4A1; <strong>{t("wiz.params.decision", locale)}:</strong> {suggestion.decision_reason}</div>}
        </div>
      )}

      {/* Rounds */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("wiz.params.rounds", locale)}: {state.numRounds}{isFreeMode ? ` (max. 2)` : ""}</label>
        <input type="range" min={1} max={isFreeMode ? 2 : 5} value={state.numRounds} onChange={(e) => setState((prev) => ({ ...prev, numRounds: parseInt(e.target.value) }))} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400"><span>{t("wiz.params.rounds_fast", locale)}</span><span>{t("wiz.params.rounds_deep", locale)}</span></div>
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("wiz.params.style", locale)}</label>
        <div className="grid grid-cols-2 gap-2">{STYLES.map((s) => (<button key={s.value} onClick={() => setState((prev) => ({ ...prev, style: s.value }))} className={`text-left p-3 rounded-lg border-2 text-sm ${state.style === s.value ? "border-brand bg-blue-50" : "border-gray-200"}`}><div className="font-semibold">{s.label}</div><div className="text-xs text-gray-500">{s.desc}</div></button>))}</div>
      </div>

      {/* Execution */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("wiz.params.execution", locale)}</label>
        {isFreeMode ? (
          <div className="p-3 rounded-lg border-2 border-brand bg-blue-50 text-sm">
            <div className="font-semibold">{locale === "de" ? "Sequenziell" : "Sequential"}</div>
            <div className="text-xs text-gray-500">{locale === "de" ? "Im Free-Modus fest eingestellt um Rate-Limits zu vermeiden" : "Fixed in free mode to avoid rate limits"}</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">{PARALLEL_MODES.map((m) => (<button key={m.value} onClick={() => setState((prev) => ({ ...prev, parallelMode: m.value }))} className={`text-left p-3 rounded-lg border-2 text-sm ${state.parallelMode === m.value ? "border-brand bg-blue-50" : "border-gray-200"}`}><div className="font-semibold">{m.label}</div><div className="text-xs text-gray-500">{m.desc}</div></button>))}</div>
        )}
      </div>

      {/* Decision Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("wiz.params.decision", locale)}</label>
        <div className="grid grid-cols-2 gap-2">{DECISION_MODES.map((m) => (<button key={m.value} onClick={() => setState((prev) => ({ ...prev, decisionMode: m.value }))} className={`text-left p-3 rounded-lg border-2 text-sm ${state.decisionMode === m.value ? "border-brand bg-blue-50" : "border-gray-200"}`}><div className="font-semibold">{m.label}</div><div className="text-xs text-gray-500">{m.desc}</div></button>))}</div>
      </div>

      {/* Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("wiz.params.tokens", locale)}: {state.maxTokens}</label>
        {isFreeMode ? (
          <div className="text-sm text-gray-500 bg-gray-50 border rounded px-3 py-2">200 ({t("wiz.params.short", locale)}) — {locale === "de" ? "im Free-Modus fest" : "fixed in free mode"}</div>
        ) : (
          <select value={state.maxTokens} onChange={(e) => setState((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) }))} className="border rounded px-3 py-2">
            <option value={200}>200 ({t("wiz.params.short", locale)})</option>
            <option value={300}>300 ({t("wiz.params.standard", locale)})</option>
            <option value={500}>500 ({t("wiz.params.detailed", locale)})</option>
            <option value={800}>800 ({t("wiz.params.very_detailed", locale)})</option>
          </select>
        )}
      </div>

      {/* Summary Length */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("wiz.params.summary_length", locale)}</label>
        {isFreeMode ? (
          <div className="p-3 rounded-lg border-2 border-brand bg-blue-50 text-sm">
            <div className="font-semibold">{t("wiz.params.summary_short", locale)}</div>
            <div className="text-xs text-gray-500">{locale === "de" ? "Im Free-Modus fest eingestellt" : "Fixed in free mode"}</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(["short", "medium", "long"] as const).map((len) => (
              <button key={len} onClick={() => setState((prev) => ({ ...prev, summaryLength: len }))} className={`text-left p-3 rounded-lg border-2 text-sm ${state.summaryLength === len ? "border-brand bg-blue-50" : "border-gray-200"}`}>
                <div className="font-semibold">{t(`wiz.params.summary_${len}`, locale)}</div>
                <div className="text-xs text-gray-500">{t(`wiz.params.summary_${len}_desc`, locale)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Moderator */}
      <div className="border-t pt-5 mt-5">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="text-lg font-bold text-brand flex items-center gap-2">&#x2696;&#xFE0F; Moderator</h3><p className="text-xs text-gray-400 mt-0.5">{t("wiz.params.mod_desc", locale)}</p></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-500">{state.activeModerator ? t("wiz.params.mod_active", locale) : t("wiz.params.mod_passive", locale)}</span>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${state.activeModerator ? "bg-brand" : "bg-gray-300"}`} onClick={() => setState((prev) => ({ ...prev, activeModerator: !prev.activeModerator }))}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${state.activeModerator ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </label>
        </div>
        {state.activeModerator && <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">{t("wiz.params.mod_active_desc", locale)}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("wiz.params.mod_model", locale)}</label>
            <select value={state.moderatorModel} onChange={(e) => setState((prev) => ({ ...prev, moderatorModel: e.target.value }))} className="border rounded px-3 py-2 w-full">
              {moderatorModels.map((m) => (<option key={m.value} value={m.value}>{m.label} ({m.cost}) {m.recommended ? "\u2B50" : ""}</option>))}
            </select>
            {moderatorModels.find((m) => m.value === state.moderatorModel)?.reason && <p className="text-xs text-gray-400 mt-1">{moderatorModels.find((m) => m.value === state.moderatorModel)?.reason}</p>}
          </div>
          <div>
            <button onClick={() => setShowModPrompt(!showModPrompt)} className="text-sm text-brand hover:underline flex items-center gap-1">{showModPrompt ? "\u25B2" : "\u25BC"} {t("wiz.params.mod_prompt", locale)} {state.moderatorSystemPrompt ? t("wiz.params.mod_prompt_custom", locale) : t("wiz.params.mod_prompt_default", locale)}</button>
            {showModPrompt && (
              <div className="mt-2">
                <textarea value={state.moderatorSystemPrompt || DEFAULT_MODERATOR_PROMPT} onChange={(e) => setState((prev) => ({ ...prev, moderatorSystemPrompt: e.target.value === DEFAULT_MODERATOR_PROMPT ? "" : e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm h-28 resize-none focus:ring-2 focus:ring-brand-light outline-none" maxLength={3000} />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-400">{(state.moderatorSystemPrompt || DEFAULT_MODERATOR_PROMPT).length}/3000</p>
                  {state.moderatorSystemPrompt && <button onClick={() => setState((prev) => ({ ...prev, moderatorSystemPrompt: "" }))} className="text-xs text-gray-400 hover:text-gray-600">{t("wiz.params.mod_prompt_reset", locale)}</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
