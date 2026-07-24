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

export interface AppSettings {
  go_exe_path: string;
  midi_input_port: string;
  midi_output_port: string;
  config_dir: string;
  go_exe_exists: boolean;
  resolved_go_exe_path: string | null;
  default_go_paths: string[];
  go_version: string | null;
  midi_connected: boolean;
  go_config_path: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const message = typeof body?.message === "string" ? body.message : `HTTP ${r.status}`;
    throw new ApiError(message, r.status);
  }
  return body as T;
}

export const api = {
  status: () => fetchJSON<OrganStatus>("/status"),
  midiPorts: () => fetchJSON<{ inputs: MidiPort[]; outputs: MidiPort[] }>("/midi/ports"),
  midiConnect: () => fetchJSON<{ success: boolean }>("/midi/connect", { method: "POST" }),
  midiDisconnect: () => fetchJSON<{ success: boolean }>("/midi/disconnect", { method: "POST" }),
  midiPlay: (name: string) =>
    fetchJSON<{ success: boolean; message: string; playing: boolean }>("/midi/play", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  midiStop: () =>
    fetchJSON<{ success: boolean; message: string }>("/midi/stop", { method: "POST" }),
  midiPlaybackStatus: () =>
    fetchJSON<{ success: boolean; playing: boolean }>("/midi/playback-status"),
  playNote: (note: number, velocity = 64, channel = 0) =>
    fetchJSON<{ success: boolean }>("/note", {
      method: "POST",
      body: JSON.stringify({ note, velocity, channel }),
    }),
  releaseNote: (note: number, channel = 0) =>
    fetchJSON<{ success: boolean }>("/note/off", {
      method: "POST",
      body: JSON.stringify({ note, channel }),
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
  goStart: () =>
    fetchJSON<{ success: boolean; pid: number | null }>("/go/start", { method: "POST" }),
  goStop: () => fetchJSON<{ success: boolean }>("/go/stop", { method: "POST" }),
  goStatus: () => fetchJSON<{ running: boolean; pid: number | null }>("/go/status"),
  settings: () => fetchJSON<AppSettings>("/settings"),
  saveSettings: (
    settings: Pick<AppSettings, "go_exe_path" | "midi_input_port" | "midi_output_port">,
  ) =>
    fetchJSON<AppSettings & { success: boolean }>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  organs: () => fetchJSON<{ installed: any[]; catalog: any[] }>("/organs"),
  lastOrgan: () =>
    fetchJSON<{ success: boolean; organ: { name: string; path: string } | null }>("/organs/last"),
  post: (url: string, body: any) =>
    fetchJSON<any>(url, { method: "POST", body: JSON.stringify(body) }),
  get: (url: string) => fetchJSON<any>(url),
  del: (url: string) => fetchJSON<any>(url, { method: "DELETE" }),
};
