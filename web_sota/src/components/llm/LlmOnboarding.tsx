/**
 * LLM onboarding (vendored from mcp-central-docs/templates/llm/LlmOnboarding.tsx,
 * adapted to grandorgue-mcp's local-only build: no cloud providers, no keys,
 * no install runner here — selection only, model picked on Settings).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchOnboarding,
  fetchProviders,
  isOnboarded,
  loadSelection,
  markOnboarded,
  type OnboardingState,
  type ProviderInfo,
  saveSelection,
} from "@/lib/llm";
import { cn } from "@/lib/utils";

type Props = {
  /** banner: render only when setup is incomplete. full: always render status + setup. */
  mode: "banner" | "full";
};

export function LlmOnboarding({ mode }: Props) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(mode === "full");
  const [choice, setChoice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(isOnboarded());

  useEffect(() => {
    (async () => {
      try {
        const [ob, pv] = await Promise.all([fetchOnboarding(), fetchProviders().catch(() => null)]);
        setState(ob);
        if (pv) setProviders(pv.providers);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (mode === "full") setExpanded(true);
  }, [mode]);

  if (loading || error || !state) return null;

  const detectedLocals = providers.filter((p) => p.kind === "local" && p.detected);
  const ready = detectedLocals.length > 0;

  if (mode === "banner" && (ready || done)) return null;

  const recModel = state.recommendation.path.split(":").slice(1).join(":") || "llama3.2:3b";

  async function save() {
    if (!choice) return;
    setSaving(true);
    setError(null);
    try {
      const id = choice.slice("local:".length);
      // No-auto-pick: keep a previous explicit choice, else empty. The model
      // itself is picked on the Settings surface.
      const prev = loadSelection();
      const model = (prev.provider === id && prev.model) || "";
      saveSelection(id, model);
      markOnboarded();
      setDone(true);
      const pv = await fetchProviders().catch(() => null);
      if (pv) setProviders(pv.providers);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      data-testid="llm-onboarding"
      className={cn(
        "border p-4 md:p-5",
        ready ? "border-border/60" : "border-red-500/50 bg-red-500/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {ready ? "AI provider ready" : "Set up AI to enable chat"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            {ready
              ? "A local engine is detected. Change providers anytime in Settings."
              : state.recommendation.reason}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "banner" && !ready && !expanded && (
            <Button
              data-testid="onboarding-cue"
              onClick={() => setExpanded(true)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Set up AI
            </Button>
          )}
          {mode === "banner" && (
            <Link to="/settings" className="text-sm text-zinc-400 hover:text-zinc-100 px-2 py-1">
              Settings
            </Link>
          )}
        </div>
      </div>

      {(expanded || mode === "full") && !done && (
        <div className="mt-4 space-y-2" data-testid="onboarding-paths">
          {detectedLocals.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer",
                choice === `local:${p.id}` ? "border-primary/60 bg-primary/5" : "border-border/40",
              )}
            >
              <input
                type="radio"
                name="llm-path"
                checked={choice === `local:${p.id}`}
                onChange={() => setChoice(`local:${p.id}`)}
              />
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">{p.label}</span>
              <span className="text-muted-foreground text-sm">
                detected · free · {p.models?.length ?? 0} models
              </span>
            </label>
          ))}

          {state.locals.length > 0 && detectedLocals.length === 0 && (
            <p className="text-sm text-muted-foreground rounded-lg border border-border/40 px-3 py-2">
              No local engine running. Free path: install Ollama (
              <code className="font-mono">winget install -e --id Ollama.Ollama</code>, then{" "}
              <code className="font-mono">ollama pull {recModel}</code>) and come back — or use the
              one-click install on the Settings page.
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={save}
              disabled={saving || !choice}
              data-testid="onboarding-save"
            >
              {saving ? "Saving…" : "Use this setup"}
            </Button>
          </div>
        </div>
      )}

      {done && mode === "full" && (
        <p className="text-sm text-green-400 mt-3">Saved. Chat is enabled with your selection.</p>
      )}
    </Card>
  );
}
