import type { Locale } from "./index";

const liveKeys: Record<string, Record<Locale, string>> = {
  "live.thinking": { en: "Thinking...", de: "Denkt nach..." },
  "live.waiting": { en: "Waiting for start...", de: "Wartet auf Start..." },
  "live.chars": { en: "characters", de: "Zeichen" },
  "live.starting": { en: "Starting...", de: "Startet..." },
  "live.mod_opening": { en: "Moderator is opening the discussion...", de: "Moderator eroeffnet die Diskussion..." },
  "live.mod_fazit": { en: "Moderator is writing summary...", de: "Moderator erstellt Fazit..." },
  "live.round": { en: "Round", de: "Runde" },
  "live.connected": { en: "Live", de: "Live" },
  "live.connecting": { en: "Connecting...", de: "Verbinde..." },
  "live.thinking_count": { en: "thinking", de: "denkt nach" },
  "live.writing_count": { en: "writing", de: "schreibt" },
  "live.done_count": { en: "done", de: "fertig" },
  "live.loading": { en: "Loading superRun...", de: "Lade superRun..." },
  "live.loading_result": { en: "Loading result...", de: "Lade Ergebnis..." },
  "live.start_button": { en: "Start superRun", de: "superRun starten" },
  "live.completed": { en: "superRun completed!", de: "superRun abgeschlossen!" },
  "live.show_result": { en: "Show Result", de: "Ergebnis anzeigen" },
  "live.new_run": { en: "New superRun", de: "Neuer superRun" },
  "result.mod_summary": { en: "Moderator Summary", de: "Moderator-Fazit" },
  "result.tokens": { en: "Tokens", de: "Tokens" },
  "result.contributions": { en: "contributions", de: "Beitraege" },
  "result.contribution": { en: "contribution", de: "Beitrag" },
  "result.phases": { en: "phases", de: "Phasen" },
  "result.pdf_export": { en: "PDF Export", de: "PDF Export" },
  "result.markdown": { en: "Markdown", de: "Markdown" },
  "result.timeline": { en: "Debate Timeline", de: "Debattenverlauf" },
  "result.share_link": { en: "Share link:", de: "Share-Link:" },
  "result.copy": { en: "Copy", de: "Kopieren" },
};

export default liveKeys;
