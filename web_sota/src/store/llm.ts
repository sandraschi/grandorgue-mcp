import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ProviderInfo {
  id: string;
  label: string;
  base_url: string;
  models: string[];
  status: "probing" | "detected" | "not_found";
}

export interface LLMState {
  providers: ProviderInfo[];
  selectedProvider: string;
  selectedModel: string;
  gpuDetected: boolean | null;
  probing: boolean;
  setProviders: (providers: ProviderInfo[]) => void;
  setProviderStatus: (id: string, status: ProviderInfo["status"]) => void;
  selectProvider: (id: string) => void;
  selectModel: (model: string) => void;
  setGpuDetected: (detected: boolean) => void;
  setProbing: (probing: boolean) => void;
  probeAll: () => Promise<void>;
}

const PROVIDER_LABELS: Record<string, string> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
};

const PROVIDER_URLS: Record<string, string> = {
  ollama: "http://127.0.0.1:11434",
  lmstudio: "http://127.0.0.1:1234",
};

function readSaved(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function mirrorSelection(provider: string, model: string) {
  try {
    localStorage.setItem("llm_provider", provider);
    localStorage.setItem("llm_model", model);
  } catch {
    // private mode — zustand persist still holds the values
  }
}

type LLMPersist = Pick<LLMState, "selectedProvider" | "selectedModel">;

export const useLLMStore = create<LLMState>()(
  persist<LLMState, [], [], LLMPersist>(
    (set, get) => ({
      providers: [],
      selectedProvider: readSaved("llm_provider", "ollama"),
      selectedModel: readSaved("llm_model", ""),
      gpuDetected: null,
      probing: false,

      setProviders: (providers: ProviderInfo[]) => set({ providers }),
      setProviderStatus: (id: string, status: ProviderInfo["status"]) =>
        set((s) => ({
          providers: s.providers.map((p) => (p.id === id ? { ...p, status } : p)),
        })),
      selectProvider: (id: string) => {
        set({ selectedProvider: id, selectedModel: "" });
        mirrorSelection(id, "");
      },
      selectModel: (model: string) => {
        set({ selectedModel: model });
        mirrorSelection(get().selectedProvider, model);
      },
      setGpuDetected: (detected: boolean) => set({ gpuDetected: detected }),
      setProbing: (probing: boolean) => set({ probing }),

      probeAll: async () => {
        // Fleet rule: the browser never talks to LLM providers directly.
        // All discovery goes through the backend proxy (GET /api/llm/providers),
        // which is also how API keys stay server-side.
        set({ probing: true });
        try {
          const r = await fetch("/api/llm/providers", {
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          const providers: ProviderInfo[] = (data.providers ?? []).map(
            (p: { id: string; label?: string; base_url?: string; models?: string[] }) => ({
              id: p.id,
              label: p.label || PROVIDER_LABELS[p.id] || p.id,
              base_url: p.base_url || PROVIDER_URLS[p.id] || "",
              models: p.models ?? [],
              status: (p.models ?? []).length > 0 ? "detected" : "not_found",
            }),
          );
          set({ providers, probing: false });
          const detected = providers.find((p) => p.status === "detected");
          if (detected) {
            const state = get();
            if (!state.selectedModel && detected.models.length > 0) {
              set({
                selectedProvider: detected.id,
                selectedModel: detected.models[0],
              });
              mirrorSelection(detected.id, detected.models[0]);
            }
          }
          try {
            const d = await fetch("/api/llm/discover", {
              signal: AbortSignal.timeout(8000),
            });
            if (d.ok) {
              const disc = await d.json();
              if (disc?.gpu?.detected === true) set({ gpuDetected: true });
              else if (disc?.gpu?.detected === false) set({ gpuDetected: false });
            }
          } catch {
            // discovery is best-effort; provider list already set
          }
        } catch {
          set({ probing: false });
        }
      },
    }),
    {
      name: "grandorgue-llm",
      storage: createJSONStorage(() => localStorage),
      partialize: (s: LLMState): LLMPersist => ({
        selectedProvider: s.selectedProvider,
        selectedModel: s.selectedModel,
      }),
      merge: (persisted: unknown, current: LLMState) => {
        const p = persisted as Partial<LLMPersist>;
        const provider = p.selectedProvider || readSaved("llm_provider", current.selectedProvider);
        const model = p.selectedModel || readSaved("llm_model", current.selectedModel);
        return { ...current, selectedProvider: provider, selectedModel: model };
      },
    },
  ),
);
