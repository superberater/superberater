"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  getDebate, startDebate, getDebateResult, getExportPdfUrl, getExportMarkdownUrl,
  type AgentInfo, type DebateResult,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t, localizePersonalityName } from "@/lib/i18n";
import { useDebateStream, type AgentStreamState } from "@/hooks/useDebateStream";
import type { StreamingAgent } from "@/lib/types";
import { getRoundLabel, isInterludeRound } from "@/lib/types";

function ThinkingDots({ locale }: { locale: import("@/lib/i18n").Locale }) {
  return (
    <div className="flex items-center gap-2 py-4">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-brand-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-brand-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-brand-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm text-gray-400">{t("live.thinking", locale)}</span>
    </div>
  );
}

function AgentCard({ agent, numRounds, locale }: { agent: AgentStreamState; numRounds: number; locale: import("@/lib/i18n").Locale }) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (agent.status === "streaming" && contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [agent.currentText, agent.status]);

  const isModerator = agent.id === "moderator";
  const borderColor: Record<string, string> = {
    idle: "border-gray-200", thinking: isModerator ? "border-amber-300 shadow-md shadow-amber-50" : "border-yellow-300 shadow-md shadow-yellow-50",
    streaming: isModerator ? "border-amber-400 shadow-lg shadow-amber-100" : "border-blue-400 shadow-lg shadow-blue-100",
    done: "border-green-400", error: "border-red-400",
  };
  const bgColor: Record<string, string> = {
    idle: "bg-white", thinking: "bg-yellow-50/30", streaming: isModerator ? "bg-amber-50/50" : "bg-blue-50/30",
    done: isModerator ? "bg-green-50" : "bg-white", error: "bg-red-50",
  };

  return (
    <div className={`rounded-xl border-2 ${borderColor[agent.status] || "border-gray-200"} ${bgColor[agent.status] || "bg-white"} transition-all duration-300`}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="text-2xl">{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate">{localizePersonalityName(agent.name, locale)}</h3>
          <p className="text-xs text-gray-400 truncate">{agent.model}</p>
        </div>
        {agent.status === "thinking" && <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full animate-pulse">{t("live.thinking", locale)}</span>}
        {agent.status === "streaming" && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" /></span>
            <span className="text-xs text-blue-600 font-medium">Live</span>
          </div>
        )}
        {agent.status === "done" && <span className="text-green-500 text-lg">&#x2713;</span>}
        {agent.status === "idle" && agent.rounds.length > 0 && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{locale === "de" ? "wartet" : "waiting"}</span>}
        {agent.status === "error" && <span className="text-red-500 text-lg">&#x26A0;</span>}
      </div>
      {!isModerator && numRounds > 1 && (
        <div className="px-4 pb-1"><div className="flex gap-1">
          {Array.from({ length: numRounds }).map((_, i) => {
            const rn = i + 1;
            const has = agent.rounds.some(r => r.roundNumber === rn);
            const isCur = agent.currentRound === rn && (agent.status === "streaming" || agent.status === "thinking");
            return <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200"><div className={`h-full rounded-full transition-all duration-500 ${has ? "bg-green-400 w-full" : isCur ? "bg-blue-400 animate-pulse w-3/4" : "w-0"}`} /></div>;
          })}
        </div></div>
      )}
      <div ref={contentRef} className="px-4 pb-4 max-h-[500px] overflow-y-auto">
        {agent.rounds.map((round) => (
          <div key={round.roundNumber} className="mb-3">
            <div className="text-xs font-medium text-gray-400 mb-1">{round.label || getRoundLabel(round.roundNumber, locale)}</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{round.text}</div>
            <hr className="mt-3 border-gray-100" />
          </div>
        ))}
        {agent.status === "thinking" && <ThinkingDots locale={locale} />}
        {agent.currentText && (
          <div>
            {agent.currentRound >= 0 && <div className="text-xs font-medium text-blue-500 mb-1">{getRoundLabel(agent.currentRound, locale)}</div>}
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {agent.currentText}
              {agent.status === "streaming" && <span className="inline-block w-2 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />}
            </div>
          </div>
        )}
        {agent.status === "idle" && agent.rounds.length === 0 && !agent.currentText && (
          <div className="text-sm text-gray-400 italic py-4 text-center">{t("live.waiting", locale)}</div>
        )}
        {agent.error && <p className="text-red-500 mt-2 text-xs bg-red-50 p-2 rounded">{agent.error}</p>}
      </div>
      {agent.totalChars > 0 && <div className="px-4 pb-2 text-xs text-gray-300">{agent.totalChars} {t("live.chars", locale)}</div>}
    </div>
  );
}

/** Compact moderator block for opening and interludes (not the full AgentCard) */
function ModeratorBlock({ agent, roundFilter, locale }: { agent: AgentStreamState; roundFilter?: (rn: number) => boolean; locale: import("@/lib/i18n").Locale }) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (agent.status === "streaming" && contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [agent.currentText, agent.status]);

  const filteredRounds = roundFilter ? agent.rounds.filter(r => roundFilter(r.roundNumber)) : agent.rounds;
  const isActiveForFilter = roundFilter ? roundFilter(agent.currentRound) : true;
  const showThinking = agent.status === "thinking" && isActiveForFilter;
  const showStreaming = agent.currentText && agent.status === "streaming" && isActiveForFilter;

  if (filteredRounds.length === 0 && !showThinking && !showStreaming) return null;

  return (
    <div className={`rounded-xl border-2 transition-all duration-300 ${
      showThinking ? "border-amber-300 shadow-md shadow-amber-50 bg-amber-50/30" :
      showStreaming ? "border-amber-400 shadow-lg shadow-amber-100 bg-amber-50/50" :
      "border-amber-200 bg-gradient-to-r from-amber-50/50 to-white"
    }`}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="text-xl">&#x2696;&#xFE0F;</span>
        <span className="font-bold text-sm text-amber-800">Moderator</span>
        {showThinking && <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">{t("live.thinking", locale)}</span>}
        {showStreaming && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" /></span>
            <span className="text-xs text-amber-600 font-medium">Live</span>
          </div>
        )}
      </div>
      <div ref={contentRef} className="px-4 pb-4 max-h-[400px] overflow-y-auto">
        {filteredRounds.map((round) => (
          <div key={round.roundNumber} className="mb-2">
            <div className="text-xs font-medium text-amber-600 mb-1">{round.label || getRoundLabel(round.roundNumber, locale)}</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{round.text}</div>
          </div>
        ))}
        {showThinking && <ThinkingDots />}
        {showStreaming && (
          <div>
            <div className="text-xs font-medium text-amber-600 mb-1">{getRoundLabel(agent.currentRound, locale)}</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {agent.currentText}
              <span className="inline-block w-2 h-4 bg-amber-500 ml-0.5 animate-pulse rounded-sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

function LiveStatusBar({ currentRound, numRounds, isConnected, totalTokens, elapsedSec, agentStates, locale }: {
  currentRound: number; numRounds: number; isConnected: boolean; totalTokens: number; elapsedSec: number; agentStates: Map<string, AgentStreamState>; locale: import("@/lib/i18n").Locale;
}) {
  const activeCount = Array.from(agentStates.values()).filter(a => a.id !== "moderator" && a.status === "streaming").length;
  const thinkingCount = Array.from(agentStates.values()).filter(a => a.id !== "moderator" && a.status === "thinking").length;
  const doneCount = Array.from(agentStates.values()).filter(a => a.id !== "moderator" && a.rounds.some(r => r.roundNumber >= 1 && r.roundNumber <= 49)).length;
  const totalAgents = Array.from(agentStates.values()).filter(a => a.id !== "moderator").length;
  const mod = agentStates.get("moderator");
  const modActive = mod?.status === "streaming" || mod?.status === "thinking";
  const modRound = mod?.currentRound ?? -1;

  let statusText = t("live.starting", locale);
  if (modActive && modRound === 0) statusText = t("live.mod_opening", locale);
  else if (modActive && isInterludeRound(modRound)) statusText = `Moderator: ${getRoundLabel(modRound, locale)}`;
  else if (modActive && modRound === 99) statusText = t("live.mod_fazit", locale);
  else if (currentRound > 0) statusText = `${t("live.round", locale)} ${currentRound} / ${numRounds}`;

  return (
    <div className="bg-white border rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
        </span>
        <span className="text-sm font-medium">{isConnected ? t("live.connected", locale) : t("live.connecting", locale)}</span>
      </div>
      <div className="h-4 w-px bg-gray-200" />
      <div className="text-sm text-gray-500">{statusText}</div>
      <div className="h-4 w-px bg-gray-200" />
      <div className="text-sm text-gray-500">
        {thinkingCount > 0 && <span className="text-yellow-600">{thinkingCount} {t("live.thinking_count", locale)} &middot; </span>}
        {activeCount > 0 ? <span className="text-blue-600">{activeCount} {locale === "de" ? (activeCount > 1 ? "schreiben" : "schreibt") : "writing"}</span> : !modActive && thinkingCount === 0 ? <span>{doneCount}/{totalAgents} {t("live.done_count", locale)}</span> : null}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>{formatTime(elapsedSec)}</span>
        <span>~{totalTokens} Tokens</span>
      </div>
    </div>
  );
}

/** Simple markdown-ish renderer: headings, bold, lists */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-sm text-gray-700">{listItems.map((li, j) => <li key={j}>{renderInline(li)}</li>)}</ul>);
      listItems = [];
    }
  };

  const renderInline = (s: string) => {
    // Bold: **text**
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flushList(); elements.push(<div key={`br-${i}`} className="h-2" />); continue; }
    if (line.startsWith('## ')) { flushList(); elements.push(<h3 key={`h-${i}`} className="font-bold text-base text-gray-800 mt-4 mb-1">{line.slice(3)}</h3>); continue; }
    if (line.startsWith('# ')) { flushList(); elements.push(<h2 key={`h-${i}`} className="font-bold text-lg text-gray-900 mt-4 mb-2">{line.slice(2)}</h2>); continue; }
    if (line.match(/^[-*]\s/)) { listItems.push(line.replace(/^[-*]\s/, '')); continue; }
    if (line.match(/^\d+\.\s/)) { listItems.push(line.replace(/^\d+\.\s/, '')); continue; }
    flushList();
    elements.push(<p key={`p-${i}`} className="text-sm text-gray-700 leading-relaxed">{renderInline(line)}</p>);
  }
  flushList();
  return <>{elements}</>;
}

function ResultView({ result, locale }: { result: DebateResult; locale: import("@/lib/i18n").Locale }) {
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const rounds = new Map<number, typeof result.messages>();
  result.messages.forEach((m) => { if (!rounds.has(m.round_number)) rounds.set(m.round_number, []); rounds.get(m.round_number)!.push(m); });
  const sortedRounds = Array.from(rounds.entries()).sort(([a], [b]) => a - b);
  const toggleRound = (rn: number) => {
    setCollapsedRounds(prev => { const next = new Set(prev); if (next.has(rn)) next.delete(rn); else next.add(rn); return next; });
  };

  return (
    <div className="space-y-6">
      {/* Moderator Fazit — prominent at top */}
      {result.moderator_summary && (
        <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 rounded-xl overflow-hidden">
          <div className="bg-amber-100/60 px-6 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="text-2xl">&#x2696;&#xFE0F;</span>
            <h2 className="text-lg font-bold text-amber-900">{t("result.mod_summary", locale)}</h2>
          </div>
          <div className="px-6 py-5">{renderMarkdown(result.moderator_summary)}</div>
        </div>
      )}

      {/* Stats + Export bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-50 rounded-lg px-4 py-3">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{result.total_tokens.toLocaleString()} Tokens</span>
          <span>~${(result.total_cost_cents / 100).toFixed(2)}</span>
          <span>{result.messages.length} {t("result.contributions", locale)}</span>
          <span>{rounds.size} {t("result.phases", locale)}</span>
        </div>
        <div className="flex gap-2">
          <a href={getExportPdfUrl(result.debate.id)} target="_blank" className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm hover:bg-red-100 transition-colors">{t("result.pdf_export", locale)}</a>
          <a href={getExportMarkdownUrl(result.debate.id)} target="_blank" className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors">{t("result.markdown", locale)}</a>
        </div>
      </div>

      {/* Full debate timeline */}
      <div>
        <h3 className="font-bold text-gray-700 mb-4 text-lg">{t("result.timeline", locale)}</h3>
        <div className="space-y-4">
          {sortedRounds.map(([roundNum, msgs]) => {
            const label = getRoundLabel(roundNum, locale);
            const isMod = roundNum === 0 || roundNum === 99 || isInterludeRound(roundNum);
            const isCollapsed = collapsedRounds.has(roundNum);

            return (
              <div key={roundNum} className={`rounded-xl border overflow-hidden ${
                isMod ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'
              }`}>
                {/* Round header */}
                <button onClick={() => toggleRound(roundNum)} className={`w-full text-left px-5 py-3 flex justify-between items-center transition-colors ${
                  isMod ? 'hover:bg-amber-100/50' : 'hover:bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {isMod && <span className="text-base">&#x2696;&#xFE0F;</span>}
                    <span className={`font-semibold text-sm ${isMod ? 'text-amber-800' : 'text-gray-700'}`}>{label}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{msgs.length} {msgs.length === 1 ? t("result.contribution", locale) : t("result.contributions", locale)}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{isCollapsed ? '\u25BC' : '\u25B2'}</span>
                </button>

                {/* Round content — open by default */}
                {!isCollapsed && (
                  <div className={`px-5 pb-4 space-y-3 ${isMod ? '' : 'border-t border-gray-100'}`}>
                    {msgs.map((m) => (
                      <div key={m.id} className={`rounded-lg p-4 ${
                        isMod ? 'bg-white/60' : 'bg-gray-50/50 border border-gray-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{m.agent_icon}</span>
                          <span className="font-semibold text-sm text-gray-800">{localizePersonalityName(m.agent_name, locale)}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{m.model_used.split('/').pop()}</span>
                        </div>
                        <div className="pl-8">{renderMarkdown(m.content)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Share link */}
      {result.share_token && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm flex items-center gap-3">
          <span className="text-gray-500">{t("result.share_link", locale)}</span>
          <code className="text-xs bg-white px-2 py-1 rounded border flex-1 truncate">{typeof window !== 'undefined' ? window.location.origin : ''}/debate/shared/{result.share_token}</code>
          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/debate/shared/${result.share_token}`)} className="text-xs text-brand hover:underline">{t("result.copy", locale)}</button>
        </div>
      )}
    </div>
  );
}

export default function DebatePage() {
  const params = useParams();
  const debateId = params.id as string;
  const { loading: authLoading } = useAuth();
  const { locale } = useLocale();
  const [debate, setDebate] = useState<any>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "live" | "done">("loading");
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<StreamingAgent[]>([]);
  const { agentStates, isConnected, isComplete, currentRound, totalTokens, elapsedSec, connect } = useDebateStream(agents);

  // Wait for auth to load before making API calls (token must be set first)
  useEffect(() => {
    if (authLoading) return;
    getDebate(debateId).then((d) => {
      setDebate(d);
      if (d.status === "completed") {
        setPhase("done");
        getDebateResult(debateId).then(setResult);
      } else if (d.status === "running") {
        // Already started (e.g. from wizard) — go directly to live view
        const runningAgents = (d.agents || []).map((a: AgentInfo) => ({
          id: a.id, name: a.name, icon: a.icon, model: a.model,
          text: "", status: "idle" as const, roundNumber: 0,
        }));
        setAgents(runningAgents);
        setPhase("live");
        setTimeout(() => connect(debateId), 200);
      } else {
        setPhase("ready");
      }
    }).catch((e) => setError(e.message));
  }, [debateId, authLoading]);

  useEffect(() => {
    if (isComplete && phase === "live") {
      getDebateResult(debateId).then(setResult).catch(() => {});
    }
  }, [isComplete, phase, debateId]);

  const handleShowResult = () => {
    setPhase("done");
    if (!result) {
      getDebateResult(debateId).then(setResult);
    }
  };

  const handleStart = async () => {
    setError("");
    try {
      const res = await startDebate(debateId);
      setAgents(res.agents.map((a: AgentInfo) => ({ id: a.id, name: a.name, icon: a.icon, model: a.model, text: "", status: "idle" as const, roundNumber: 0 })));
      setPhase("live");
      setTimeout(() => connect(debateId), 200);
    } catch (e: any) { setError(e.message); }
  };

  // Helper: check if moderator has content for specific round types
  const mod = agentStates.get("moderator");
  const hasModOpening = mod && (mod.rounds.some(r => r.roundNumber === 0) || (mod.currentRound === 0 && (mod.status === "streaming" || mod.status === "thinking")));
  const hasModInterludes = mod && (mod.rounds.some(r => isInterludeRound(r.roundNumber)) || (isInterludeRound(mod.currentRound) && (mod.status === "streaming" || mod.status === "thinking")));
  const hasModFinal = mod && (mod.rounds.some(r => r.roundNumber === 99) || (mod.currentRound === 99 && (mod.status === "streaming" || mod.status === "thinking")));

  if (error) return (
    <div className="text-center py-10"><p className="text-red-500 mb-4">{error}</p><a href="/debate/new" className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-light">{t("live.new_run", locale)}</a></div>
  );
  if (phase === "loading") return (
    <div className="text-center py-20"><div className="inline-block w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /><p className="text-gray-500 mt-4">{t("live.loading", locale)}</p></div>
  );

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-brand">{debate?.topic}</h1>{debate?.context && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{debate.context}</p>}</div>

      {phase === "ready" && (
        <div className="text-center py-10">
          <div className="mb-6 flex flex-wrap justify-center gap-3">
            {debate?.agents?.map((a: AgentInfo) => (
              <div key={a.id} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl shadow-sm">
                <span className="text-xl">{a.icon}</span><div className="text-left"><div className="text-sm font-medium">{localizePersonalityName(a.name, locale)}</div><div className="text-xs text-gray-400">{a.model}</div></div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mb-4">{debate?.num_rounds} {t("round.round", locale)}{debate?.num_rounds > 1 ? (locale === "de" ? "n" : "s") : ""} &middot; {debate?.style} &middot; {debate?.parallel_mode}</p>
          <button onClick={handleStart} className="px-10 py-4 bg-brand-accent text-white rounded-xl text-lg font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:scale-105">{t("live.start_button", locale)}</button>
        </div>
      )}

      {phase === "live" && (
        <div>
          <LiveStatusBar currentRound={currentRound} numRounds={debate?.num_rounds || 2} isConnected={isConnected} totalTokens={totalTokens} elapsedSec={elapsedSec} agentStates={agentStates} locale={locale} />

          {/* Moderator Opening (above agent cards) */}
          {hasModOpening && mod && (
            <div className="mb-4">
              <ModeratorBlock agent={mod} roundFilter={(rn) => rn === 0} locale={locale} />
            </div>
          )}

          {/* Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(agentStates.values()).filter((a) => a.id !== "moderator").map((agent) => (
              <AgentCard key={agent.id} agent={agent} numRounds={debate?.num_rounds || 2} locale={locale} />
            ))}
          </div>

          {/* Moderator Interludes (between rounds, below agent cards) */}
          {hasModInterludes && mod && (
            <div className="mt-4">
              <ModeratorBlock agent={mod} roundFilter={(rn) => isInterludeRound(rn)} locale={locale} />
            </div>
          )}

          {/* Moderator Final Summary */}
          {hasModFinal && mod && (
            <div className="mt-6">
              <ModeratorBlock agent={mod} roundFilter={(rn) => rn === 99} locale={locale} />
            </div>
          )}

          {isComplete && (
            <div className="mt-6 bg-green-50 border-2 border-green-300 rounded-xl p-5 text-center">
              <div className="text-2xl mb-2">&#x2705;</div>
              <p className="text-green-800 font-semibold mb-3">{t("live.completed", locale)}</p>
              <button onClick={handleShowResult} className="px-8 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-light transition-colors shadow-md">
                {t("live.show_result", locale)}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "done" && result && <ResultView result={result} locale={locale} />}
      {phase === "done" && !result && (
        <div className="text-center py-20"><div className="inline-block w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /><p className="text-gray-500 mt-4">{t("live.loading_result", locale)}</p></div>
      )}
    </div>
  );
}
