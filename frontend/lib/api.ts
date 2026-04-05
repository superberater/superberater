/**
 * API client for CrewAI backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

async function fetchAPI(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export interface ModelOption { value: string; label: string; cost: string; tier?: string; context_length?: number; }
export interface AgentConfig { personality_id?: string; name?: string; icon?: string; system_prompt?: string; model: string; temperature: number; max_tokens: number; sort_order: number; }
export interface CreateDebateRequest {
  topic: string; context?: string; language?: string;
  agents: AgentConfig[]; num_rounds?: number; style?: string;
  parallel_mode?: string; decision_mode?: string;
  moderator_model?: string; moderator_system_prompt?: string; active_moderator?: boolean;
}
export interface Personality { id: string; name: string; icon: string; description: string; system_prompt: string; default_model: string; default_temperature: number; is_public: boolean; }
export interface AgentInfo { id: string; name: string; icon: string; model: string; }
export interface DebateInfo { id: string; status: string; topic: string; current_round: number; num_rounds: number; agents: AgentInfo[]; created_at: string; share_token?: string; is_public?: boolean; }
export interface Message { id: string; agent_name: string; agent_icon: string; round_number: number; role: string; content: string; model_used: string; created_at: string; }
export interface DebateResult { debate: DebateInfo; messages: Message[]; moderator_summary: string | null; total_tokens: number; total_cost_cents: number; share_token?: string; }

export async function getModels(includeFree: boolean = false): Promise<ModelOption[]> {
  try {
    const params = includeFree ? "?include_free=true" : "";
    const data = await fetchAPI(`/api/models${params}`);
    return data.models;
  }
  catch { return [{ value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", cost: "$1/1M" }, { value: "openai/gpt-4o-mini", label: "GPT-4o Mini", cost: "$0.15/1M" }]; }
}
export async function getPersonalities(): Promise<Personality[]> { const data = await fetchAPI("/api/personalities"); return data.personalities; }
export async function createDebate(req: CreateDebateRequest): Promise<DebateInfo> { return fetchAPI("/api/debates", { method: "POST", body: JSON.stringify(req) }); }
export async function startDebate(
  debateId: string,
  options?: { session_api_key?: string; free_mode?: boolean }
) {
  return fetchAPI(`/api/debates/${debateId}/start`, {
    method: "POST",
    body: JSON.stringify(options || {}),
  });
}
export async function getDebate(debateId: string): Promise<DebateInfo> { return fetchAPI(`/api/debates/${debateId}`); }
export async function getDebateResult(debateId: string): Promise<DebateResult> { return fetchAPI(`/api/debates/${debateId}/result`); }
export async function generatePersonality(domain: string, trait: string) { return fetchAPI("/api/personalities/generate", { method: "POST", body: JSON.stringify({ domain, trait }) }); }
export async function createPersonality(data: { name: string; icon: string; description: string; system_prompt: string; default_model?: string; default_temperature?: number }): Promise<Personality> { return fetchAPI("/api/personalities", { method: "POST", body: JSON.stringify(data) }); }
export async function suggestSetup(topic: string, context: string, language: string = "de", sessionApiKey?: string) { return fetchAPI("/api/debates/suggest-setup", { method: "POST", body: JSON.stringify({ topic, context, language, session_api_key: sessionApiKey || undefined }) }); }
export function getStreamUrl(debateId: string, agentId: string): string { return `${API_URL}/api/debates/${debateId}/stream/${agentId}`; }
export function getAllStreamUrl(debateId: string): string { return `${API_URL}/api/debates/${debateId}/stream/all`; }
export function getExportPdfUrl(debateId: string): string { return `${API_URL}/api/debates/${debateId}/export/pdf`; }
export function getExportMarkdownUrl(debateId: string): string { return `${API_URL}/api/debates/${debateId}/export/markdown`; }
export async function getSharedDebate(shareToken: string) { return fetchAPI(`/api/shared/${shareToken}`); }
export async function uploadFile(file: File): Promise<{ text: string; filename: string; chars: number }> {
  const formData = new FormData(); formData.append("file", file);
  const url = `${API_URL}/api/upload/extract`;
  const headers: Record<string, string> = {};
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;
  const res = await fetch(url, { method: "POST", body: formData, headers });
  if (!res.ok) { const error = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(error.detail || "Upload error"); }
  return res.json();
}
export async function listDebates(): Promise<{ debates: any[] }> { return fetchAPI("/api/debates"); }
export async function listPublicDebates(): Promise<{ debates: any[] }> { return fetchAPI("/api/community/debates"); }
export async function publishDebate(debateId: string) { return fetchAPI(`/api/debates/${debateId}/publish`, { method: "POST" }); }
export async function unpublishDebate(debateId: string) { return fetchAPI(`/api/debates/${debateId}/unpublish`, { method: "POST" }); }
export async function deleteDebate(debateId: string): Promise<{ deleted: boolean; id: string }> { return fetchAPI(`/api/debates/${debateId}`, { method: "DELETE" }); }
// Settings
export interface UserSettings { has_openrouter_key: boolean; openrouter_key_preview: string; has_global_key: boolean; }
export async function getUserSettings(): Promise<UserSettings> { return fetchAPI("/api/settings"); }
export async function updateUserSettings(openrouter_api_key: string) { return fetchAPI("/api/settings", { method: "PUT", body: JSON.stringify({ openrouter_api_key }) }); }
export async function deleteOpenRouterKey() { return fetchAPI("/api/settings/openrouter-key", { method: "DELETE" }); }
// Public config (no auth required)
export interface AppConfig { demo_mode: boolean; has_global_key: boolean; default_moderator_model: string; default_agent_model: string; }
export async function getAppConfig(): Promise<AppConfig> { return fetchAPI("/api/config"); }
export async function validateOpenRouterKey(key: string): Promise<{ valid: boolean; error?: string; label?: string; limit?: number | null; usage?: number }> {
  return fetchAPI("/api/validate-key", { method: "POST", body: JSON.stringify({ key }) });
}
export { API_URL };
