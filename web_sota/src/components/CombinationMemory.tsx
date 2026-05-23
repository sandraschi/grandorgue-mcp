import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { api } from "@/api/client";

const GENERALS = Array.from({ length: 10 }, (_, i) => i + 1);
const DIVISIONALS = Array.from({ length: 6 }, (_, i) => i + 1);

export default function CombinationMemory() {
  const [active, setActive] = useState<number>(0);

  const trigger = (num: number) => {
    setActive(num);
    api.combination(num);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-organ-gold">Combination Memory</h1>

      <section>
        <h2 className="text-sm text-zinc-400 mb-3 flex items-center gap-2"><Save size={14} /> Generals (1-10)</h2>
        <div className="flex gap-2 flex-wrap">
          {GENERALS.map((n) => (
            <button
              key={n}
              onClick={() => trigger(n)}
              className={`w-12 h-12 rounded-full text-sm font-medium transition-all
                ${active === n ? "bg-organ-gold text-zinc-900 ring-2 ring-organ-gold/50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm text-zinc-400 mb-3 flex items-center gap-2"><RotateCcw size={14} /> Divisionals</h2>
        <div className="space-y-3">
          {["Great", "Swell", "Choir", "Pedal"].map((div) => (
            <div key={div} className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 w-12">{div}</span>
              <div className="flex gap-1">
                {DIVISIONALS.map((n) => (
                  <button
                    key={n}
                    onClick={() => trigger(n + 10)}
                    className="w-8 h-8 rounded text-xs bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
