const BASE = "/api";

export interface OrganStatus {
  go_running: boolean;
  go_path: string | null;
  go_version: string | null;
  midi_connected: boolean;
  organ: { name: string; path: string; loaded: boolean } | null;
}

export interface MidiPort {
  name: string;
  port_type: string;
  connected: boolean;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const api = {
  status: () => fetchJSON<OrganStatus>("/status"),
  midiPorts: () => fetchJSON<{ inputs: MidiPort[]; outputs: MidiPort[] }>("/midi/ports"),
  midiConnect: () => fetchJSON<{ success: boolean }>("/midi/connect", { method: "POST" }),
  midiDisconnect: () => fetchJSON<{ success: boolean }>("/midi/disconnect", { method: "POST" }),
  playNote: (note: number, velocity = 64, channel = 0, durationMs = 500) =>
    fetchJSON<{ success: boolean }>("/note", {
      method: "POST",
      body: JSON.stringify({ note, velocity, channel, duration_ms: durationMs }),
    }),
  setStop: (cc: number, state: boolean) =>
    fetchJSON<{ success: boolean }>("/stop", {
      method: "POST",
      body: JSON.stringify({ cc, state }),
    }),
  setCrescendo: (value: number) =>
    fetchJSON<{ success: boolean }>("/crescendo", {
      method: "POST",
      body: JSON.stringify({ value }),
    }),
  setEnclosure: (cc: number, value: number) =>
    fetchJSON<{ success: boolean }>("/enclosure", {
      method: "POST",
      body: JSON.stringify({ cc, value }),
    }),
  combination: (num: number) =>
    fetchJSON<{ success: boolean }>("/combination", {
      method: "POST",
      body: JSON.stringify({ number: num }),
    }),
  panic: () => fetchJSON<{ success: boolean }>("/panic", { method: "POST" }),
  goStart: () => fetchJSON<{ success: boolean; pid: number | null }>("/go/start", { method: "POST" }),
  goStop: () => fetchJSON<{ success: boolean }>("/go/stop", { method: "POST" }),
  goStatus: () => fetchJSON<{ running: boolean; pid: number | null }>("/go/status"),
  organs: () => fetchJSON<{ installed: any[]; catalog: any[] }>("/organs"),
};
