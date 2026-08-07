import { Moon, Music2, Power, PowerOff, ServerCrash, Sun, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type OrganStatus } from "@/api/client";

// EXPERIMENTAL light mode (invert hack). Not fleet standard — see index.css.
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

export default function Topbar() {
  const [status, setStatus] = useState<OrganStatus | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const { light, toggle } = useExperimentalTheme();

  useEffect(() => {
    const poll = () =>
      api
        .status()
        .then((s) => {
          setStatus(s);
          setBackendOnline(true);
        })
        .catch(() => {
          setStatus(null);
          setBackendOnline(false);
        });
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <header className="h-12 flex items-center gap-4 px-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <span className="font-serif text-organ-gold text-lg tracking-wide">GrandOrgue Console</span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={toggle}
        className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        title={light ? "Switch to dark (experimental light mode)" : "Switch to light (experimental, ugly)"}
        aria-label="Toggle light mode (experimental)"
      >
        {light ? <Moon size={14} /> : <Sun size={14} />}
      </button>
      <div className="flex items-center gap-3 text-xs">
        {backendOnline ? (
          <span className="flex items-center gap-1 text-green-500">
            <Wifi size={12} /> API
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-400">
            <ServerCrash size={12} /> API offline
          </span>
        )}
        {status?.midi_connected ? (
          <span className="flex items-center gap-1 text-green-500">
            <Wifi size={12} /> MIDI
          </span>
        ) : (
          <span className="flex items-center gap-1 text-zinc-600">
            <WifiOff size={12} /> MIDI
          </span>
        )}
        {status?.go_running ? (
          <span className="flex items-center gap-1 text-green-500">
            <Power size={12} /> GO
          </span>
        ) : (
          <span className="flex items-center gap-1 text-zinc-600">
            <PowerOff size={12} /> GO
          </span>
        )}
        {status?.organ?.name && (
          <span className="flex items-center gap-1 text-organ-gold">
            <Music2 size={12} /> {status.organ.name}
          </span>
        )}
        {status?.go_version && <span className="text-zinc-500">v{status.go_version}</span>}
      </div>
    </header>
  );
}
