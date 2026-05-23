import { useState } from "react";
import { Circle, Square } from "lucide-react";

export default function RecordPanel() {
  const [recording, setRecording] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-organ-gold">MIDI Recorder</h1>

      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setRecording(!recording)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              recording ? "bg-red-900 text-red-300 hover:bg-red-800" : "bg-organ-gold/20 text-organ-gold hover:bg-organ-gold/30"
            }`}
          >
            {recording ? <><Square size={14} /> Stop</> : <><Circle size={14} /> Record</>}
          </button>
          {recording && (
            <span className="flex items-center gap-2 text-red-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording...
            </span>
          )}
        </div>

        <div className="text-xs text-zinc-600">
          MIDI recording captures all note and stop events. GrandOrgue saves recordings as standard MIDI files (.mid).
          Connect GrandOrgue to the MCP MIDI ports and use the built-in GO recorder for full functionality.
        </div>
      </div>
    </div>
  );
}
