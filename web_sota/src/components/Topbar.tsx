import {
  AlertTriangle,
  Check,
  Moon,
  Music2,
  Power,
  PowerOff,
  Search,
  ServerCrash,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { titleForPath } from "@/lib/nav";
import { useStatusStore } from "@/store/status";

// EXPERIMENTAL light mode (invert hack). Not fleet standard, see index.css.
// Toggling `.dark` off the root flips the invert filter; persisted so the
// choice survives reloads. Delete this + the CSS block to revert.
const THEME_KEY = "grandorgue-light-mode";

function useExperimentalTheme() {
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !light);
    try {
      localStorage.setItem(THEME_KEY, light ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [light]);

  return { light, toggle: () => setLight((v) => !v) };
}

function Pill({ ok, children, title }: { ok: boolean; children: ReactNode; title: string }) {
  return (
    <span
      title={title}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        ok
          ? "border-green-800 bg-green-950/60 text-green-300"
          : "border-zinc-700 bg-zinc-800/60 text-zinc-300"
      }`}
    >
      {children}
    </span>
  );
}

export const OPEN_PALETTE_EVENT = "go:open-palette";

export default function Topbar() {
  const { status, backendOnline } = useStatusStore();
  const { light, toggle } = useExperimentalTheme();
  const { pathname } = useLocation();
  const page = titleForPath(pathname);
  const [panicSent, setPanicSent] = useState(false);

  const panic = async () => {
    try {
      await api.panic();
      setPanicSent(true);
      setTimeout(() => setPanicSent(false), 1500);
    } catch {
      // backend offline: the API pill already says so
    }
  };

  return (
    <header
      data-testid="topbar"
      className="h-12 flex items-center gap-3 px-4 bg-zinc-900 border-b border-zinc-800 shrink-0"
    >
      <span className="font-serif text-lg tracking-wide text-organ-gold">
        GrandOrgue Console
        {page && <span className="ml-2 text-sm font-sans text-zinc-400">/ {page}</span>}
      </span>
      <div className="flex-1" />

      <button
        type="button"
        data-testid="open-palette"
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
        className="hidden md:flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
        aria-label="Open command palette"
      >
        <Search size={13} /> Jump to...
        <kbd className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-200">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-2">
        {backendOnline ? (
          <Pill ok title="Backend API reachable">
            <Wifi size={12} /> API
          </Pill>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-red-800 bg-red-950/60 px-2.5 py-1 text-xs font-medium text-red-300">
            <ServerCrash size={12} /> API offline
          </span>
        )}
        <Pill ok={!!status?.midi_connected} title="MIDI bridge to GrandOrgue">
          {status?.midi_connected ? <Wifi size={12} /> : <WifiOff size={12} />} MIDI
        </Pill>
        <Pill ok={!!status?.go_running} title="GrandOrgue process">
          {status?.go_running ? <Power size={12} /> : <PowerOff size={12} />} GO
        </Pill>
        {status?.organ?.name && (
          <span
            className="hidden lg:flex items-center gap-1.5 max-w-56 text-xs text-organ-gold"
            title={status.organ.name}
          >
            <Music2 size={12} className="shrink-0" />
            <span className="truncate">{status.organ.name}</span>
          </span>
        )}
        {status?.go_version && (
          <span className="hidden xl:inline text-xs text-zinc-400">v{status.go_version}</span>
        )}
      </div>

      <button
        type="button"
        data-testid="panic-button"
        onClick={panic}
        disabled={!backendOnline}
        className="flex items-center gap-1.5 rounded-lg border border-red-700 bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/60 disabled:opacity-40 transition-colors"
        title="Panic: release every note and silence all pipes"
        aria-label="Panic: all notes off"
      >
        {panicSent ? <Check size={13} /> : <AlertTriangle size={13} />}
        {panicSent ? "Silenced" : "Panic"}
      </button>

      <button
        type="button"
        onClick={toggle}
        className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        title={
          light
            ? "Switch to dark (experimental light mode)"
            : "Switch to light (experimental, ugly)"
        }
        aria-label="Toggle light mode (experimental)"
      >
        {light ? <Moon size={14} /> : <Sun size={14} />}
      </button>
    </header>
  );
}
