/** Skills page: live skill inventory from GET /api/skills. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

interface Skill {
  id?: string;
  name: string;
  description: string;
  uri?: string;
}

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/skills");
      setSkills(Array.isArray(data) ? data : (data.skills ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="skills-page">
      <PageHero
        eyebrow="Agent surface"
        title="Skills"
        lead="Skill packs the chat pages load as their base system prompt (skill-first)."
      />
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
          data-testid="skills-refresh"
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
      {!loading && !error && skills.length === 0 && (
        <p className="text-sm text-zinc-400">No skills registered on the backend.</p>
      )}
      <div className="grid gap-4" data-testid="skills-list">
        {skills.map((s) => (
          <Card key={s.name} className="p-4">
            <CardTitle>{s.name}</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">{s.description}</p>
            {s.uri && <p className="mt-1 text-sm font-mono text-zinc-500">{s.uri}</p>}
            <Link to="/chat" className="mt-3 inline-block text-sm text-organ-gold hover:underline">
              Open in chat
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
