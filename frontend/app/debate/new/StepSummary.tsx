"use client";
import { t, localizePersonalityName } from "@/lib/i18n";
import { getStyles, getDecisionModes, getParallelModes } from "@/lib/types";
import type { StepSummaryProps } from "./wizardTypes";

export default function StepSummary(props: StepSummaryProps) {
  const { state, locale, appConfig, sessionApiKey, freeMode, uploadedFile, moderatorModels, error } = props;
  const STYLES = getStyles(locale);
  const DECISION_MODES = getDecisionModes(locale);
  const PARALLEL_MODES = getParallelModes(locale);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-brand">{t("wiz.summary.title", locale)}</h2>

      {/* Config overview */}
      <div className="bg-white rounded-lg border p-5 space-y-3">
        <div><span className="text-sm text-gray-500">{t("wiz.summary.topic", locale)}</span><p className="font-medium">{state.topic}</p></div>
        {state.context && <div><span className="text-sm text-gray-500">{t("wiz.summary.context", locale)}</span><p className="text-sm text-gray-700 max-h-32 overflow-y-auto">{state.context}</p></div>}
        {uploadedFile && <div className="text-sm text-green-700">{t("wiz.summary.document", locale)} {uploadedFile}</div>}
        <div className="flex flex-wrap gap-2">{state.selectedAgents.map((a) => (<span key={a.personalityId} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full text-sm">{a.icon} {localizePersonalityName(a.name, locale)}</span>))}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-500">{t("wiz.summary.rounds", locale)}</span> {state.numRounds}</div>
          <div><span className="text-gray-500">{t("wiz.summary.style", locale)}</span> {STYLES.find((s) => s.value === state.style)?.label}</div>
          <div><span className="text-gray-500">{t("wiz.summary.execution", locale)}</span> {PARALLEL_MODES.find((m) => m.value === state.parallelMode)?.label}</div>
          <div><span className="text-gray-500">{t("wiz.summary.decision", locale)}</span> {DECISION_MODES.find((m) => m.value === state.decisionMode)?.label}</div>
          <div><span className="text-gray-500">{t("wiz.summary.moderator", locale)}</span> {moderatorModels.find((m) => m.value === state.moderatorModel)?.label || state.moderatorModel}</div>
          <div><span className="text-gray-500">{t("wiz.summary.summary_length", locale)}</span> {t(`wiz.params.summary_${state.summaryLength}`, locale)}</div>
        </div>
      </div>

      {/* Key status — compact, one line */}
      {appConfig.demo_mode && (
        <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border ${
          freeMode ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          <span>{freeMode ? "\u2728" : "\uD83D\uDD13"}</span>
          <span>{freeMode ? t("wiz.summary.status_free", locale) : t("wiz.summary.status_own_key", locale)}</span>
        </div>
      )}
      {!appConfig.demo_mode && appConfig.has_global_key && (
        <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border bg-green-50 border-green-200 text-green-700">
          <span>{"\u2705"}</span>
          <span>{t("wiz.summary.status_server_key", locale)}</span>
        </div>
      )}

      {/* Free mode disclaimer */}
      {appConfig.demo_mode && freeMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <span>\u26A0\uFE0F</span>
            <span>{locale === "de" ? "Hinweis zu kostenlosen Modellen" : "About free models"}</span>
          </div>
          <ul className="text-xs text-amber-700 space-y-1.5 ml-6">
            <li>{locale === "de"
              ? "Kostenlose Modelle sind in Geschwindigkeit und Verf\u00FCgbarkeit eingeschr\u00E4nkt. Einzelne Antworten k\u00F6nnen ausfallen oder verz\u00F6gert sein."
              : "Free models have limited speed and availability. Individual responses may fail or be delayed."}</li>
            <li>{locale === "de"
              ? "Die Qualit\u00E4t der Analyse ist geringer als mit Premium-Modellen (Claude, GPT-5.4)."
              : "Analysis quality is lower than with premium models (Claude, GPT-5.4)."}</li>
            <li>{locale === "de"
              ? "F\u00FCr zuverl\u00E4ssigere Ergebnisse: Eigenen OpenRouter-Key in Schritt 1 eingeben und bezahlte Modelle nutzen."
              : "For more reliable results: Enter your own OpenRouter key in Step 1 and use paid models."}</li>
          </ul>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
