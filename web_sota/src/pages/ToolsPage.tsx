/** Tools page: live MCP tool inventory from GET /api/capabilities. */
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";

function groupOf(name: string): string {
  if (name.startsWith("midi_depot_")) return "MIDI depot";
  if (name.startsWith("go_midi_") || name === "go_panic") return "MIDI bridge";
  if (
    name.startsWith("go_play_") ||
    name.startsWith("go_set_") ||
    name === "go_combination" ||
    name === "go_send_sysex"
  )
    return "Performance";
  if (
    name.startsWith("go_") &&
    (name.includes("organ") ||
      name.includes("load") ||
      name.includes("marketplace") ||
      name.includes("bach"))
  )
    return "Organs & repertoire";
  if (name.startsWith("go_")) return "Process";
  return "Server";
}

export function ToolsPage() {
  const [tools, setTools] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const caps = await api.capabilities();
      setTools(caps.tools ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tools");
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tools.filter((t) => !q || t.toLowerCase().includes(q));
  }, [tools, query]);

  const groups = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of filtered) {
      const g = groupOf(t);
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(t);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="tools-page">
      <PageHero
        eyebrow="Agent surface"
        title="Tools"
        lead={`${tools.length} MCP tools exposed by this server. Agents call these; the REST API mirrors them under /api/* and /mcp.`}
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter tools..."
        data-testid="tools-search"
      />
      {loading && <p className="text-sm text-zinc-400">Loading tools…</p>}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}{" "}
          <button type="button" onClick={() => void refresh()} className="underline">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-zinc-400">
          No tools match. Clear the filter to see the full inventory.
        </p>
      )}
      <div className="space-y-4" data-testid="tools-list">
        {groups.map(([g, names]) => (
          <div key={g} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm font-medium text-organ-gold mb-2">
              {g} ({names.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {names.map((n) => (
                <code
                  key={n}
                  className="text-sm font-mono bg-zinc-800 text-zinc-300 px-2 py-1 rounded"
                >
                  {n}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
