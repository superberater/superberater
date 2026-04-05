"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getAllStreamUrl } from "@/lib/api";
import type { StreamingAgent } from "@/lib/types";
import { getRoundLabel } from "@/lib/types";

interface StreamEvent {
  token?: string;
  agent_id?: string;
  agent_name?: string;
  agent_icon?: string;
  round_number?: number;
  done?: boolean;
  error?: string;
  status?: string;
  keepalive?: boolean;
  connected?: boolean;
  round?: number;
  elapsed?: number;
}

interface RoundMessage {
  roundNumber: number;
  text: string;
  status: "streaming" | "done" | "error";
  label: string;
}

export interface AgentStreamState {
  id: string;
  name: string;
  icon: string;
  model: string;
  rounds: RoundMessage[];
  currentText: string;
  currentRound: number;
  status: "idle" | "thinking" | "streaming" | "done" | "error";
  error?: string;
  totalChars: number;
}

/** Check if this is a moderator round (opening=0, interlude=50-90, final=99) */
function isModeratorRound(rn: number): boolean {
  return rn === 0 || rn === 99 || (rn >= 50 && rn <= 90);
}

export function useDebateStream(agents: StreamingAgent[]) {
  const [agentStates, setAgentStates] = useState<Map<string, AgentStreamState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef(false);

  useEffect(() => {
    if (agents.length === 0) return;
    const map = new Map<string, AgentStreamState>();
    agents.forEach((a) => map.set(a.id, {
      id: a.id, name: a.name, icon: a.icon, model: a.model,
      rounds: [], currentText: "", currentRound: 0, status: "idle", totalChars: 0,
    }));
    map.set("moderator", {
      id: "moderator", name: "Moderator", icon: "\u2696\uFE0F", model: "",
      rounds: [], currentText: "", currentRound: 0, status: "idle", totalChars: 0,
    });
    setAgentStates(map);
  }, [agents]);

  const connect = useCallback((debateId: string) => {
    if (!debateId || esRef.current) return;
    completeRef.current = false;

    const url = getAllStreamUrl(debateId);
    console.log("[SSE] Connecting to", url);
    const es = new EventSource(url);
    esRef.current = es;
    setElapsedSec(0);

    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);

    es.onopen = () => {
      console.log("[SSE] Connection opened");
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      const raw = event.data;
      if (raw === "[DONE]") {
        console.log("[SSE] Stream complete");
        completeRef.current = true;
        setIsComplete(true);
        setIsConnected(false);
        es.close();
        esRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      try {
        const parsed: StreamEvent = JSON.parse(raw);
        if (parsed.connected) { setIsConnected(true); return; }
        if (parsed.keepalive) {
          if (parsed.round) setCurrentRound(parsed.round);
          return;
        }

        const agentId = parsed.agent_id;
        if (!agentId) return;

        setAgentStates((prev) => {
          const next = new Map(prev);
          const current = next.get(agentId);

          if (!current) {
            if (agentId === "moderator" || parsed.agent_name) {
              next.set(agentId, {
                id: agentId, name: parsed.agent_name || "Unknown",
                icon: parsed.agent_icon || "\uD83E\uDD16", model: "",
                rounds: [], currentText: parsed.token || "",
                currentRound: parsed.round_number || 0,
                status: parsed.status === "thinking" ? "thinking" : parsed.done ? "done" : "streaming",
                totalChars: (parsed.token || "").length,
              });
            }
            return next;
          }

          const roundNum = parsed.round_number ?? current.currentRound;

          // Status-only events (thinking, moderating, round_start)
          if (parsed.status && !parsed.token && !parsed.done) {
            next.set(agentId, {
              ...current, currentRound: roundNum,
              status: (parsed.status === "thinking" || parsed.status === "moderating") ? "thinking" : current.status,
            });
            return next;
          }

          if (parsed.done) {
            const completedRound: RoundMessage = {
              roundNumber: roundNum, text: current.currentText,
              status: parsed.error ? "error" : "done",
              label: getRoundLabel(roundNum),
            };
            const updatedRounds = [...current.rounds];
            const idx = updatedRounds.findIndex(r => r.roundNumber === roundNum);
            if (idx >= 0) updatedRounds[idx] = completedRound;
            else if (current.currentText.length > 0) updatedRounds.push(completedRound);

            // Moderator stays "idle" after opening/interlude, "done" after final (99)
            const isFinalMod = agentId === "moderator" && roundNum === 99;
            const isNonFinalMod = agentId === "moderator" && roundNum !== 99;

            next.set(agentId, {
              ...current, rounds: updatedRounds, currentText: "",
              currentRound: roundNum,
              status: isFinalMod ? "done" : isNonFinalMod ? "idle" : (roundNum === 99 ? "done" : "idle"),
              error: parsed.error,
            });
          } else if (parsed.token) {
            next.set(agentId, {
              ...current, currentText: current.currentText + parsed.token,
              currentRound: roundNum, status: "streaming",
              totalChars: current.totalChars + parsed.token.length,
            });
          }
          return next;
        });

        // Track debate round (only real rounds 1-N, not moderator rounds)
        if (parsed.round_number && parsed.round_number >= 1 && parsed.round_number <= 49)
          setCurrentRound((prev) => Math.max(prev, parsed.round_number || 0));
        if (parsed.token) setTotalTokens((prev) => prev + 1);
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      console.log("[SSE] Error, reconnecting in 2s...");
      setIsConnected(false);
      es.close();
      esRef.current = null;
      setTimeout(() => { if (!completeRef.current) connect(debateId); }, 2000);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsConnected(false);
  }, []);

  useEffect(() => { return () => disconnect(); }, [disconnect]);

  return { agentStates, isConnected, isComplete, currentRound, totalTokens, elapsedSec, connect, disconnect };
}
