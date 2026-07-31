import { AlertTriangle, Link, Play, RotateCcw, Square, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, api, type MidiPort, type OrganStatus } from "@/api/client";

export default function Dashboard() {
  const [status, setStatus] = useState<OrganStatus | null>(null);
  const [ports, setPorts] = useState<{ inputs: MidiPort[]; outputs: MidiPort[] } | null>(null);
  const [lastOrgan, setLastOrgan] = useState<{ name: string; path: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [s, p, lo] = await Promise.all([api.status(), api.midiPorts(), api.lastOrgan()]);
      setStatus(s);
      setPorts(p);
      setBackendOnline(true);
      if (lo.organ) setLastOrgan(lo.organ);
    } catch (err) {
      setBackendOnline(false);
      if (err instanceof ApiError) setError(err.message);
      else setError("Backend unreachable on port 11010. Start it with: uv run grandorgue-mcp");
    }
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.goStart();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start GrandOrgue");
    } finally {
      setLoading(false);
    }
  };
  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.goStop();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to stop GrandOrgue");
    } finally {
      setLoading(false);
    }
  };
  const handleConnect = async () => {
    setError(null);
    try {
      await api.midiConnect();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to connect MIDI");
    }
  };
  const handleDisconnect = async () => {
    setError(null);
    try {
      await api.midiDisconnect();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to disconnect MIDI");
    }
  };
  const handleAutoLoad = async () => {
    if (!lastOrgan) return;
    setAutoLoading(true);
    setError(null);
    try {
      await api.post("/organs/load", { name: lastOrgan.name, path: lastOrgan.path });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to auto-load organ");
    } finally {
      setAutoLoading(false);
    }
  };

  return (
    <div data-testid="dashboard" className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-organ-gold">Dashboard</h1>

      {!backendOnline && (
        <div
          data-testid="backend-dot"
          className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          <div className="flex items-center justify-between">
            <span>
              Backend offline. Run <code className="text-red-200">uv run grandorgue-mcp</code> or{" "}
              <code className="text-red-200">.\start.ps1</code> from the repo root.
            </span>
            <button
              data-testid="backend-restart"
              onClick={refresh}
              className="flex items-center gap-1 px-3 py-1 bg-red-800 text-red-200 rounded text-xs hover:bg-red-700 transition-colors"
            >
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card
          label="GrandOrgue"
          value={status?.go_running ? "Running" : "Stopped"}
          ok={status?.go_running}
        />
        <Card
          label="MIDI Bridge"
          value={status?.midi_connected ? "Connected" : "Disconnected"}
          ok={status?.midi_connected}
        />
        <Card label="Organ" value={status?.organ?.name || "None"} ok={!!status?.organ} />
        <Card label="Version" value={status?.go_version || "N/A"} ok={false} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleStart}
          disabled={loading || status?.go_running}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-900 text-green-300 rounded-lg text-sm hover:bg-green-800 disabled:opacity-40 transition-colors"
        >
          <Play size={16} /> Start GrandOrgue
        </button>
        <button
          onClick={handleStop}
          disabled={loading || !status?.go_running}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-900 text-red-300 rounded-lg text-sm hover:bg-red-800 disabled:opacity-40 transition-colors"
        >
          <Square size={16} /> Stop GrandOrgue
        </button>
        <button
          onClick={handleConnect}
          disabled={status?.midi_connected}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-blue-300 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-40 transition-colors"
        >
          <Link size={16} /> Connect MIDI
        </button>
        <button
          onClick={handleDisconnect}
          disabled={!status?.midi_connected}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          <Unlink size={16} /> Disconnect MIDI
        </button>
        <button
          onClick={() => api.panic()}
          className="flex items-center gap-1.5 px-4 py-2 border border-red-800 text-red-400 rounded-lg text-sm hover:bg-red-900/20 transition-colors"
        >
          <AlertTriangle size={16} /> Panic
        </button>
      </div>

      {/* Auto-Load Card */}
      {lastOrgan && (
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Last Loaded Organ</div>
              <div className="text-sm font-medium text-organ-gold">{lastOrgan.name}</div>
            </div>
            <button
              onClick={handleAutoLoad}
              disabled={autoLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-organ-gold/20 text-organ-gold rounded-lg text-sm hover:bg-organ-gold/30 disabled:opacity-40 transition-colors"
            >
              <RotateCcw size={16} className={autoLoading ? "animate-spin" : ""} />{" "}
              {autoLoading ? "Loading..." : "Auto-Load"}
            </button>
          </div>
        </div>
      )}

      {/* MIDI Ports */}
      {ports && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm text-zinc-400 mb-2">MIDI Inputs</h3>
            <div className="space-y-1 text-xs text-zinc-500 font-mono">
              {ports.inputs.slice(0, 12).map((p) => (
                <div key={p.name} className="truncate">
                  {p.name}
                </div>
              ))}
              {ports.inputs.length === 0 && (
                <div className="text-zinc-700 italic">None detected</div>
              )}
            </div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm text-zinc-400 mb-2">MIDI Outputs</h3>
            <div className="space-y-1 text-xs text-zinc-500 font-mono">
              {ports.outputs.slice(0, 12).map((p) => (
                <div key={p.name} className="truncate">
                  {p.name}
                </div>
              ))}
              {ports.outputs.length === 0 && (
                <div className="text-zinc-700 italic">None detected</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div
      className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-sm font-medium ${ok ? "text-green-400" : "text-zinc-400"}`}>
        {value}
      </div>
    </div>
  );
}
