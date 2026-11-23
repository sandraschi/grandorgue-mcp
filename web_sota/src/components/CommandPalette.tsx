import {
  AlertTriangle,
  CornerDownLeft,
  Link as LinkIcon,
  type LucideIcon,
  Play,
  Search,
  Square,
  Unlink,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { NAV_GROUPS } from "@/lib/nav";
import { useStatusStore } from "@/store/status";
import { OPEN_PALETTE_EVENT } from "./Topbar";

interface Entry {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  haystack: string;
  run: () => unknown;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { status, refresh } = useStatusStore();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const act = (fn: () => Promise<unknown>) => async () => {
      try {
        await fn();
      } finally {
        await refresh();
      }
    };
    const pages: Entry[] = NAV_GROUPS.flatMap((g) =>
      g.items.map((i) => ({
        id: `nav:${i.to}`,
        label: i.label,
        hint: g.title,
        icon: i.icon,
        haystack: `${i.label} ${g.title} ${i.keywords ?? ""}`.toLowerCase(),
        run: () => navigate(i.to),
      })),
    );
    const actions: Entry[] = [
      {
        id: "act:panic",
        label: "Panic: all notes off",
        hint: "Action",
        icon: AlertTriangle,
        haystack: "panic all notes off silence stuck",
        run: act(() => api.panic()),
      },
      {
        id: "act:go-start",
        label: "Start GrandOrgue",
        hint: "Action",
        icon: Play,
        haystack: "start launch grandorgue go",
        run: act(() => api.goStart()),
      },
      {
        id: "act:go-stop",
        label: "Stop GrandOrgue",
        hint: "Action",
        icon: Square,
        haystack: "stop quit close grandorgue go",
        run: act(() => api.goStop()),
      },
      {
        id: "act:midi",
        label: status?.midi_connected ? "Disconnect MIDI" : "Connect MIDI",
        hint: "Action",
        icon: status?.midi_connected ? Unlink : LinkIcon,
        haystack: "midi connect disconnect bridge",
        run: act(() => (status?.midi_connected ? api.midiDisconnect() : api.midiConnect())),
      },
    ];
    return [...actions, ...pages];
  }, [navigate, refresh, status?.midi_connected]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return entries;
    return entries.filter((e) => terms.every((t) => e.haystack.includes(t)));
  }, [entries, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const choose = (e: Entry | undefined) => {
    if (!e) return;
    close();
    void e.run();
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/60"
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4">
          <Search size={16} className="text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Go to a page or run an action..."
            aria-label="Search pages and actions"
            className="h-12 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-zinc-400">Nothing matches.</li>
          )}
          {results.map((e, i) => {
            const Icon = e.icon;
            const active = i === index;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  aria-current={active}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => choose(e)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    active ? "bg-organ-gold/15 text-organ-gold" : "text-zinc-200"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{e.label}</span>
                  <span className="text-xs text-zinc-500">{e.hint}</span>
                  {active && <CornerDownLeft size={12} className="text-zinc-400" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
