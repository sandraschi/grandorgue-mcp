import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MidiFile {
  name: string;
  size_bytes: number;
}

export default function PracticeStudio() {
  const [files, setFiles] = useState<MidiFile[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const loadFiles = useCallback(async () => {
    try {
      const r = await fetch("/api/midi-depot");
      const d = await r.json();
      if (d.success) setFiles(d.files || []);
    } catch {}
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const pollPlayback = useCallback(async () => {
    try {
      const r = await fetch("/api/midi/playback-status");
      const d = await r.json();
      setPlaying(d.playing || false);
    } catch {}
  }, []);

  useEffect(() => {
    pollRef.current = setInterval(pollPlayback, 2000);
    return () => clearInterval(pollRef.current);
  }, [pollPlayback]);

  const handlePlay = async () => {
    if (!selectedFile) return;
    setError(null);
    setStatus("");
    try {
      const r = await fetch("/api/midi/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedFile }),
      });
      const d = await r.json();
      if (d.success) {
        setPlaying(true);
        setStatus(`Playing: ${selectedFile}`);
      } else {
        setError(d.message || "Playback failed");
      }
    } catch (e) { setError(String(e)); }
  };

  const handleStop = async () => {
    try {
      await fetch("/api/midi/stop", { method: "POST" });
      setPlaying(false);
      setStatus("Stopped");
    } catch {}
  };

  const handlePlayGo = async () => {
    if (!selectedFile) return;
    try {
      const r = await fetch("/api/organs/last");
      const d = await r.json();
      if (d?.organ) {
        await fetch("/api/go/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      }
    } catch {}
    setError(null);
    try {
      const r = await fetch("/api/midi/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedFile }),
      });
      const d = await r.json();
      if (d.success) setStatus("Playing through GrandOrgue");
      else setError(d.message);
    } catch (e) { setError(String(e)); }
  };

  const handleBachBundle = async () => {
    setError(null);
    setStatus("Downloading Bach bundle...");
    try {
      const r = await fetch("/api/midi-depot/batch/bach", { method: "POST" });
      const d = await r.json();
      setStatus(`Downloaded ${d.count} Bach MIDI files`);
      await loadFiles();
    } catch (e) { setError(String(e)); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-amber-500">Bach Practice Studio</h1>
      <p className="text-sm text-zinc-400">Practice J.S. Bach organ works with speed control, looping, and MIDI playback through GrandOrgue.</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 mb-1 block">Select MIDI file</label>
            <select
              value={selectedFile}
              onChange={e => setSelectedFile(e.target.value)}
              className="w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Choose a file --</option>
              {files.map(f => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleBachBundle} className="px-3 py-2 bg-zinc-800 text-amber-400 rounded text-xs hover:bg-zinc-700 border border-zinc-700">
            Download Bach Bundle (176 files)
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={handlePlay} disabled={!selectedFile || playing} className="p-2.5 bg-green-900 text-green-300 rounded-lg hover:bg-green-800 disabled:opacity-30"><Play size={18} /></button>
            <button onClick={handleStop} disabled={!playing} className="p-2.5 bg-red-900 text-red-300 rounded-lg hover:bg-red-800 disabled:opacity-30"><Pause size={18} /></button>
            <button onClick={handlePlayGo} disabled={!selectedFile} className="px-3 py-2 bg-amber-900 text-amber-300 rounded-lg text-xs hover:bg-amber-800 disabled:opacity-30">
              Play in GrandOrgue
            </button>
          </div>
          <span className="text-xs text-zinc-500">{status}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500">Speed</label>
            <span className="text-xs font-mono text-zinc-400">{speed}%</span>
          </div>
          <input
            type="range" min={25} max={200} step={5} value={speed}
            onChange={e => setSpeed(parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>25%</span><span>50%</span><span>75%</span><span>100%</span><span>150%</span><span>200%</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Loop Section</span>
            <button
              onClick={() => setLoopStart(prev => prev !== null ? null : 0)}
              className={`px-2 py-1 rounded text-xs ${loopStart !== null ? 'bg-amber-900 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}
            >
              A {loopStart !== null ? `(${loopStart}s)` : ''}
            </button>
            <button
              onClick={() => setLoopEnd(prev => prev !== null ? null : 10)}
              className={`px-2 py-1 rounded text-xs ${loopEnd !== null ? 'bg-amber-900 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}
            >
              B {loopEnd !== null ? `(${loopEnd}s)` : ''}
            </button>
            {loopStart !== null && loopEnd !== null && (
              <span className="text-xs text-green-400">Looping A↔B</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm text-zinc-300 font-medium mb-2">Practice Tips</h3>
        <ul className="space-y-1 text-xs text-zinc-500">
          <li>• Start at 50-75% speed for difficult passages</li>
          <li>• Use loop A/B to repeat tricky sections</li>
          <li>• Download the Bach bundle for 176 organ works (BWV 525-771, 801-805)</li>
          <li>• "Play in GrandOrgue" routes MIDI through the pipe organ engine</li>
          <li>• Browse the <span className="text-zinc-400">Bach Catalog</span> for BWV numbers and work descriptions</li>
        </ul>
      </div>

      {error && <div className="bg-red-950/40 border border-red-800 text-red-300 px-4 py-2 rounded text-sm">{error}</div>}
    </div>
  );
}
