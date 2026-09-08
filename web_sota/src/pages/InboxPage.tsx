/**
 * Inbox page: live "needs attention" items derived from backend state.
 * Every item comes from a real endpoint; actions call real endpoints.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  severity: "warn" | "info";
  text: string;
  to?: string;
  action?: { label: string; run: () => Promise<void> };
}

export function InboxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, lastOrgan, depot, llm] = await Promise.all([
        api.status(),
        api.lastOrgan(),
        api.get("/midi-depot").catch(() => ({ files: [] })),
        api.llmProviders().catch(() => ({ providers: [] })),
      ]);
      const found: Item[] = [];
      if (!status.go_running) {
        found.push({
          id: "go-stopped",
          severity: "warn",
          text: "GrandOrgue is not running. Start it to play anything.",
          to: "/",
        });
      }
      if (status.go_running && !status.midi_connected) {
        found.push({
          id: "midi-off",
          severity: "warn",
          text: "MIDI bridge is disconnected.",
          action: {
            label: "Connect now",
            run: async () => {
              await api.midiConnect();
            },
          },
        });
      }
      if (!status.organ && !lastOrgan.organ) {
        found.push({
          id: "no-organ",
          severity: "warn",
          text: "No organ loaded and none remembered. Load a sample set.",
          to: "/library",
        });
      } else if (!status.organ && lastOrgan.organ) {
        const last = lastOrgan.organ;
        found.push({
          id: "autoload",
          severity: "info",
          text: `Last organ was ${last.name} — reload it with one click.`,
          action: {
            label: "Auto-load",
            run: async () => {
              await api.post("/organs/load", {
                name: last.name,
                path: last.path,
              });
            },
          },
        });
      }
      const files = depot.files ?? [];
      if (files.length > 0) {
        found.push({
          id: "depot",
          severity: "info",
          text: `${files.length} MIDI file${files.length === 1 ? "" : "s"} waiting in the depot.`,
          to: "/midi-player",
        });
      }
      const detected = (llm.providers ?? []).filter(
        (p: { models?: string[] }) => (p.models ?? []).length > 0,
      );
      if (detected.length === 0) {
        found.push({
          id: "no-llm",
          severity: "info",
          text: "No local LLM detected. Chat answers need Ollama or LM Studio.",
          to: "/settings",
        });
      }
      setItems(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inbox");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (item: Item) => {
    if (!item.action) return;
    setBusy(true);
    try {
      await item.action.run();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
    setBusy(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="inbox-page">
      <PageHero
        eyebrow="Attention"
        title="Inbox"
        lead="Things that need you — computed live from backend state, not a static list."
      />
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading || busy}
          data-testid="inbox-refresh"
        >
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}{" "}
          <button type="button" onClick={() => void refresh()} className="underline">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-zinc-400">
          All clear — organ running, MIDI connected, nothing waiting.
        </p>
      )}
      <div className="space-y-3" data-testid="inbox-list">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg p-4 border flex items-center justify-between gap-3 ${
              item.severity === "warn"
                ? "bg-amber-950/30 border-amber-800"
                : "bg-zinc-900 border-zinc-800"
            }`}
          >
            <p
              className={`text-sm ${item.severity === "warn" ? "text-amber-200" : "text-zinc-300"}`}
            >
              {item.text}
            </p>
            {item.to && (
              <Link to={item.to} className="shrink-0 text-sm text-organ-gold hover:underline">
                Open
              </Link>
            )}
            {item.action && (
              <Button size="sm" onClick={() => void runAction(item)} disabled={busy}>
                {item.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
