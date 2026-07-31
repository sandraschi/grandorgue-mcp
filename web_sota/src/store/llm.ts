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

const PROVIDERS_CONFIG = [
  { id: "ollama", label: "Ollama", base_url: "http://127.0.0.1:11434", probe: "/api/tags" },
  { id: "lmstudio", label: "LM Studio", base_url: "http://127.0.0.1:1234", probe: "/v1/models" },
];

type LLMPersist = Pick<LLMState, "selectedProvider" | "selectedModel">;

export const useLLMStore = create<LLMState>()(
  persist<LLMState, [], [], LLMPersist>(
    (set, get) => ({
      providers: PROVIDERS_CONFIG.map((p) => ({ ...p, models: [], status: "probing" as const })),
      selectedProvider: "ollama",
      selectedModel: "",
      gpuDetected: null,
      probing: false,

      setProviders: (providers: ProviderInfo[]) => set({ providers }),
      setProviderStatus: (id: string, status: ProviderInfo["status"]) =>
        set((s) => ({
          providers: s.providers.map((p) => (p.id === id ? { ...p, status } : p)),
        })),
      selectProvider: (id: string) => set({ selectedProvider: id, selectedModel: "" }),
      selectModel: (model: string) => set({ selectedModel: model }),
      setGpuDetected: (detected: boolean) => set({ gpuDetected: detected }),
      setProbing: (probing: boolean) => set({ probing }),

      probeAll: async () => {
        set({ probing: true });
        const updated = [...get().providers];
        for (const p of updated) {
          p.status = "probing" as const;
          const cfg = PROVIDERS_CONFIG.find((c) => c.id === p.id);
          if (!cfg) continue;
          try {
            const r = await fetch(`${p.base_url}${cfg.probe}`, {
              signal: AbortSignal.timeout(3000),
            });
            if (r.ok) {
              const data = await r.json();
              p.status = "detected" as const;
              if (p.id === "ollama" && data.models) {
                p.models = (data.models as Array<{ name: string }>).map((m) => m.name);
              } else if (p.id === "lmstudio" && data.data) {
                p.models = (data.data as Array<{ id: string }>).map((m) => m.id);
              }
            } else {
              p.status = "not_found" as const;
            }
          } catch {
            p.status = "not_found" as const;
          }
        }
        set({ providers: updated, probing: false });
        const detected = updated.find((p) => p.status === "detected");
        if (detected) {
          const state = get();
          if (!state.selectedProvider || state.selectedProvider === "ollama") {
            set({ selectedProvider: detected.id });
          }
          if (!state.selectedModel && detected.models.length > 0) {
            set({ selectedModel: detected.models[0] });
          }
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
        return {
          ...current,
          selectedProvider: p.selectedProvider ?? current.selectedProvider,
          selectedModel: p.selectedModel ?? current.selectedModel,
        };
      },
    },
  ),
);
