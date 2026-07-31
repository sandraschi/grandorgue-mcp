import { Check, Cpu, RefreshCw, Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, type AppSettings, api } from "@/api/client";
import { useLLMStore } from "@/store/llm";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [goExePath, setGoExePath] = useState("");
  const [midiInputPort, setMidiInputPort] = useState("");
  const [midiOutputPort, setMidiOutputPort] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.settings();
      setSettings(data);
      setGoExePath(data.go_exe_path);
      setMidiInputPort(data.midi_input_port);
      setMidiOutputPort(data.midi_output_port);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const llmStore = useLLMStore();
  const llmDetectedCount = llmStore.providers.filter((p) => p.status === "detected").length;
  const currentModels =
    llmStore.providers.find((p) => p.id === llmStore.selectedProvider)?.models || [];

  useEffect(() => {
    llmStore.probeAll();
    // Probe GPU
    fetch("/api/llm/providers")
      .then(() => llmStore.setGpuDetected(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await api.saveSettings({
        go_exe_path: goExePath.trim(),
        midi_input_port: midiInputPort.trim(),
        midi_output_port: midiOutputPort.trim(),
      });
      setSettings(data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const applyDetectedPath = (path: string) => {
    setGoExePath(path);
    setSaved(false);
  };

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="text-organ-gold" size={24} />
        <h1 className="text-2xl font-serif text-organ-gold">Settings</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-green-800 bg-green-950/40 px-4 py-3 text-sm text-green-300 flex items-center gap-2">
          <Check size={16} /> Settings saved.
        </div>
      )}

      <section className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 space-y-4">
        <h2 className="text-sm font-medium text-zinc-300">GrandOrgue Executable</h2>
        <p className="text-xs text-zinc-500">
          Path to <code className="text-zinc-400">GrandOrgue.exe</code>. The backend uses this when
          you click Start GrandOrgue on the Dashboard.
        </p>
        <input
          type="text"
          value={goExePath}
          onChange={(e) => {
            setGoExePath(e.target.value);
            setSaved(false);
          }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 font-mono"
          placeholder="C:\Program Files\GrandOrgue\bin\GrandOrgue.exe"
        />
        <div className="flex flex-wrap gap-2 text-xs">
          {settings?.default_go_paths.map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => applyDetectedPath(path)}
              className="rounded border border-zinc-700 px-2 py-1 text-zinc-400 hover:text-organ-gold hover:border-organ-gold/40 transition-colors"
            >
              Use {path}
            </button>
          ))}
        </div>
        <div className="text-xs text-zinc-500 space-y-1">
          <div>
            Status:{" "}
            <span className={settings?.go_exe_exists ? "text-green-400" : "text-red-400"}>
              {settings?.go_exe_exists ? "Executable found" : "Executable not found"}
            </span>
          </div>
          {settings?.go_version && <div>Detected version: {settings.go_version}</div>}
          {settings?.resolved_go_exe_path && settings.resolved_go_exe_path !== goExePath && (
            <div>Currently resolved: {settings.resolved_go_exe_path}</div>
          )}
        </div>
      </section>

      <section className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 space-y-4">
        <h2 className="text-sm font-medium text-zinc-300">MIDI Bridge Ports</h2>
        <p className="text-xs text-zinc-500">
          Virtual port names created when you click Connect MIDI. Configure the same names inside
          GrandOrgue.
        </p>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">MCP output port (GrandOrgue MIDI Input)</span>
          <input
            type="text"
            value={midiInputPort}
            onChange={(e) => {
              setMidiInputPort(e.target.value);
              setSaved(false);
            }}
            disabled={settings?.midi_connected}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 font-mono disabled:opacity-50"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">MCP input port (GrandOrgue MIDI Output)</span>
          <input
            type="text"
            value={midiOutputPort}
            onChange={(e) => {
              setMidiOutputPort(e.target.value);
              setSaved(false);
            }}
            disabled={settings?.midi_connected}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 font-mono disabled:opacity-50"
          />
        </label>
        {settings?.midi_connected && (
          <p className="text-xs text-amber-300">
            Disconnect MIDI on the Dashboard before changing port names.
          </p>
        )}
      </section>

      {/* LLM Provider Section */}
      <section
        className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 space-y-4"
        data-testid="settings-llm"
      >
        <div className="flex items-center gap-2">
          <Cpu className="text-amber-500" size={18} />
          <h2 className="text-sm font-medium text-zinc-300">Local LLM Provider</h2>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] ${llmStore.probing ? "bg-amber-900/40 text-amber-400" : llmDetectedCount > 0 ? "bg-green-900/40 text-green-400" : "bg-zinc-800 text-zinc-500"}`}
          >
            {llmStore.probing
              ? "Probing..."
              : llmDetectedCount > 0
                ? `${llmDetectedCount} detected`
                : "None detected"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {llmStore.providers.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border p-3 text-xs ${p.status === "detected" ? "border-green-700 bg-green-950/20" : p.status === "probing" ? "border-amber-700 bg-amber-950/10" : "border-zinc-700 bg-zinc-950/40"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-300 font-medium">{p.label}</span>
                <span
                  className={`w-2 h-2 rounded-full ${p.status === "detected" ? "bg-green-500" : p.status === "probing" ? "bg-amber-500 animate-pulse" : "bg-zinc-600"}`}
                />
              </div>
              <div className="text-zinc-500">:{p.base_url.split(":")[2] || "?"}</div>
              {p.status === "detected" && (
                <div className="text-green-600 mt-1">{p.models.length} models</div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Provider</span>
            <select
              value={llmStore.selectedProvider}
              onChange={(e) => llmStore.selectProvider(e.target.value)}
              className="w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="llm-provider-select"
            >
              {llmStore.providers
                .filter((p) => p.status === "detected")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              {llmStore.providers.every((p) => p.status !== "detected") && (
                <option value="" disabled>
                  No provider detected
                </option>
              )}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Model</span>
            <select
              value={llmStore.selectedModel}
              onChange={(e) => llmStore.selectModel(e.target.value)}
              className="w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-3 py-2 text-sm"
              data-testid="llm-model-select"
            >
              {currentModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              {currentModels.length === 0 && (
                <option value="" disabled>
                  No models found
                </option>
              )}
            </select>
          </label>
        </div>

        <button
          onClick={() => llmStore.probeAll()}
          disabled={llmStore.probing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700 disabled:opacity-40"
        >
          <RefreshCw size={12} className={llmStore.probing ? "animate-spin" : ""} /> Re-detect
          Providers
        </button>

        {llmStore.gpuDetected === true && llmDetectedCount === 0 && (
          <div className="rounded border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
            High-performance GPU detected but no local LLM running. Install Ollama or LM Studio to
            enable AI features for free.
          </div>
        )}

        <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 text-[10px] text-zinc-600 font-mono">
          <div>
            GPU detected:{" "}
            {llmStore.gpuDetected === null ? "checking..." : llmStore.gpuDetected ? "Yes" : "No"}
          </div>
          <div>
            Chat provider: {llmStore.selectedProvider} · Model: {llmStore.selectedModel || "(none)"}
          </div>
        </div>
      </section>

      <section className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 space-y-4">
        <h2 className="text-sm font-medium text-zinc-300">Configure GrandOrgue</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-400">
          <li>Save settings above, then start the backend and open this webapp.</li>
          <li>
            On the Dashboard, click <strong className="text-zinc-300">Start GrandOrgue</strong>.
          </li>
          <li>
            On the Dashboard, click <strong className="text-zinc-300">Connect MIDI</strong>.
          </li>
          <li>
            In GrandOrgue, open{" "}
            <strong className="text-zinc-300">File → Settings → Audio/MIDI Settings</strong>.
          </li>
          <li>
            On the MIDI Devices tab, set{" "}
            <strong className="text-zinc-300">MIDI Input Device</strong> to{" "}
            <code className="text-organ-gold">{midiInputPort || "GrandOrgue MCP Out"}</code>.
          </li>
          <li>
            Set <strong className="text-zinc-300">MIDI Output Device</strong> to{" "}
            <code className="text-organ-gold">{midiOutputPort || "GrandOrgue MCP In"}</code>.
          </li>
          <li>Load an organ via File → Load, then play keys from the Console page.</li>
        </ol>
        <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-500 font-mono space-y-1">
          <div>GrandOrgue MIDI config: {settings?.go_config_path}</div>
          <div>MCP settings file: {settings?.config_dir}</div>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-organ-gold/20 text-organ-gold rounded-lg text-sm hover:bg-organ-gold/30 disabled:opacity-40 transition-colors"
        >
          <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw size={16} /> Reload
        </button>
      </div>
    </div>
  );
}
