"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { generatePersonality } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { ModelOption } from "@/lib/api";
import type { SelectedAgent } from "@/lib/types";

const EMOJI_OPTIONS = ["\uD83E\uDD16", "\uD83E\uDDD1\u200D\uD83D\uDCBB", "\uD83D\uDC68\u200D\uD83D\uDD2C", "\uD83D\uDC69\u200D\uD83C\uDFEB", "\uD83E\uDDD1\u200D\uD83C\uDFA8", "\uD83D\uDC68\u200D\u2696\uFE0F", "\uD83D\uDC69\u200D\uD83D\uDCBC", "\uD83E\uDDD9", "\uD83E\uDD13", "\uD83D\uDE80", "\uD83D\uDCA1", "\uD83C\uDFAF", "\uD83D\uDD0D", "\u2699\uFE0F", "\uD83C\uDF0D", "\uD83D\uDEE1\uFE0F"];

interface Props { open: boolean; onClose: () => void; onAdd: (agent: SelectedAgent, saveToDb: boolean) => void; models: ModelOption[]; locale: Locale; }

export default function CustomModal({ open, onClose, onAdd, models, locale }: Props) {
  const [tab, setTab] = useState<"manual" | "generate">("manual");
  const [form, setForm] = useState({ name: "", icon: "\uD83E\uDD16", description: "", systemPrompt: "" });
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-haiku-4.5");
  const [temperature, setTemperature] = useState(0.7);
  const [saveToDb, setSaveToDb] = useState(false);
  const [error, setError] = useState("");
  const [domain, setDomain] = useState(""); const [trait, setTrait] = useState("");
  const [generating, setGenerating] = useState(false); const [generated, setGenerated] = useState(false);
  if (!open) return null;

  const canAdd = form.name.length >= 2 && form.description.length >= 5 && form.systemPrompt.length >= 50;

  const handleGenerate = async () => {
    if (domain.length < 3 || trait.length < 3) { setError(locale === "de" ? "Min. 3 Zeichen." : "Min. 3 chars."); return; }
    setGenerating(true); setError("");
    try { const r = await generatePersonality(domain, trait); setForm({ name: r.name || "Agent", icon: r.icon || "\uD83E\uDD16", description: r.description || "", systemPrompt: r.system_prompt || "" }); if (r.default_temperature) setTemperature(r.default_temperature); setGenerated(true); setTab("manual"); }
    catch (e: any) { setError(e.message || "Failed"); } finally { setGenerating(false); }
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ personalityId: `custom-${Date.now()}`, name: form.name, icon: form.icon, systemPrompt: form.systemPrompt, model: selectedModel, temperature, sortOrder: 0 }, saveToDb);
    setForm({ name: "", icon: "\uD83E\uDD16", description: "", systemPrompt: "" }); setDomain(""); setTrait(""); setGenerated(false); setSaveToDb(false); setError(""); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b"><h2 className="text-lg font-bold text-brand">{t("modal.title", locale)}</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>
        <div className="flex gap-1 mx-6 mt-4 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab("manual")} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "manual" ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}>{generated ? t("modal.tab_edit", locale) : t("modal.tab_manual", locale)}</button>
          <button onClick={() => setTab("generate")} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "generate" ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}>{t("modal.tab_generate", locale)}</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {tab === "generate" && (<>
            <p className="text-sm text-gray-500">{t("modal.gen_desc", locale)}</p>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.gen_domain", locale)}</label><input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={t("modal.gen_domain_placeholder", locale)} className="w-full px-3 py-2 border rounded-lg text-sm" maxLength={100} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.gen_trait", locale)}</label><input type="text" value={trait} onChange={(e) => setTrait(e.target.value)} placeholder={t("modal.gen_trait_placeholder", locale)} className="w-full px-3 py-2 border rounded-lg text-sm" maxLength={100} /></div>
            <button onClick={handleGenerate} disabled={generating || domain.length < 3 || trait.length < 3} className="w-full py-2.5 bg-brand text-white rounded-lg font-semibold text-sm disabled:opacity-40">{generating ? "..." : t("modal.gen_button", locale)}</button>
            {generated && <p className="text-sm text-green-600">{t("modal.gen_done", locale)}</p>}
          </>)}
          {tab === "manual" && (<>
            <div className="flex gap-3 items-end">
              <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.name", locale)}</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" maxLength={100} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.icon", locale)}</label><div className="flex flex-wrap gap-1 max-w-[180px]">{EMOJI_OPTIONS.map((e) => (<button key={e} onClick={() => setForm({ ...form, icon: e })} className={`w-8 h-8 rounded text-lg flex items-center justify-center ${form.icon === e ? "bg-brand/10 ring-2 ring-brand" : "hover:bg-gray-100"}`}>{e}</button>))}</div></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.description", locale)} (min. 5)</label><input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" maxLength={200} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.system_prompt", locale)} (min. 50)</label><textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm h-32 resize-none" maxLength={2000} /><p className="text-xs text-gray-400 mt-0.5">{form.systemPrompt.length}/2000</p></div>
            <div className="flex gap-3">
              <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">{t("modal.model", locale)}</label><select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2 bg-gray-50">{models.map((m) => (<option key={m.value} value={m.value}>{m.label} ({m.cost})</option>))}</select></div>
              <div className="w-24"><label className="block text-sm font-medium text-gray-700 mb-1">Temp.</label><input type="number" value={temperature} onChange={(e) => setTemperature(Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))} step={0.1} min={0} max={1} className="w-full text-sm border rounded-lg px-3 py-2" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={saveToDb} onChange={(e) => setSaveToDb(e.target.checked)} className="rounded border-gray-300" />{t("modal.save_permanent", locale)}</label>
          </>)}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5 pt-2 border-t"><button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600">{t("modal.cancel", locale)}</button><button onClick={handleAdd} disabled={!canAdd} className="px-6 py-2 bg-brand-accent text-white rounded-lg text-sm font-semibold disabled:opacity-30">{t("modal.add_to_crew", locale)}</button></div>
      </div>
    </div>
  );
}
