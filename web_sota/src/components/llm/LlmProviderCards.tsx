/**
 * Provider cards (vendored from mcp-central-docs/templates/llm/LlmProviderCards.tsx,
 * adapted to grandorgue-mcp's local-only build: local engines with Test and
 * one-click Ollama install (POST /api/llm/install). No cloud/key flows exist
 * in this build, so those sections are omitted rather than stubbed.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchModels, installStatus, type ProviderInfo, startInstall } from "@/lib/llm";
import { cn } from "@/lib/utils";

type Props = {
  providers: ProviderInfo[];
  probing: boolean;
  selected: string;
  /** Called after install so the parent re-probes. */
  onChanged: (providerId: string) => Promise<void> | void;
};

export function LlmProviderCards({ providers, probing, selected, onChanged }: Props) {
  const [cardMsg, setCardMsg] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<string | null>(null);

  const localProviders = providers.filter((p) => p.kind === "local");

  function statusDot(p: ProviderInfo) {
    if (probing) return <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />;
    return p.detected ? (
      <span className="h-2 w-2 rounded-full bg-green-500" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
    );
  }

  function statusText(p: ProviderInfo): string {
    if (probing) return "Probing…";
    return p.detected ? `Detected · ${p.models?.length ?? 0} models` : "Not found";
  }

  async function testProvider(id: string) {
    setCardMsg((m) => ({ ...m, [id]: "Testing…" }));
    try {
      const m = await fetchModels(id);
      setCardMsg((m2) => ({
        ...m2,
        [id]: m.models.length
          ? `${m.models.length} models (${m.source})`
          : `No models (${m.source})`,
      }));
    } catch (e) {
      setCardMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : String(e) }));
    }
  }

  async function installOllama() {
    setInstalling(true);
    setInstallMsg("Starting winget install…");
    try {
      await startInstall("ollama");
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const st = await installStatus("ollama");
        if (st.state === "done") {
          setInstallMsg("Installed. Re-probing…");
          await onChanged("ollama");
          setInstallMsg("Ollama installed and detected. Pull a model: ollama pull llama3.2:3b");
          break;
        }
        if (st.state === "error") {
          setInstallMsg(`Install failed: ${(st.output ?? "").slice(-300) || "see backend logs"}`);
          break;
        }
        setInstallMsg(`Installing… (${i * 5 + 5}s)`);
      }
    } catch (e) {
      setInstallMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  }

  if (localProviders.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground font-medium">Local engines (free)</p>
        {localProviders.map((p) => (
          <Card
            key={p.id}
            data-testid={`llm-provider-card-${p.id}`}
            className={cn("p-4 space-y-2", p.id === selected && "border-primary/50")}
          >
            <div className="flex items-center gap-2">
              {statusDot(p)}
              <span className="text-sm font-semibold">{p.label}</span>
              <span className="text-[10px] rounded bg-muted/50 px-1.5 py-0.5 text-muted-foreground">
                local · free
              </span>
              <span className="text-sm text-muted-foreground ml-auto">{statusText(p)}</span>
            </div>
            {p.id === "ollama" && !p.detected && !probing && (
              <div className="text-sm text-muted-foreground rounded border border-border/40 px-2 py-1.5 space-y-2">
                <p>
                  Not running. Manual:{" "}
                  <code className="font-mono">winget install -e --id Ollama.Ollama</code> then{" "}
                  <code className="font-mono">ollama pull llama3.2:3b</code> — or see the{" "}
                  <Link to="/help" className="underline">
                    help page
                  </Link>
                  .
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    data-testid="llm-install-ollama"
                    disabled={installing}
                    onClick={() => void installOllama()}
                  >
                    {installing ? "Installing…" : "Install Ollama now"}
                  </Button>
                  {installMsg && <span>{installMsg}</span>}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                data-testid={`llm-test-${p.id}`}
                onClick={() => void testProvider(p.id)}
              >
                Test
              </Button>
              {cardMsg[p.id] && (
                <span className="text-sm text-muted-foreground self-center">{cardMsg[p.id]}</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
