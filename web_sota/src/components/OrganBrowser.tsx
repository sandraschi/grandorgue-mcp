import { useEffect, useState } from "react";
import { Download, Globe, RotateCcw, RefreshCw } from "lucide-react";
import { api } from "@/api/client";

export default function OrganBrowser() {
  const [installed, setInstalled] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    api.organs().then((d) => { setInstalled(d.installed); setCatalog(d.catalog); }).catch(() => {});
  }, []);

  const handleLoad = async (name: string) => {
    setLoading(name);
    try {
      await api.post("/organs/load", { name });
    } catch {}
    setLoading(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-organ-gold">Organ Library</h1>

      <section>
        <h2 className="text-sm text-zinc-400 mb-3 flex items-center gap-2"><Download size={14} /> Installed Sample Sets</h2>
        {installed.length === 0 ? (
          <p className="text-zinc-600 text-sm">No sample sets installed. Download free sets from the catalog below.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {installed.map((o) => (
              <div key={o.name} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-organ-gold/30 transition-colors">
                <div className="font-medium text-zinc-200">{o.name}</div>
                <div className="text-xs text-zinc-600 mt-1 truncate">{o.path}</div>
                <button onClick={() => handleLoad(o.name)} disabled={loading === o.name} className="mt-3 px-3 py-1 text-xs bg-organ-gold/20 text-organ-gold rounded hover:bg-organ-gold/30 disabled:opacity-50">
                  {loading === o.name ? "Loading..." : "Load"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm text-zinc-400 mb-3 flex items-center gap-2"><Globe size={14} /> Free Sample Set Catalogs</h2>
        <div className="grid grid-cols-2 gap-3">
          {catalog.map((c) => (
            <div key={c.name} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="font-medium text-zinc-200">{c.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{c.description}</div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300">
                  Visit website
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
