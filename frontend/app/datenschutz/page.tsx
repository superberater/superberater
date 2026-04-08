"use client";

import { useLocale } from "@/hooks/useLocale";
import { GITHUB_REPO_URL } from "@/lib/links";

export default function DatenschutzPage() {
  const { locale } = useLocale();
  const de = locale === "de";

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-brand mb-2">{de ? "Datenschutzerklärung" : "Privacy Policy"}</h1>
      <p className="text-xs text-gray-400 mb-8">{de ? "Stand: April 2026" : "Last updated: April 2026"}</p>

      <div className="text-sm text-gray-700 space-y-8">

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{de ? "1. Verantwortlicher" : "1. Data Controller"}</h2>
          <p className="leading-relaxed">
            superLab GmbH, Rudolf-Breitscheid-Straße 209, 14482 Potsdam<br />
            E-Mail: contact(at)superlab.rocks
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{de ? "2. Was ist superberater?" : "2. What is superberater?"}</h2>
          <p className="leading-relaxed">
            {de ? (
              <>
                superberater ist ein Open-Source-Projekt (MIT-Lizenz), bei dem mehrere KI-Agenten ein Thema debattieren. Diese Webseite ist eine technische Live-Demo — kein kommerzielles Produkt. Es gibt keinen kostenpflichtigen Dienst und keine Kundenbeziehung. Der vollständige Quellcode ist auf{" "}
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  GitHub
                </a>{" "}
                (<span className="whitespace-nowrap">superberater/superberater</span>) einsehbar.
              </>
            ) : (
              <>
                superberater is an open-source project (MIT License) where multiple AI agents debate a topic. This website is a technical live demo — not a commercial product. There is no paid service and no customer relationship. The complete source code is available on{" "}
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  GitHub
                </a>{" "}
                (<span className="whitespace-nowrap">superberater/superberater</span>).
              </>
            )}
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{de ? "3. Welche Daten werden erhoben?" : "3. What data is collected?"}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 mb-1">{de ? "Registrierung" : "Registration"}</h3>
              <p className="text-gray-600 leading-relaxed">
                {de
                  ? "Zur Nutzung der Demo ist ein Account erforderlich. Erhoben wird ausschließlich die E-Mail-Adresse. Das Passwort wird als Hash gespeichert (kein Klartext). Die Authentifizierung läuft über Supabase (Cloud-Hosting in der EU)."
                  : "An account is required to use the demo. Only the email address is collected. The password is stored as a hash (no plain text). Authentication runs through Supabase (cloud-hosted in the EU)."}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">{de ? "superRun-Daten" : "superRun Data"}</h3>
              <p className="text-gray-600 leading-relaxed">
                {de
                  ? "Themen, Kontexte, hochgeladene Dokumente (als extrahierter Text) und die generierten KI-Antworten werden Ihrem Account zugeordnet und durch Row-Level-Security in der Datenbank geschützt. Sie können Ihre Runs jederzeit im Dashboard löschen."
                  : "Topics, contexts, uploaded documents (as extracted text), and generated AI responses are associated with your account and protected by row-level security in the database. You can delete your runs at any time in the dashboard."}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">{de ? "API-Schlüssel" : "API Keys"}</h3>
              <p className="text-gray-600 leading-relaxed">
                {de
                  ? "Wenn Sie einen eigenen OpenRouter-Key eingeben, wird dieser nur für die Dauer eines superRuns im Arbeitsspeicher gehalten. Er wird nicht in der Datenbank gespeichert, nicht geloggt und nicht an Dritte weitergegeben."
                  : "If you enter your own OpenRouter key, it is held in memory only for the duration of a superRun. It is not stored in the database, not logged, and not shared with third parties."}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">{de ? "Kein Tracking" : "No Tracking"}</h3>
              <p className="text-gray-600 leading-relaxed">
                {de
                  ? "Diese Demo verwendet keine Analytics, keine Tracking-Cookies, kein Profiling, keine Werbung. Der einzige lokale Speicher (localStorage) dient der Spracheinstellung (DE/EN)."
                  : "This demo uses no analytics, no tracking cookies, no profiling, no advertising. The only local storage (localStorage) is used for the language setting (DE/EN)."}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{de ? "4. Datenverarbeitung durch Dritte" : "4. Third-party data processing"}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 mb-1">OpenRouter</h3>
              <p className="text-gray-600 leading-relaxed">
                {de
                  ? "Ihre Themen und Kontexte werden zur Generierung der KI-Antworten an OpenRouter (openrouter.ai, USA) übermittelt. OpenRouter leitet die Anfragen an die jeweiligen Modell-Provider weiter (z.B. Alibaba/Qwen, Meta, NVIDIA, Arcee AI, StepFun). Bei kostenlosen Modellen können die Provider Ihre Eingaben zum Training verwenden."
                  : "Your topics and contexts are sent to OpenRouter (openrouter.ai, USA) to generate AI responses. OpenRouter forwards requests to the respective model providers (e.g., Alibaba/Qwen, Meta, NVIDIA, Arcee AI, StepFun). With free models, providers may use your inputs for training."}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">Supabase</h3>
              <p className="text-gray-600 leading-relaxed">
                {de
                  ? "Authentifizierung und Datenbank werden von Supabase (supabase.com) bereitgestellt. Daten werden in der EU gehostet."
                  : "Authentication and database are provided by Supabase (supabase.com). Data is hosted in the EU."}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{de ? "5. Ihre Rechte (DSGVO)" : "5. Your Rights (GDPR)"}</h2>
          <p className="text-gray-600 leading-relaxed">
            {de
              ? "Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit Ihrer Daten. Sie können Ihren Account und alle Runs jederzeit selbst löschen. Für weitergehende Anfragen: contact(at)superlab.rocks."
              : "You have the right to access, rectify, delete, and port your data. You can delete your account and all runs at any time. For further requests: contact(at)superlab.rocks."}
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{de ? "6. Rechtsgrundlage" : "6. Legal Basis"}</h2>
          <p className="text-gray-600 leading-relaxed">
            {de
              ? "Die Datenverarbeitung erfolgt auf Basis Ihrer Einwilligung durch Registrierung (Art. 6 Abs. 1 lit. a DSGVO)."
              : "Data processing is based on your consent through registration (Art. 6(1)(a) GDPR)."}
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">{de ? "7. Self-Hosting" : "7. Self-Hosting"}</h2>
          <p className="text-gray-600 leading-relaxed">
            {de ? (
              <>
                superberater ist Open Source (MIT-Lizenz). Sie können die Software selbst hosten (siehe{" "}
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  Repository
                </a>
                ) und haben damit volle Kontrolle über alle Daten. Keine Daten fließen dann an diese Demo-Instanz.
              </>
            ) : (
              <>
                superberater is open source (MIT License). You can self-host the software (see the{" "}
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  repository
                </a>
                ) and have full control over all data. No data flows to this demo instance in that case.
              </>
            )}
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200 flex gap-4">
        <a href="/" className="text-sm text-brand hover:underline">← {de ? "Startseite" : "Home"}</a>
        <a href="/impressum" className="text-sm text-gray-500 hover:underline">{de ? "Impressum" : "Legal Notice"}</a>
      </div>
    </div>
  );
}
