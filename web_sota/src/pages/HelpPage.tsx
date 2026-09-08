/** Help page: searchable guide with real routes, ports, endpoints, and docs. */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";

const GH = "https://github.com/sandraschi/grandorgue-mcp/blob/main";

const SECTIONS: Array<{
  title: string;
  body: string[];
  links: Array<{ label: string; to: string }>;
}> = [
  {
    title: "First run",
    body: [
      "Install GrandOrgue, add one free sample set, then: just install, just install-web, just web.",
      "Dashboard: Start GrandOrgue, then Connect MIDI. Configure GO to use the virtual MIDI ports.",
      "Settings: pick the auto-detected local LLM (Ollama :11434 or LM Studio :1234).",
    ],
    links: [{ label: "Onboarding doc", to: `${GH}/docs/ONBOARDING.md` }],
  },
  {
    title: "Ports & endpoints",
    body: [
      "Backend :11010 — REST /api/*, MCP at /mcp, WebSocket at /ws, liveness at /health (alias /api/v1/health).",
      "Frontend :11011 — Vite SPA proxying /api, /health and /ws to the backend.",
      "Full inventory: Tools page (/tools), skills (/skills), diagnostics (/api/v1/diagnostics).",
    ],
    links: [{ label: "Configuration doc", to: `${GH}/docs/CONFIGURATION.md` }],
  },
  {
    title: "Playing & MIDI",
    body: [
      "Console page plays notes live; Player page plays depot MIDI files through GO's engine.",
      "Renaming MIDI ports while connected is rejected — disconnect first.",
      "Panic (all-notes-off) is on the Dashboard and the /console page.",
    ],
    links: [{ label: "MIDI setup", to: `${GH}/docs/MIDI_SETUP.md` }],
  },
  {
    title: "AI chat",
    body: [
      "Chat (/chat) streams via the backend proxy POST /api/llm/chat/stream — keys never leave the server.",
      "Floating button works everywhere; the Chat page adds presets, personalities, refine, and export.",
      "Logs page Analyze sends the current view to the selected model.",
    ],
    links: [{ label: "Tool reference", to: `${GH}/docs/MCP_TOOLS.md` }],
  },
  {
    title: "Troubleshooting",
    body: [
      "Backend offline box: run uv run grandorgue-mcp or .\\start.ps1 from the repo root.",
      "Port zombie: just zombies lists, just zombie-clean clears :11010/:11011.",
      "UI organ load needs pywinauto-mcp (:10788); path load does not.",
    ],
    links: [{ label: "Troubleshooting doc", to: `${GH}/docs/TROUBLESHOOTING.md` }],
  },
];

export function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      body: s.body.filter((b) => b.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)),
    })).filter((s) => s.body.length > 0);
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="help-page">
      <PageHero
        eyebrow="Guide"
        title="Help"
        lead="How this console works, where things live, and what to do when they don't."
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search help..."
        data-testid="help-search"
      />
      {filtered.length === 0 && (
        <p className="text-sm text-zinc-400">Nothing matches. Try “MIDI”, “port”, or “chat”.</p>
      )}
      <div className="space-y-4" data-testid="help-list">
        {filtered.map((s) => (
          <div key={s.title} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm font-medium text-organ-gold mb-2">{s.title}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
              {s.body.map((b) => (
                <li key={b.slice(0, 48)}>{b}</li>
              ))}
            </ul>
            <div className="mt-2 flex gap-3">
              {s.links.map((l) => (
                <a
                  key={l.label}
                  href={l.to}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-organ-gold hover:underline"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-500">
        Prefer the agent view?{" "}
        <Link to="/tools" className="text-organ-gold hover:underline">
          Tools
        </Link>{" "}
        and{" "}
        <Link to="/skills" className="text-organ-gold hover:underline">
          Skills
        </Link>{" "}
        list the machine surface.
      </p>
    </div>
  );
}
