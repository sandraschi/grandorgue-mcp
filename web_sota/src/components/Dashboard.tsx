import { AlertTriangle, Check, Link, Play, RotateCcw, Square, Unlink } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ApiError, api } from "@/api/client";
import { LlmOnboarding } from "@/components/llm/LlmOnboarding";
import { useStatusStore } from "@/store/status";

export default function Dashboard() {
  const { status, ports, lastOrgan, backendOnline, error, setError } = useStatusStore();
  const storeRefresh = useStatusStore((s) => s.refresh);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const refresh = () => storeRefresh(true);

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
      <p className="text-sm text-zinc-400">
        Modern console for the GrandOrgue pipe organ simulator: start GrandOrgue, connect MIDI, load
        a sample set, then play from the Console or an AI agent.
      </p>
      <LlmOnboarding mode="banner" />

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
              className="flex items-center gap-1 px-3 py-1 bg-red-800 text-red-200 rounded text-sm hover:bg-red-700 transition-colors"
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

      {!backendOnline && (
        <div data-testid="mock-kpis">
          <p className="text-sm text-zinc-500 mb-2">
            Sample preview — start the backend for live status. All values below are placeholders.
          </p>
          <div className="grid grid-cols-4 gap-4">
            {[
              ["GrandOrgue", "Running"],
              ["MIDI Bridge", "Connected"],
              ["Organ", "Mockminster Abbey"],
              ["Version", "8.0"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-zinc-900 rounded-lg p-4 border border-dashed border-amber-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-zinc-500">{label}</div>
                  <span className="text-[10px] font-bold text-amber-400 border border-amber-700 rounded px-1">
                    MOCK
                  </span>
                </div>
                <div className="text-sm font-medium text-zinc-500">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {backendOnline && (
        <QuickStart
          steps={[
            {
              id: "go",
              title: "Start GrandOrgue",
              done: !!status?.go_running,
              action: (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="rounded-lg bg-green-900 px-3 py-1.5 text-xs font-medium text-green-200 hover:bg-green-800 disabled:opacity-40 transition-colors"
                >
                  Start
                </button>
              ),
            },
            {
              id: "midi",
              title: "Connect the MIDI bridge",
              done: !!status?.midi_connected,
              action: (
                <button
                  onClick={handleConnect}
                  className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-800 transition-colors"
                >
                  Connect
                </button>
              ),
            },
            {
              id: "organ",
              title: "Load an organ",
              done: !!status?.organ?.loaded,
              action: lastOrgan ? (
                <button
                  onClick={handleAutoLoad}
                  disabled={autoLoading}
                  className="rounded-lg bg-organ-gold/20 px-3 py-1.5 text-xs font-medium text-organ-gold hover:bg-organ-gold/30 disabled:opacity-40 transition-colors"
                >
                  {autoLoading ? "Loading..." : `Reload ${lastOrgan.name}`}
                </button>
              ) : (
                <RouterLink
                  to="/library"
                  className="rounded-lg bg-organ-gold/20 px-3 py-1.5 text-xs font-medium text-organ-gold hover:bg-organ-gold/30 transition-colors"
                >
                  Open Library
                </RouterLink>
              ),
            },
            {
              id: "play",
              title: "Play something",
              done: false,
              action: (
                <span className="flex gap-2">
                  <RouterLink
                    to="/console"
                    className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-600 transition-colors"
                  >
                    Console
                  </RouterLink>
                  <RouterLink
                    to="/midi-player"
                    className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-600 transition-colors"
                  >
                    Bach player
                  </RouterLink>
                </span>
              ),
            },
          ]}
        />
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
              <div className="text-sm text-zinc-500 mb-1">Last Loaded Organ</div>
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
            <div className="space-y-1 text-sm text-zinc-500 font-mono">
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
            <div className="space-y-1 text-sm text-zinc-500 font-mono">
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
      className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-900/60 p-4"
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400">
        <span
          className={`h-2 w-2 rounded-full ${ok ? "bg-green-400 shadow-[0_0_8px] shadow-green-500/60" : "bg-zinc-600"}`}
        />
        {label}
      </div>
      <div className={`truncate text-sm font-medium ${ok ? "text-green-300" : "text-zinc-300"}`}>
        {value}
      </div>
    </div>
  );
}

interface QuickStep {
  id: string;
  title: string;
  done: boolean;
  action: ReactNode;
}

function QuickStart({ steps }: { steps: QuickStep[] }) {
  // The last step ("play") has no completion signal, so progress counts the setup steps.
  const setup = steps.slice(0, -1);
  const doneCount = setup.filter((s) => s.done).length;
  const ready = doneCount === setup.length;
  return (
    <section
      data-testid="quick-start"
      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">
          {ready ? "Ready to play" : "Get playing in four steps"}
        </h2>
        <span className="text-xs text-zinc-400">
          {doneCount}/{setup.length} set up
        </span>
      </div>
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-organ-gold transition-all duration-500"
          style={{ width: `${(doneCount / setup.length) * 100}%` }}
        />
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                s.done ? "bg-green-900 text-green-300" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {s.done ? <Check size={13} /> : i + 1}
            </span>
            <span className={`flex-1 ${s.done ? "text-zinc-400 line-through" : "text-zinc-100"}`}>
              {s.title}
            </span>
            {!s.done && s.action}
          </li>
        ))}
      </ol>
    </section>
  );
}
