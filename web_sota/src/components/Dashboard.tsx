import { useEffect, useState } from "react";
import { Play, Square, Link, Unlink, AlertTriangle } from "lucide-react";
import { api, type OrganStatus, type MidiPort } from "@/api/client";

export default function Dashboard() {
  const [status, setStatus] = useState<OrganStatus | null>(null);
  const [ports, setPorts] = useState<{ inputs: MidiPort[]; outputs: MidiPort[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const [s, p] = await Promise.all([api.status(), api.midiPorts()]);
      setStatus(s);
      setPorts(p);
    } catch {}
  };

  useEffect(() => { refresh(); const iv = setInterval(refresh, 3000); return () => clearInterval(iv); }, []);

  const handleStart = async () => { setLoading(true); await api.goStart(); await refresh(); setLoading(false); };
  const handleStop = async () => { setLoading(true); await api.goStop(); await refresh(); setLoading(false); };
  const handleConnect = async () => { await api.midiConnect(); await refresh(); };
  const handleDisconnect = async () => { await api.midiDisconnect(); await refresh(); };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-organ-gold">Dashboard</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card label="GrandOrgue" value={status?.go_running ? "Running" : "Stopped"} ok={status?.go_running} />
        <Card label="MIDI Bridge" value={status?.midi_connected ? "Connected" : "Disconnected"} ok={status?.midi_connected} />
        <Card label="Organ" value={status?.organ?.name || "None"} ok={!!status?.organ} />
        <Card label="Version" value={status?.go_version || "N/A"} ok={false} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={handleStart} disabled={loading || status?.go_running} className="btn-green">
          <Play size={16} /> Start GrandOrgue
        </button>
        <button onClick={handleStop} disabled={loading || !status?.go_running} className="btn-red">
          <Square size={16} /> Stop GrandOrgue
        </button>
        <button onClick={handleConnect} disabled={status?.midi_connected} className="btn-blue">
          <Link size={16} /> Connect MIDI
        </button>
        <button onClick={handleDisconnect} disabled={!status?.midi_connected} className="btn-zinc">
          <Unlink size={16} /> Disconnect MIDI
        </button>
        <button onClick={() => api.panic()} className="btn-red-outline">
          <AlertTriangle size={16} /> Panic
        </button>
      </div>

      {/* MIDI Ports */}
      {ports && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm text-zinc-400 mb-2">MIDI Inputs</h3>
            <div className="space-y-1 text-xs text-zinc-500 font-mono">
              {ports.inputs.slice(0, 12).map((p) => (
                <div key={p.name} className="truncate">{p.name}</div>
              ))}
              {ports.inputs.length === 0 && <div className="text-zinc-700 italic">None detected</div>}
            </div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm text-zinc-400 mb-2">MIDI Outputs</h3>
            <div className="space-y-1 text-xs text-zinc-500 font-mono">
              {ports.outputs.slice(0, 12).map((p) => (
                <div key={p.name} className="truncate">{p.name}</div>
              ))}
              {ports.outputs.length === 0 && <div className="text-zinc-700 italic">None detected</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-sm font-medium ${ok ? "text-green-400" : "text-zinc-400"}`}>{value}</div>
    </div>
  );
}
