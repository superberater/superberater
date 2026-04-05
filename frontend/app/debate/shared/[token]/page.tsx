"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getSharedDebate } from "@/lib/api";
import { useLocale } from "@/hooks/useLocale";
import { localizePersonalityName } from "@/lib/i18n";

export default function SharedDebatePage() {
  const params = useParams();
  const token = params.token as string;
  const { locale } = useLocale();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  useEffect(() => {
    getSharedDebate(token).then(setData).catch((e) => setError(e.message));
  }, [token]);

  if (error) return <div className="text-center py-20"><p className="text-red-500 text-lg">{error}</p></div>;
  if (!data) return <div className="text-center py-10 text-gray-400">Lade geteilten Crew Run...</div>;

  const rounds = new Map<number, any[]>();
  data.messages.forEach((m: any) => {
    const key = m.round_number;
    if (!rounds.has(key)) rounds.set(key, []);
    rounds.get(key)!.push(m);
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Geteilter Crew Run (read-only)</span>
      </div>
      <h1 className="text-2xl font-bold text-brand mb-2">{data.topic}</h1>
      {data.context && <p className="text-sm text-gray-500 mb-4">{data.context}</p>}
      <div className="flex flex-wrap gap-2 mb-6">
        {data.agents?.map((a: any, i: number) => (
          <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full text-sm">{a.icon} {localizePersonalityName(a.name, locale)}</span>
        ))}
      </div>
      {data.moderator_summary && (
        <div className="bg-gradient-to-r from-brand/5 to-brand-light/5 border-2 border-brand/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">&#x2696;&#xFE0F;</span>
            <h2 className="text-xl font-bold text-brand">Moderator-Fazit</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap">{data.moderator_summary}</div>
        </div>
      )}
      <h3 className="font-bold text-gray-700 mb-3">Verlauf</h3>
      {Array.from(rounds.entries()).sort(([a], [b]) => a - b).map(([roundNum, msgs]) => (
        <div key={roundNum} className="mb-2">
          <button onClick={() => setExpandedRound(expandedRound === roundNum ? null : roundNum)}
            className="w-full text-left px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 flex justify-between items-center">
            <span className="font-medium text-sm">
              {roundNum === 99 ? "Moderator-Fazit" : `Runde ${roundNum}`}
              <span className="text-gray-400 ml-2">({msgs.length} Beitraege)</span>
            </span>
            <span className="text-gray-400">{expandedRound === roundNum ? "\u25B2" : "\u25BC"}</span>
          </button>
          {expandedRound === roundNum && (
            <div className="mt-2 space-y-2 pl-4">
              {msgs.map((m: any) => (
                <div key={m.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{m.agent_icon}</span>
                    <span className="font-semibold text-sm">{localizePersonalityName(m.agent_name, locale)}</span>
                    <span className="text-xs text-gray-400">{m.model_used}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="text-xs text-gray-400 mt-6 text-center">
        Erstellt mit CrewAI &middot; {data.total_tokens} Tokens
      </div>
    </div>
  );
}
