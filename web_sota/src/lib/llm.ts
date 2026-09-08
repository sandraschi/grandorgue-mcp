/**
 * Shared LLM client (vendored from mcp-central-docs/templates/llm/lib-llm.ts,
 * adapted to grandorgue-mcp's local-only backend).
 *
 * Differences from the template:
 * - No cloud/key/install endpoints in this build (local Ollama + LM Studio
 *   only), so fetchLlmSettings/saveLlmSettings/fetchGpus/unloadLlm and the
 *   install helpers are omitted — nothing here calls a missing endpoint.
 * - chatComplete maps a message list onto POST /api/llm/chat
 *   {provider, model, prompt, system} (system parts joined, last user part
 *   as prompt; earlier turns are not sent — backend has no history).
 * - streamChat parses this backend's SSE ({chunk} events + [DONE]).
 * - fetchOnboarding maps GET /api/llm/onboarding onto the template's
 *   OnboardingState shape.
 */

export type ProviderKind = "local" | "cloud";
export type ModelSource = "live" | "curated" | "none";

export interface ProviderInfo {
  id: string;
  label: string;
  kind: ProviderKind;
  base_url: string;
  needs_key: boolean;
  key_env: string | null;
  configured: boolean;
  detected?: boolean;
  models?: string[];
}

export interface ModelsResponse {
  provider: string;
  models: string[];
  source: ModelSource;
}

export interface OnboardingState {
  locals: Array<{ id: string; label: string; port: number | null }>;
  clouds_configured: string[];
  recommendation: { path: string; reason: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Selection {
  provider: string;
  model: string;
}

const PROVIDER_KEY = "llm_provider";
const MODEL_KEY = "llm_model";
const ONBOARDED_KEY = "llm_onboarded";

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function loadSelection(): Selection {
  return {
    provider: storageGet(PROVIDER_KEY) || "ollama",
    model: storageGet(MODEL_KEY) || "",
  };
}

export function saveSelection(provider: string, model: string) {
  storageSet(PROVIDER_KEY, provider);
  storageSet(MODEL_KEY, model);
  notifySelection({ provider, model });
}

type SelectionCb = (sel: Selection) => void;
const selectionSubs = new Set<SelectionCb>();

export function subscribeSelection(cb: SelectionCb): () => void {
  selectionSubs.add(cb);
  return () => {
    selectionSubs.delete(cb);
  };
}

function notifySelection(sel: Selection) {
  selectionSubs.forEach((cb) => {
    try {
      cb(sel);
    } catch {
      /* subscriber error is non-fatal */
    }
  });
}

export function isOnboarded(): boolean {
  return storageGet(ONBOARDED_KEY) === "1";
}

export function markOnboarded() {
  storageSet(ONBOARDED_KEY, "1");
}

interface RawProvider {
  id: string;
  label?: string;
  base_url?: string;
  models?: string[];
  needs_key?: boolean;
}

function toProviderInfo(p: RawProvider): ProviderInfo {
  const models = p.models ?? [];
  return {
    id: p.id,
    label: p.label || p.id,
    kind: "local",
    base_url: p.base_url || "",
    needs_key: false,
    key_env: null,
    configured: models.length > 0,
    detected: models.length > 0,
    models,
  };
}

export async function fetchProviders(): Promise<{ providers: ProviderInfo[] }> {
  const r = await fetch("/api/llm/providers");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return { providers: (data.providers ?? []).map(toProviderInfo) };
}

export async function fetchModels(provider: string): Promise<ModelsResponse> {
  const r = await fetch(`/api/llm/models?provider=${encodeURIComponent(provider)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return { provider, models: data.models ?? [], source: "live" };
}

export async function fetchOnboarding(): Promise<OnboardingState> {
  const r = await fetch("/api/llm/onboarding");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const rec = data.recommended ?? { provider: "ollama", model: "llama3.2:3b" };
  return {
    locals: [
      { id: "ollama", label: "Ollama", port: 11434 },
      { id: "lmstudio", label: "LM Studio", port: 1234 },
    ],
    clouds_configured: [],
    recommendation: {
      path: `${rec.provider}:${rec.model}`,
      reason: (data.facts ?? []).join(" ") || "Local LLM keeps everything on this machine.",
    },
  };
}

export interface InstallStatus {
  engine: string;
  state: "idle" | "running" | "done" | "error";
  output: string;
}

export async function startInstall(engine: string): Promise<{ started: boolean }> {
  const r = await fetch("/api/llm/install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ engine }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function installStatus(engine: string): Promise<InstallStatus> {
  const r = await fetch(`/api/llm/install/status?engine=${encodeURIComponent(engine)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function chatComplete(
  provider: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const r = await fetch("/api/llm/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      model,
      prompt: lastUser ? lastUser.content : "",
      system,
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return data.response || data.error || "";
}

export async function streamChat(
  provider: string,
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const r = await fetch("/api/llm/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      model,
      prompt: lastUser ? lastUser.content : "",
      system,
    }),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const obj = JSON.parse(payload);
        if (obj.chunk) onChunk(obj.chunk as string);
        else if (obj.error) throw new Error(obj.error);
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.startsWith("{")) throw e;
      }
    }
  }
}
