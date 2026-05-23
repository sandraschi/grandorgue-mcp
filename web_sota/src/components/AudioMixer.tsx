import { useState } from "react";
import { Volume2 } from "lucide-react";
import { api } from "@/api/client";

const CHANNELS = [
  { name: "Swell", cc: 7 },
  { name: "Choir", cc: 8 },
  { name: "Solo", cc: 9 },
];

export default function AudioMixer() {
  const [levels, setLevels] = useState<Record<number, number>>({ 7: 100, 8: 100, 9: 100 });
  const [master, setMaster] = useState(100);

  const setLevel = (cc: number, value: number) => {
    setLevels((l) => ({ ...l, [cc]: value }));
    api.setEnclosure(cc, Math.round((value / 100) * 127));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-organ-gold">Audio Mixer</h1>

      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-4">
        <h2 className="text-sm text-zinc-400 flex items-center gap-2"><Volume2 size={14} /> Expression Pedals / Enclosures</h2>

        {CHANNELS.map((ch) => (
          <div key={ch.cc} className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-16">{ch.name}</span>
            <input
              type="range" min={0} max={100} value={levels[ch.cc] || 100}
              onChange={(e) => setLevel(ch.cc, +e.target.value)}
              className="flex-1"
            />
            <span className="text-xs text-zinc-500 w-8 text-right">{levels[ch.cc]}%</span>
          </div>
        ))}

        <div className="border-t border-zinc-800 pt-3 mt-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-300 font-medium w-16">Master</span>
            <input
              type="range" min={0} max={100} value={master}
              onChange={(e) => setMaster(+e.target.value)}
              className="flex-1"
            />
            <span className="text-xs text-organ-gold w-8 text-right font-medium">{master}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
