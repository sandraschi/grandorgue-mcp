import { AlphaTabApi, PlayerOutputMode } from "@coderline/alphatab";
import {
  Church,
  FileDown,
  ListMusic,
  Music,
  Music2,
  Play,
  Search,
  SkipBack,
  Square,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";

interface MidiFileEntry {
  name: string;
  size_bytes: number;
  modified: number;
}

export default function MidiPlayer() {
  const [files, setFiles] = useState<MidiFileEntry[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [goPlaying, setGoPlaying] = useState(false);
  const [goError, setGoError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/midi-depot")
      .then((r: any) => setFiles(r.files ?? []))
      .catch(() => {});

    if (!viewportRef.current || apiRef.current) return;

    const at = new AlphaTabApi(wrapperRef.current ?? viewportRef.current, {
      core: { scriptFile: null, tex: true },
      display: {
        layoutMode: "page",
        staveProfile: "Score",
        scale: 0.85,
        resources: {
          staffLineColor: "#52525b",
          barSeparatorColor: "#a1a1aa",
          mainGlyphColor: "#e4e4e7",
          secondaryGlyphColor: "#a1a1aa",
          scoreInfoColor: "#d4d4d8",
        },
      },
      player: {
        enablePlayer: true,
        soundFont:
          "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2",
        outputMode: PlayerOutputMode.WebAudioScriptProcessor,
      },
    });

    at.scoreLoaded.on((score) => {
      if (score.title) setCurrent(score.title);
      setPlaying(true);
    });

    at.playerStateChanged.on((e) => {
      setPlaying(e.state === 1);
    });

    apiRef.current = at;

    return () => {
      at.destroy();
      apiRef.current = null;
    };
  }, []);

  const loadFile = async (name: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/midi-depot/${encodeURIComponent(name)}/raw`);
      const buf = await r.arrayBuffer();
      apiRef.current?.load(new Uint8Array(buf));
      setCurrent(name);
    } catch {
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  };

  const playThroughGo = async () => {
    if (!current) return;
    setGoError(null);
    try {
      const r = await api.post("/midi/play", { name: current });
      setGoPlaying(Boolean(r.playing ?? true));
    } catch (err: any) {
      setGoPlaying(false);
      setGoError(err?.message || "GO playback failed. Is the MIDI bridge connected?");
    }
  };

  const stopGoPlayback = async () => {
    setGoError(null);
    try {
      await api.post("/midi/stop", {});
    } catch {
      // stop is best-effort
    } finally {
      setGoPlaying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-serif text-organ-gold">MIDI Player</h1>
        <div className="flex-1" />
        <button
          onClick={playThroughGo}
          disabled={!current || goPlaying}
          title="Play through GrandOrgue's pipe organ engine (requires MIDI bridge connected)"
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-organ-gold/20 text-organ-gold rounded-lg hover:bg-organ-gold/30 disabled:opacity-40 transition-colors"
        >
          <Church size={14} /> Play in GO
        </button>
        <button
          onClick={stopGoPlayback}
          disabled={!goPlaying}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          <Square size={14} /> Stop GO
        </button>
        <button
          onClick={() => apiRef.current?.play()}
          disabled={playing || !current}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-900 text-green-300 rounded-lg hover:bg-green-800 disabled:opacity-40 transition-colors"
        >
          <Play size={14} /> Play
        </button>
        <button
          onClick={() => apiRef.current?.pause()}
          disabled={!playing}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          <Square size={14} /> Pause
        </button>
        <button
          onClick={() => apiRef.current?.stop()}
          disabled={!current}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          <SkipBack size={14} /> Stop
        </button>
        {current && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 truncate max-w-xs">
            <Music size={12} className="text-organ-gold shrink-0" />
            <span className="truncate">{current}</span>
          </div>
        )}
      </div>

      {goError && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-2 text-xs text-amber-200">
          {goError}
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 border-b border-zinc-800">
            <ListMusic size={12} /> Load from depot
          </div>
          <div className="p-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-800 text-zinc-200 rounded border border-zinc-700 focus:outline-none focus:border-organ-gold/50 placeholder-zinc-600"
              />
            </div>
            <div className="mt-1.5 max-h-40 overflow-y-auto space-y-0.5">
              {files
                .filter((f) => !query || f.name.toLowerCase().includes(query.toLowerCase()))
                .map((f) => (
                  <button
                    key={f.name}
                    onClick={() => loadFile(f.name)}
                    disabled={loading}
                    className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs rounded transition-colors disabled:opacity-40 ${
                      current === f.name
                        ? "bg-organ-gold/20 text-organ-gold"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <FileDown size={10} className="shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <div
        ref={wrapperRef}
        className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden min-h-[400px] [&_.at-viewport]:p-4 [&_svg]:max-w-full"
      >
        {!current && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-600">
            <Music2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Select a MIDI file to view notation</p>
            <p className="text-xs mt-1">Files are loaded from the MIDI Depot</p>
          </div>
        )}
        <div ref={viewportRef} className={current ? "" : "hidden"} />
      </div>
    </div>
  );
}
