"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { t, type Locale } from "@/lib/i18n";
import { GITHUB_LICENSE_URL, GITHUB_REPO_URL } from "@/lib/links";

/* ═══════════════════════════════════════════════════
   Animated Example Run (Live Demo section)
   ═══════════════════════════════════════════════════ */
function ExampleRun({ locale }: { locale: Locale }) {
  const agents = useMemo(() => [
    { icon: "♟️", name: locale === "de" ? "Stratege" : "Strategist", model: "GPT-5.4", text: locale === "de" ? "Remote-First eröffnet Zugang zu globalem Talent-Pool und reduziert Bürokosten um ~40%. Aber: Die Unternehmenskultur zu erhalten wird deutlich schwieriger. Wir riskieren Fragmentierung der Teams und Verlust von informellem Wissensaustausch." : "Remote-first opens access to a global talent pool and reduces office costs by ~40%. But: maintaining company culture becomes significantly harder. We risk team fragmentation and loss of informal knowledge exchange." },
    { icon: "🔍", name: locale === "de" ? "Skeptiker" : "Skeptic", model: "Claude Sonnet 4.6", text: locale === "de" ? "Die 40% Kosteneinsparung ist irreführend. Home-Office-Zuschuss, Co-Working-Spaces und versteckte Koordinationskosten werden komplett übersehen. Realistisch sind maximal 15% Netto-Einsparung im ersten Jahr." : "The 40% cost savings are misleading. Home office stipends, co-working spaces, and coordination overhead are being ignored. Realistically, net savings cap at 15% in year one." },
    { icon: "📊", name: "CFO", model: "GPT-5.4 Mini", text: locale === "de" ? "Kündigung Büromietvertrag spart 1.2M EUR/Jahr. Equipment-Budget pro Mitarbeiter steigt auf 3K EUR. Netto-Einsparung erst ab Jahr 2, aber dann signifikant und skalierbar auf weitere Standorte." : "Office lease termination saves $1.2M/year. Equipment budget per employee rises to $3K. Net savings materialize after year 2, but then become significant and scalable across locations." },
    { icon: "⚙️", name: locale === "de" ? "Pragmatiker" : "Pragmatist", model: "Claude Haiku 4.5", text: locale === "de" ? "Statt komplett Remote: Hybrid-Modell. 3 Tage Remote, 2 im Büro. Quick Win in 4 Wochen umsetzbar, Ergebnisse nach 90 Tagen messbar. Geringes Risiko, hoher Informationsgewinn für die nächste Entscheidung." : "Instead of full remote: hybrid model. 3 days remote, 2 in office. Quick win in 4 weeks, results measurable after 90 days. Low risk, high information gain for the next decision." },
  ], [locale]);

  const [visibleChars, setVisibleChars] = useState([0, 0, 0, 0]);
  const [showSummary, setShowSummary] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animStarted = useRef(false);

  useEffect(() => { setVisibleChars([0, 0, 0, 0]); setShowSummary(false); animStarted.current = false; }, [locale]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animStarted.current) {
          animStarted.current = true;
          setVisibleChars([0, 0, 0, 0]);
          setShowSummary(false);
          startTyping();
        }
      });
    }, { threshold: 0.3 });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [agents]);

  function startTyping() {
    const counts = [0, 0, 0, 0];
    const speeds = [3, 2, 2, 3];
    const delays = [0, 60, 120, 180];
    let totalTicks = 0;

    function tick() {
      totalTicks++;
      let allDone = true;
      for (let i = 0; i < 4; i++) {
        if (counts[i] < agents[i].text.length) {
          if (totalTicks * 2 >= delays[i]) {
            counts[i] = Math.min(counts[i] + speeds[i], agents[i].text.length);
          }
          allDone = false;
        }
      }
      setVisibleChars([...counts]);
      if (allDone) {
        setTimeout(() => setShowSummary(true), 300);
        return;
      }
      requestAnimationFrame(() => setTimeout(tick, 25));
    }
    tick();
  }

  return (
    <div ref={containerRef} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-semibold mb-0.5">{t("example.tag", locale)}</div>
          <div className="text-sm font-semibold text-gray-800">{t("example.topic", locale)}</div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-accent bg-red-50 px-3 py-1 rounded-full">{t("example.tag", locale)}</span>
      </div>
      {/* Moderator opening */}
      <div className="mx-5 mt-4 mb-3 p-4 rounded-xl bg-blue-50/60 border-l-[3px] border-brand-light">
        <div className="text-[10px] uppercase tracking-[0.15em] text-brand-light font-semibold mb-1">{t("example.mod_opening", locale)}</div>
        <p className="text-xs text-gray-600 leading-relaxed">{t("example.mod_opening_text", locale)}</p>
      </div>
      {/* Agent grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 pb-3">
        {agents.map((agent, i) => (
          <div key={i} className={`rounded-xl border p-4 transition-all duration-300 ${visibleChars[i] > 0 ? "border-gray-200 shadow-sm bg-white" : "border-gray-100 opacity-40 bg-gray-50/50"}`}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="text-lg">{agent.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-xs text-gray-800">{agent.name}</span>
                <span className="text-[10px] text-gray-400 ml-1.5 font-mono">{agent.model}</span>
              </div>
              {visibleChars[i] > 0 && visibleChars[i] < agent.text.length && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-brand-light opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-brand-light" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed min-h-[3rem]">
              {agent.text.slice(0, visibleChars[i])}
              {visibleChars[i] > 0 && visibleChars[i] < agent.text.length && <span className="inline-block w-[2px] h-3 bg-brand-light ml-0.5 animate-pulse" />}
            </p>
          </div>
        ))}
      </div>
      {/* Summary */}
      <div className={`mx-5 mb-5 p-4 rounded-xl border-l-[3px] border-brand-accent bg-red-50/40 transition-all duration-500 ${showSummary ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
        <div className="text-[10px] uppercase tracking-[0.15em] text-brand-accent font-semibold mb-1">{t("example.summary_label", locale)}</div>
        <p className="text-xs text-gray-600 italic leading-relaxed">{t("example.summary_text", locale)}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Hero Preview (right side of hero)
   ═══════════════════════════════════════════════════ */
function HeroPreview({ locale }: { locale: Locale }) {
  const agents = [
    { icon: "♟️", name: locale === "de" ? "Stratege" : "Strategist", model: "GPT-5.4", color: "bg-brand-light", delay: "200" },
    { icon: "🔍", name: locale === "de" ? "Skeptiker" : "Skeptic", model: "Claude 4.6", color: "bg-brand-accent", delay: "400" },
    { icon: "📊", name: "CFO", model: "Gemini", color: "bg-amber-500", delay: "600" },
    { icon: "⚙️", name: locale === "de" ? "Pragmatiker" : "Pragmatist", model: "DeepSeek", color: "bg-emerald-500", delay: "800" },
  ];
  const widths = ["w-[85%]", "w-[65%]", "w-[90%]", "w-[72%]"];

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <span className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-semibold">{t("hero.preview.title", locale)}</span>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t("hero.preview.live", locale)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {agents.map((a, i) => (
          <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-lg p-3 animate-fade-in-up" style={{ animationDelay: `${a.delay}ms` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{a.icon}</span>
              <div>
                <div className="text-[10px] font-semibold text-white/70">{a.name}</div>
                <div className="text-[8px] text-white/25 font-mono">{a.model}</div>
              </div>
            </div>
            <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full rounded-full ${a.color} animate-bar-fill ${widths[i]}`} style={{ animationDelay: `${parseInt(a.delay) + 200}ms` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 p-3 rounded-lg bg-brand-accent/[0.08] border border-brand-accent/[0.15] animate-fade-in-up" style={{ animationDelay: "1200ms" }}>
        <div className="text-[8px] uppercase tracking-[0.15em] text-brand-accent font-semibold mb-1">{t("hero.preview.recommendation", locale)}</div>
        <div className="text-[10px] text-white/40 leading-relaxed">{t("hero.preview.text", locale)}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════════════════ */
export default function Home() {
  const { user } = useAuth();
  const { locale } = useLocale();

  const useCases = [
    { key: "strategy", icon: "📐", bg: "bg-blue-50" },
    { key: "finance", icon: "💰", bg: "bg-amber-50" },
    { key: "tech", icon: "🏗️", bg: "bg-emerald-50" },
    { key: "people", icon: "👥", bg: "bg-pink-50" },
    { key: "risk", icon: "⚖️", bg: "bg-violet-50" },
    { key: "product", icon: "🚀", bg: "bg-orange-50" },
  ];

  const features = [
    { key: "agents", icon: "🎭" },
    { key: "models", icon: "🤖" },
    { key: "moderator", icon: "🎯" },
    { key: "streaming", icon: "⚡" },
    { key: "upload", icon: "📎" },
    { key: "export", icon: "📤" },
  ];

  const modelLogos = [
    { name: "Claude", sub: "Anthropic", letter: "A", cls: "bg-amber-100 text-amber-600" },
    { name: "GPT-5.4", sub: "OpenAI", letter: "G", cls: "bg-emerald-100 text-emerald-700" },
    { name: "Gemini", sub: "Google", letter: "G", cls: "bg-blue-100 text-blue-700" },
    { name: "DeepSeek", sub: "DeepSeek AI", letter: "D", cls: "bg-violet-100 text-violet-700" },
  ];

  return (
    <div className="-mx-4 -mt-6">

      {/* ════════════════ HERO ════════════════ */}
      <section className="relative bg-gradient-to-b from-brand via-[#0F1B33] to-[#0A1628] overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        {/* Glow effects */}
        <div className="absolute inset-0">
          <div className="absolute left-[10%] bottom-[20%] w-[600px] h-[400px] bg-brand-light/[0.08] rounded-full blur-[120px]" />
          <div className="absolute right-[10%] top-[10%] w-[500px] h-[300px] bg-brand-accent/[0.05] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-24 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 px-4 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/50 font-medium tracking-wide">{t("hero.badge", locale)}</span>
            </div>

            <h1 className="text-[44px] md:text-[52px] font-bold text-white leading-[1.08] tracking-tight mb-5">
              {t("hero.h1.line1", locale)}<br />
              <span className="text-brand-accent">{t("hero.h1.line2", locale)}</span><br />
              <span className="font-light text-brand-light">{t("hero.h1.line3", locale)}</span>
            </h1>

            <p className="text-[15px] md:text-[17px] text-white/[0.45] leading-relaxed mb-9 max-w-lg">
              {t("hero.subtitle", locale)}
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              {user ? (
                <a href="/debate/new" className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-accent text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-brand-accent/30 hover:shadow-xl hover:shadow-brand-accent/40 hover:-translate-y-0.5">
                  {t("hero.cta", locale)} →
                </a>
              ) : (
                <a href="/auth/login" className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-accent text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-brand-accent/30 hover:shadow-xl hover:shadow-brand-accent/40 hover:-translate-y-0.5">
                  {t("hero.cta_login", locale)} →
                </a>
              )}
              <a href="#demo" className="inline-flex items-center gap-2 px-7 py-3.5 text-white/60 border border-white/[0.12] rounded-xl text-sm font-medium hover:border-white/25 hover:text-white transition-all">
                ▶ {t("hero.demo", locale)}
              </a>
            </div>

            {/* Trust bar */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/25">
              {["Claude", "GPT-5.4", "Gemini", "DeepSeek"].map(m => (
                <span key={m} className="px-3 py-1 rounded-md bg-white/[0.05] border border-white/[0.07] font-mono text-white/35">{m}</span>
              ))}
              <span className="text-white/20 mx-1">·</span>
              <span>{t("hero.opensource", locale)}</span>
            </div>
          </div>

          {/* Right — Hero Preview (hidden on mobile) */}
          <div className="hidden lg:block">
            <HeroPreview locale={locale} />
          </div>
        </div>
      </section>

      {/* ════════════════ VALUE PROPOSITION ════════════════ */}
      <section className="bg-white border-b border-gray-200 py-20 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand-accent font-semibold mb-4">{t("value.label", locale)}</div>
          <h2 className="text-2xl md:text-[32px] font-bold text-brand mb-4 tracking-tight">{t("value.title", locale)}</h2>
          <p className="text-[15px] text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed">{t("value.subtitle", locale)}</p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_40px_1fr] gap-0 max-w-3xl mx-auto items-stretch">
            {/* Old way */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-left">
              <h3 className="text-sm font-semibold text-gray-400 mb-5">{t("value.old.title", locale)}</h3>
              <div className="space-y-3.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="flex items-start gap-3 text-[13px] text-gray-500 pb-3.5 border-b border-gray-100 last:border-0 last:pb-0">
                    <span className="text-gray-300 font-bold text-sm flex-shrink-0">✕</span>
                    <span>{t(`value.old.${n}`, locale)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VS */}
            <div className="hidden md:flex items-center justify-center text-xs font-bold text-gray-300">vs</div>

            {/* New way */}
            <div className="bg-gradient-to-br from-brand to-[#0F1B33] border border-brand-light/20 rounded-2xl p-8 text-left shadow-xl shadow-brand/10 mt-4 md:mt-0">
              <h3 className="text-sm font-semibold text-brand-accent mb-5">{t("value.new.title", locale)}</h3>
              <div className="space-y-3.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="flex items-start gap-3 text-[13px] text-white/60 pb-3.5 border-b border-white/[0.06] last:border-0 last:pb-0">
                    <span className="text-emerald-400 font-bold text-sm flex-shrink-0">✓</span>
                    <span>{t(`value.new.${n}`, locale)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ USE CASES ════════════════ */}
      <section id="use-cases" className="bg-gray-50 border-b border-gray-200 py-20 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand-light font-semibold mb-4 text-center">{t("cases.label", locale)}</div>
          <h2 className="text-2xl md:text-[28px] font-bold text-brand mb-12 text-center tracking-tight">{t("cases.title", locale)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map(uc => (
              <div key={uc.key} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-brand-light hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                <div className={`w-10 h-10 ${uc.bg} rounded-lg flex items-center justify-center text-lg mb-3.5`}>{uc.icon}</div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{t(`case.${uc.key}.title`, locale)}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{t(`case.${uc.key}.desc`, locale)}</p>
                <div className="text-[11px] text-gray-400 italic bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-brand-light">{t(`case.${uc.key}.example`, locale)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ LIVE DEMO ════════════════ */}
      <section id="demo" className="bg-white border-b border-gray-200 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand-accent font-semibold mb-4 text-center">{t("example.label", locale)}</div>
          <h2 className="text-2xl md:text-[28px] font-bold text-brand mb-2 text-center tracking-tight">{t("example.title", locale)}</h2>
          <p className="text-sm text-gray-400 text-center mb-10">{t("example.subtitle", locale)}</p>
          <ExampleRun locale={locale} />
        </div>
      </section>

      {/* ════════════════ HOW IT WORKS ════════════════ */}
      <section className="bg-brand py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand-accent font-semibold mb-4 text-center">{t("how.label", locale)}</div>
          <h2 className="text-2xl md:text-[28px] font-bold text-white mb-12 text-center tracking-tight">{t("how.title", locale)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="text-center">
                <div className="w-11 h-11 rounded-xl bg-brand-accent/[0.12] border border-brand-accent/25 flex items-center justify-center text-lg font-bold text-brand-accent mx-auto mb-3.5">{n}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{t(`how.step${n}.title`, locale)}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{t(`how.step${n}.desc`, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section id="features" className="bg-gray-50 border-y border-gray-200 py-20 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand-light font-semibold mb-4 text-center">{t("features.label", locale)}</div>
          <h2 className="text-2xl md:text-[28px] font-bold text-brand mb-12 text-center tracking-tight">{t("features.title", locale)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.key} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-brand-light hover:shadow-sm transition-all">
                <div className="text-xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{t(`feat.${f.key}.title`, locale)}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t(`feat.${f.key}.desc`, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ MODELS BAR ════════════════ */}
      <section className="bg-white border-b border-gray-200 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-6">{t("models.label", locale)}</div>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {modelLogos.map(m => (
              <div key={m.name} className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-xl ${m.cls} flex items-center justify-center text-lg font-bold`}>{m.letter}</div>
                <span className="text-[11px] font-semibold text-gray-600">{m.name}</span>
                <span className="text-[9px] text-gray-400">{m.sub}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-lg font-bold">✦</div>
              <span className="text-[11px] font-semibold text-gray-600">{t("models.free", locale)}</span>
              <span className="text-[9px] text-gray-400">{t("models.free_sub", locale)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ CTA FINAL ════════════════ */}
      <section className="relative bg-gradient-to-br from-brand to-[#0F1B33] py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[600px] h-[400px] bg-brand-accent/[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-[32px] font-bold text-white mb-3 tracking-tight">{t("cta.title", locale)}</h2>
          <p className="text-[15px] text-white/40 mb-8 leading-relaxed">{t("cta.subtitle", locale)}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {user ? (
              <a href="/debate/new" className="px-10 py-4 bg-brand-accent text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-brand-accent/30 hover:shadow-xl hover:shadow-brand-accent/40">
                {t("hero.cta", locale)} →
              </a>
            ) : (
              <>
                <a href="/auth/signup" className="px-10 py-4 bg-brand-accent text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-brand-accent/30 hover:shadow-xl hover:shadow-brand-accent/40">
                  {t("cta.signup", locale)}
                </a>
                <a href="/auth/login" className="px-8 py-4 text-white/60 border border-white/15 rounded-xl text-sm font-medium hover:text-white hover:border-white/30 transition-all">
                  {t("hero.cta_login", locale)}
                </a>
              </>
            )}
          </div>
          <p className="mt-5 text-xs text-white/25">{t("cta.free_note", locale)}</p>
        </div>
      </section>

      {/* ════════════════ DEMO DISCLAIMER ════════════════ */}
      <section className="bg-gray-100 border-y border-gray-200 py-6 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-xs text-gray-500 leading-relaxed">{t("footer.demo_disclaimer", locale)}</p>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="bg-gray-900 py-12 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            {/* Brand */}
            <div>
              <div className="text-white font-bold text-lg tracking-tight mb-1">super<span className="text-brand-accent">berater</span></div>
              <div className="text-gray-500 text-xs mb-3">Multi-Agent Decision Engine</div>
              <div className="text-gray-600 text-[10px] leading-relaxed max-w-[280px]">{t("footer.brand_desc", locale)}</div>
            </div>

            {/* Links */}
            <div className="flex gap-12 text-xs">
              <div className="space-y-2">
                <div className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-3">{locale === "de" ? "Projekt" : "Project"}</div>
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-gray-300 transition-colors">
                  {t("footer.link_github", locale)}
                </a>
                <a href={GITHUB_LICENSE_URL} target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-gray-300 transition-colors">
                  {t("footer.link_license", locale)}
                </a>
                <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-gray-300 transition-colors">OpenRouter API</a>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-3">{locale === "de" ? "Rechtliches" : "Legal"}</div>
                <a href="/impressum" className="block text-gray-500 hover:text-gray-300 transition-colors">{locale === "de" ? "Impressum" : "Legal Notice"}</a>
                <a href="/datenschutz" className="block text-gray-500 hover:text-gray-300 transition-colors">{locale === "de" ? "Datenschutz" : "Privacy Policy"}</a>
                <a href="https://superlab.rocks" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-gray-300 transition-colors">superLab GmbH</a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-gray-600">
            <span>&copy; 2026 superLAB GmbH. {locale === "de" ? "Alle Rechte vorbehalten." : "All rights reserved."}</span>
            <span className="text-gray-700">{locale === "de" ? "Open-Source-Demo \u2014 kein kommerzielles Produkt" : "Open-source demo \u2014 not a commercial product"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
