"use client";
import { t } from "@/lib/i18n";
import ApiKeyBlock from "./ApiKeyBlock";
import type { StepTopicProps } from "./wizardTypes";

export default function StepTopic(props: StepTopicProps) {
  const { state, setState, locale, appConfig, sessionApiKey, setSessionApiKey, keyValidated, setKeyValidated, keyValidating, keyError, setKeyError, setFreeMode, handleValidateKey, uploading, uploadedFile, handleFileUpload, fileRef, error } = props;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-brand">{t("wiz.topic.title", locale)}</h2>

      {/* Topic */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("wiz.topic.label", locale)}</label>
        <input type="text" value={state.topic} onChange={(e) => setState((prev) => ({ ...prev, topic: e.target.value }))} placeholder={t("wiz.topic.placeholder", locale)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light focus:border-transparent outline-none" maxLength={500} />
        <p className="text-xs text-gray-400 mt-1">{state.topic.length}/500 (min. 20)</p>
      </div>

      {/* Context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("wiz.topic.context", locale)}</label>
        <textarea value={state.context} onChange={(e) => setState((prev) => ({ ...prev, context: e.target.value }))} placeholder={t("wiz.topic.context_placeholder", locale)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light focus:border-transparent outline-none h-64 resize-y" maxLength={10000} />
        <p className="text-xs text-gray-400 mt-1">{state.context.length}/10000</p>
      </div>

      {/* File Upload — temporarily hidden, will be implemented later */}
      {/* <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-brand-light transition-colors">
        <input ref={fileRef} type="file" onChange={handleFileUpload} accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.pptx,.csv" className="hidden" id="file-upload" />
        <label htmlFor="file-upload" className="cursor-pointer">
          {uploading ? (
            <div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" /><span className="text-sm text-gray-500">{t("wiz.topic.processing", locale)}</span></div>
          ) : (
            <><div className="text-3xl mb-2">{"\uD83D\uDCC4"}</div><p className="text-sm font-medium text-gray-700">{t("wiz.topic.upload", locale)}</p><p className="text-xs text-gray-400 mt-1">{t("wiz.topic.upload_formats", locale)}</p></>
          )}
        </label>
        {uploadedFile && <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{"\u2713"} {uploadedFile}</div>}
      </div> */}

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("wiz.topic.language", locale)}</label>
        <select value={state.language} onChange={(e) => setState((prev) => ({ ...prev, language: e.target.value }))} className="px-4 py-2 border border-gray-300 rounded-lg">
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* API Key (Demo Mode) */}
      <ApiKeyBlock
        locale={locale}
        sessionApiKey={sessionApiKey}
        setSessionApiKey={setSessionApiKey}
        keyValidated={keyValidated}
        setKeyValidated={setKeyValidated}
        keyValidating={keyValidating}
        keyError={keyError}
        setKeyError={setKeyError}
        setFreeMode={setFreeMode}
        handleValidateKey={handleValidateKey}
        demoMode={appConfig.demo_mode}
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
