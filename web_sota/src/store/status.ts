import { useEffect } from "react";
import { create } from "zustand";
import { ApiError, api, type MidiPort, type OrganStatus } from "@/api/client";

// Backend port is owned by fleet-start.config.ps1 / WEBAPP_PORTS.md (11010).
// Keep it in one constant so the UI never hardcodes port literals (P1).
export const BACKEND_PORT = 11010;

type Ports = { inputs: MidiPort[]; outputs: MidiPort[] };
type LastOrgan = { name: string; path: string };

interface StatusState {
  status: OrganStatus | null;
  ports: Ports | null;
  lastOrgan: LastOrgan | null;
  backendOnline: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  /** full=true also fetches MIDI ports and the last-loaded organ (Dashboard). */
  refresh: (full?: boolean) => Promise<void>;
}

let timer: ReturnType<typeof setInterval> | null = null;
let subscribers = 0;
let lastFetch = 0;

export const useStatusStore = create<StatusState>((set, get) => ({
  status: null,
  ports: null,
  lastOrgan: null,
  backendOnline: true,
  error: null,
  setError: (error) => set({ error }),
  refresh: async (full = false) => {
    lastFetch = Date.now();
    try {
      const wasOffline = !get().backendOnline;
      if (full) {
        const [status, ports, lo] = await Promise.all([
          api.status(),
          api.midiPorts(),
          api.lastOrgan(),
        ]);
        set({
          status,
          ports,
          backendOnline: true,
          ...(lo.organ ? { lastOrgan: lo.organ } : {}),
          ...(wasOffline ? { error: null } : {}),
        });
      } else {
        const status = await api.status();
        set({ status, backendOnline: true, ...(wasOffline ? { error: null } : {}) });
      }
    } catch (err) {
      set({
        status: null,
        backendOnline: false,
        error:
          err instanceof ApiError
            ? err.message
            : `Backend unreachable on port ${BACKEND_PORT}. Start it with: uv run grandorgue-mcp`,
      });
    }
  },
}));

/** One shared 3 s status poll for the whole app (mount once, in App). */
export function useStatusPolling() {
  useEffect(() => {
    subscribers += 1;
    if (!timer) {
      void useStatusStore.getState().refresh();
      timer = setInterval(() => {
        // A full refresh (Dashboard) may have just run: do not double-poll.
        if (Date.now() - lastFetch > 2500) void useStatusStore.getState().refresh();
      }, 3000);
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
}
