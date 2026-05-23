import { useState } from "react";
import { api } from "@/api/client";
import ManualKeyboard from "./ManualKeyboard";
import StopPanel from "./StopPanel";

const MANUALS = [
  { name: "Great", channel: 0, firstNote: 36, noteCount: 61 },
  { name: "Swell", channel: 1, firstNote: 36, noteCount: 61 },
  { name: "Choir", channel: 2, firstNote: 36, noteCount: 61 },
  { name: "Pedal", channel: 3, firstNote: 24, noteCount: 32 },
];

const STOPS = [
  { name: "Bourdon 16'", cc: 20, manual: "Pedal" },
  { name: "Principal 8'", cc: 21, manual: "Great" },
  { name: "Rohrflote 8'", cc: 22, manual: "Great" },
  { name: "Octave 4'", cc: 23, manual: "Great" },
  { name: "Superoctave 2'", cc: 24, manual: "Great" },
  { name: "Mixture IV", cc: 25, manual: "Great" },
  { name: "Gamba 8'", cc: 26, manual: "Swell" },
  { name: "Voix Celeste 8'", cc: 27, manual: "Swell" },
  { name: "Flute 4'", cc: 28, manual: "Swell" },
  { name: "Oboe 8'", cc: 29, manual: "Swell" },
  { name: "Trompette 8'", cc: 30, manual: "Great" },
  { name: "Gedackt 8'", cc: 31, manual: "Choir" },
  { name: "Tremulant", cc: 40, manual: "Great", isTrem: true },
];

export default function OrganConsole() {
  const [stops, setStops] = useState<Record<number, boolean>>({});
  const [crescendo, setCrescendo] = useState(0);

  const toggleStop = (cc: number) => {
    const next = !stops[cc];
    setStops((s) => ({ ...s, [cc]: next }));
    api.setStop(cc, next);
  };

  const setAllStops = (state: boolean) => {
    const next: Record<number, boolean> = {};
    STOPS.forEach((s) => (next[s.cc] = state));
    setStops(next);
    STOPS.forEach((s) => api.setStop(s.cc, state));
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-serif text-organ-gold">Console</h1>
        <div className="flex gap-2">
          <button onClick={() => setAllStops(true)} className="px-3 py-1 text-xs bg-green-900 text-green-300 rounded">Tutti</button>
          <button onClick={() => setAllStops(false)} className="px-3 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">Clear</button>
          <button onClick={() => api.panic()} className="px-3 py-1 text-xs bg-red-900 text-red-300 rounded">Panic</button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Crescendo</span>
          <input
            type="range" min={0} max={127} value={crescendo}
            onChange={(e) => { const v = +e.target.value; setCrescendo(v); api.setCrescendo(v); }}
            className="w-32"
          />
          <span className="text-xs text-zinc-500 w-8">{crescendo}</span>
        </div>
      </div>

      <StopPanel stops={STOPS} stopState={stops} onToggle={toggleStop} />

      {MANUALS.map((m) => (
        <div key={m.name} className="space-y-1">
          <div className="text-xs text-zinc-500 font-medium">{m.name}</div>
          <ManualKeyboard
            firstNote={m.firstNote}
            noteCount={m.noteCount}
            channel={m.channel}
            isPedal={m.name === "Pedal"}
          />
        </div>
      ))}
    </div>
  );
}
