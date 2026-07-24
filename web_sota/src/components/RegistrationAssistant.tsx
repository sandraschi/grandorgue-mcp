import { Lightbulb, Sparkles } from "lucide-react";
import { useState } from "react";

interface Suggestion {
  name: string;
  stops: string;
  description: string;
}

const SUGGESTION_PROMPTS = [
  "Suggest a full-plenum registration for Buxtehude on a North German Baroque organ",
  "Suggest soft 8' flute stops for a Bach chorale prelude",
  "Suggest Romantic swell registration for a Franck piece",
  "Suggest a French Classical registration for a Couperin dialogue",
  "Suggest a solo stop for a Bach aria melody line",
  "Suggest a massive tutti registration for a Widor toccata finale",
];

export default function RegistrationAssistant() {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async (text?: string) => {
    const query = text || prompt;
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: localStorage.getItem("llm_provider") || "ollama",
          model: localStorage.getItem("llm_model") || "llama3.2:3b",
          prompt: query,
          system: "You are a pipe organ registration expert. Suggest 2-3 stop combinations for the given piece/organ/style. For each suggestion, provide: a name, the specific stops to draw (as a comma-separated list), and a brief explanation of why this registration works. Format as JSON array: [{\"name\": \"...\", \"stops\": \"...\", \"description\": \"...\"}]. Respond with ONLY the JSON, no other text.",
        }),
      });
      const data = await r.json();
      const content = data.response || data.content || "[]";
      let parsed: Suggestion[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch {
        parsed = [{ name: "Suggested Registration", stops: content.substring(0, 200), description: "Raw suggestion from LLM" }];
      }
      setSuggestions(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="text-amber-500" size={24} />
        <h1 className="text-2xl font-serif text-amber-500">Registration Assistant</h1>
      </div>

      <p className="text-sm text-zinc-400">
        Ask for registration suggestions for any piece, composer, style, or organ. The AI will suggest stop combinations based on historical practice and organ tradition.
      </p>

      <div className="flex flex-wrap gap-2">
        {SUGGESTION_PROMPTS.slice(0, 4).map((sp, i) => (
          <button key={i} onClick={() => { setPrompt(sp); handleSuggest(sp); }} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700 hover:text-zinc-100 transition-colors">
            {sp.substring(0, 50)}...
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSuggest()}
          placeholder="e.g., Suggest a plenum for Bach's Toccata in F on a Silbermann organ..."
          className="flex-1 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-lg px-4 py-3 text-sm"
        />
        <button
          onClick={() => handleSuggest()}
          disabled={loading || !prompt.trim()}
          className="px-5 py-3 bg-amber-600 text-black rounded-lg text-sm font-medium hover:bg-amber-500 disabled:opacity-30 flex items-center gap-2"
        >
          <Lightbulb size={16} /> {loading ? "Thinking..." : "Suggest"}
        </button>
      </div>

      {error && <div className="bg-red-950/40 border border-red-800 text-red-300 px-4 py-2 rounded text-sm">{error}</div>}

      {suggestions.length > 0 && (
        <div className="grid gap-4">
          {suggestions.map((s, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-amber-400">{s.name}</h3>
              </div>
              <div className="bg-zinc-950 rounded p-3 mb-2 font-mono text-xs text-zinc-300 leading-relaxed">
                {s.stops}
              </div>
              <p className="text-xs text-zinc-500">{s.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
