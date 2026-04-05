"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t, findPersonalityDbName } from "@/lib/i18n";
import {
  getPersonalities, getModels, createDebate, startDebate, uploadFile, suggestSetup, createPersonality, getAppConfig, validateOpenRouterKey,
  type Personality, type AgentConfig, type ModelOption, type AppConfig,
} from "@/lib/api";
import { getModeratorModels, getFreeModeratorModels, type WizardState, type SelectedAgent } from "@/lib/types";
import type { SuggestionData } from "./wizardTypes";
import StepTopic from "./StepTopic";
import StepCrew from "./StepCrew";
import StepParams from "./StepParams";
import StepSummary from "./StepSummary";
import CustomModal from "./CustomModal";

const defaultWizard: WizardState = {
  topic: "", context: "", language: "en", selectedAgents: [], numRounds: 2,
  style: "structured", parallelMode: "hybrid", decisionMode: "best_solution",
  maxTokens: 300, moderatorModel: "anthropic/claude-sonnet-4.6",
  moderatorSystemPrompt: "", activeModerator: true, summaryLength: "medium",
};

export default function NewDebatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLocale();

  // ── State ──
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(defaultWizard);
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showModPrompt, setShowModPrompt] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const suggestedForTopic = useRef("");
  const [freeMode, setFreeMode] = useState(false);
  const [sessionApiKey, setSessionApiKey] = useState("");
  const [keyValidated, setKeyValidated] = useState(false);
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [appConfig, setAppConfig] = useState<AppConfig>({ demo_mode: false, has_global_key: false, default_moderator_model: "anthropic/claude-sonnet-4.6", default_agent_model: "anthropic/claude-haiku-4.5" });

  const STEPS = [t("wiz.step.topic", locale), t("wiz.step.crew", locale), t("wiz.step.params", locale), t("wiz.step.start", locale)];
  const MODERATOR_MODELS = (appConfig.demo_mode && freeMode) ? getFreeModeratorModels(locale) : getModeratorModels(locale, true);

  // ── Auth + Init ──
  useEffect(() => { if (!authLoading && !user) router.push("/auth/login"); }, [authLoading, user, router]);
  useEffect(() => { setState((prev) => ({ ...prev, language: locale })); }, [locale]);
  useEffect(() => {
    getPersonalities().then(setPersonalities).catch(() => {});
    getModels(true).then(setModels).catch(() => {});
    getAppConfig().then(cfg => {
      setAppConfig(cfg);
      setState(prev => ({ ...prev, moderatorModel: cfg.default_moderator_model }));
      if (cfg.demo_mode) setFreeMode(true);
    }).catch(() => {});
  }, []);

  // ── Free mode: enforce constraints ──
  useEffect(() => {
    if (appConfig.demo_mode && freeMode) {
      setState(prev => ({
        ...prev,
        maxTokens: 200,
        summaryLength: "short",
        parallelMode: "sequential",
        numRounds: Math.min(prev.numRounds, 2),
        // Trim agents to max 3 in free mode
        selectedAgents: prev.selectedAgents.length > 3 ? prev.selectedAgents.slice(0, 3) : prev.selectedAgents,
      }));
    }
  }, [freeMode, appConfig.demo_mode]);

  // ── Handlers ──
  const canNext = () => { if (step === 0) return state.topic.length >= 20; if (step === 1) return state.selectedAgents.length >= 2; return true; };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError("");
    try { const r = await uploadFile(file); const lbl = locale === "de" ? "Aus Dokument" : "From document"; setState((prev) => ({ ...prev, context: prev.context ? prev.context + `\n\n--- ${lbl}: ${r.filename} ---\n` + r.text : `--- ${lbl}: ${r.filename} ---\n` + r.text })); setUploadedFile(r.filename); }
    catch (e: any) { setError(e.message || "Upload failed"); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleValidateKey = async () => {
    const key = sessionApiKey.trim();
    if (!key || key.length < 10) { setKeyError(locale === "de" ? "Key zu kurz" : "Key too short"); return; }
    setKeyValidating(true); setKeyError("");
    try { const r = await validateOpenRouterKey(key); if (r.valid) { setKeyValidated(true); setFreeMode(false); } else { setKeyError(r.error || "Invalid"); } }
    catch (e: any) { setKeyError(e.message || "Failed"); } finally { setKeyValidating(false); }
  };

  const applySuggestion = (s: SuggestionData) => {
    const freeModel = appConfig.default_agent_model || "qwen/qwen3-coder:free";
    const maxAgents = (appConfig.demo_mode && freeMode) ? 3 : 8;
    let agents: SelectedAgent[] = [];
    for (const sa of (s.suggested_agents || [])) {
      if (agents.length >= maxAgents) break;
      // Map suggested name (could be English or German) back to DB name
      const dbName = findPersonalityDbName(sa.name);
      const p = personalities.find((p) => p.name === dbName || p.name === sa.name);
      if (p && agents.length < 8) {
        let model = sa.suggested_model || p.default_model;
        if (appConfig.demo_mode && freeMode && !model.includes(":free")) model = freeModel;
        agents.push({ personalityId: p.id, name: p.name, icon: p.icon, systemPrompt: p.system_prompt, model, temperature: p.default_temperature, sortOrder: agents.length });
      }
    }
    setState((prev) => ({ ...prev, selectedAgents: agents.length >= 2 ? agents : prev.selectedAgents, style: (s.suggested_style as any) || prev.style, numRounds: s.suggested_rounds ? Math.min(5, Math.max(1, s.suggested_rounds)) : prev.numRounds, decisionMode: (s.suggested_decision_mode as any) || prev.decisionMode, moderatorModel: s.suggested_moderator_model || prev.moderatorModel }));
  };

  const handleNext = async () => {
    if (step === 0 && state.topic.length >= 20) {
      if (suggestedForTopic.current !== state.topic && personalities.length > 0) {
        suggestedForTopic.current = state.topic; setSuggesting(true); setStep(1);
        try { const data = await suggestSetup(state.topic, state.context, state.language, sessionApiKey.trim() || undefined); const s = data.suggestion as SuggestionData; if (s?.suggested_agents) { setSuggestion(s); setShowSuggestion(true); applySuggestion(s); } }
        catch {} finally { setSuggesting(false); }
      } else { setStep(1); }
    } else { setStep(step + 1); }
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const agents: AgentConfig[] = state.selectedAgents.map((a, i) => ({ personality_id: a.personalityId?.startsWith("custom-") ? undefined : a.personalityId || undefined, name: a.name, icon: a.icon, system_prompt: a.systemPrompt, model: a.model, temperature: a.temperature, max_tokens: state.maxTokens, sort_order: i }));
      const debate = await createDebate({ topic: state.topic, context: state.context, language: state.language, agents, num_rounds: state.numRounds, style: state.style, parallel_mode: state.parallelMode, decision_mode: state.decisionMode, moderator_model: state.moderatorModel, moderator_system_prompt: state.moderatorSystemPrompt, active_moderator: state.activeModerator, summary_length: state.summaryLength });
      const opts: any = {}; if (freeMode) opts.free_mode = true; if (sessionApiKey.trim()) opts.session_api_key = sessionApiKey.trim();
      await startDebate(debate.id, opts);
      router.push(`/debate/${debate.id}`);
    } catch (e: any) { setError(e.message || "Error"); } finally { setLoading(false); }
  };

  const toggleAgent = (p: Personality) => {
    setState((prev) => {
      if (prev.selectedAgents.find((a) => a.personalityId === p.id)) return { ...prev, selectedAgents: prev.selectedAgents.filter((a) => a.personalityId !== p.id) };
      const maxAgents = (appConfig.demo_mode && freeMode) ? 3 : 8;
      if (prev.selectedAgents.length >= maxAgents) return prev;
      let model = p.default_model;
      if (appConfig.demo_mode && freeMode && !model.includes(":free")) model = appConfig.default_agent_model || "qwen/qwen3-coder:free";
      return { ...prev, selectedAgents: [...prev.selectedAgents, { personalityId: p.id, name: p.name, icon: p.icon, systemPrompt: p.system_prompt, model, temperature: p.default_temperature, sortOrder: prev.selectedAgents.length }] };
    });
  };

  const removeAgent = (id: string) => setState((prev) => ({ ...prev, selectedAgents: prev.selectedAgents.filter((a) => a.personalityId !== id) }));

  const handleAddCustomAgent = async (agent: SelectedAgent, saveToDb: boolean) => {
    const maxAgents = (appConfig.demo_mode && freeMode) ? 3 : 8;
    if (state.selectedAgents.length >= maxAgents) return;
    if (saveToDb) { try { const saved = await createPersonality({ name: agent.name, icon: agent.icon, description: agent.name, system_prompt: agent.systemPrompt, default_model: agent.model, default_temperature: agent.temperature }); agent = { ...agent, personalityId: saved.id }; getPersonalities().then(setPersonalities).catch(() => {}); } catch {} }
    setState((prev) => ({ ...prev, selectedAgents: [...prev.selectedAgents, { ...agent, sortOrder: prev.selectedAgents.length }] }));
  };

  // ── Render ──
  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (<div key={s} className="flex items-center gap-2"><button onClick={() => i <= step && setStep(i)} className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-colors ${i === step ? "bg-brand text-white" : i < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>{i < step ? "\u2713" : i + 1}</button><span className={`text-sm ${i === step ? "font-semibold text-brand" : "text-gray-500"}`}>{s}</span>{i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}</div>))}
      </div>

      {step === 0 && <StepTopic state={state} setState={setState} locale={locale} appConfig={appConfig} freeMode={freeMode} models={models} sessionApiKey={sessionApiKey} setSessionApiKey={setSessionApiKey} keyValidated={keyValidated} setKeyValidated={setKeyValidated} keyValidating={keyValidating} keyError={keyError} setKeyError={setKeyError} setFreeMode={setFreeMode} handleValidateKey={handleValidateKey} uploading={uploading} uploadedFile={uploadedFile} handleFileUpload={handleFileUpload} fileRef={fileRef} error={error} />}
      {step === 1 && <StepCrew state={state} setState={setState} locale={locale} appConfig={appConfig} freeMode={freeMode} models={models} personalities={personalities} toggleAgent={toggleAgent} removeAgent={removeAgent} suggestion={suggestion} showSuggestion={showSuggestion} setShowSuggestion={setShowSuggestion} suggesting={suggesting} showCustomModal={showCustomModal} setShowCustomModal={setShowCustomModal} handleAddCustomAgent={handleAddCustomAgent} />}
      {step === 2 && <StepParams state={state} setState={setState} locale={locale} appConfig={appConfig} freeMode={freeMode} models={models} suggestion={suggestion} showModPrompt={showModPrompt} setShowModPrompt={setShowModPrompt} moderatorModels={MODERATOR_MODELS} />}
      {step === 3 && <StepSummary state={state} setState={setState} locale={locale} appConfig={appConfig} freeMode={freeMode} models={models} sessionApiKey={sessionApiKey} uploadedFile={uploadedFile} moderatorModels={MODERATOR_MODELS} error={error} loading={loading} handleSubmit={handleSubmit} />}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30">{t("wiz.back", locale)}</button>
        {step < STEPS.length - 1 ? (
          <button onClick={handleNext} disabled={!canNext() || suggesting} className="px-6 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-light disabled:opacity-30 transition-colors">
            {suggesting ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("wiz.analyzing", locale)}</span> : t("wiz.next", locale)}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="px-8 py-2 rounded-lg bg-brand-accent text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">{loading ? t("wiz.creating", locale) : t("wiz.start_run", locale)}</button>
        )}
      </div>

      <CustomModal open={showCustomModal} onClose={() => setShowCustomModal(false)} onAdd={handleAddCustomAgent} models={models} locale={locale} />
    </div>
  );
}
