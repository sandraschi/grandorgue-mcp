import { useEffect, useState } from "react";
import { Search, Download, Globe, Music } from "lucide-react";
import { api } from "@/api/client";

interface SampleSet {
  name: string;
  path: string;
  url: string | null;
  description: string;
  manuals: number;
  stops: number;
  is_free: boolean;
  installed: boolean;
  size_hint?: string;
  style?: string;
  creator?: string;
}

export default function Marketplace() {
  const [installed, setInstalled] = useState<SampleSet[]>([]);
  const [catalog, setCatalog] = useState<SampleSet[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.organs(),
    ]).then(([organs]) => {
      const inst = (organs.installed || []).map((o: any) => ({ ...o, installed: true }));
      const cat = (organs.catalog || []).map((o: any) => ({ ...o, installed: false }));
      setInstalled(inst);
      setCatalog(extendedCatalog(cat));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const all = [...installed, ...catalog];
  const filtered = search
    ? all.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()) || (s.style || "").toLowerCase().includes(search.toLowerCase()))
    : all;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-serif text-organ-gold">Marketplace</h1>
        <div className="flex-1 relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, style, builder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-organ-gold/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-600 text-sm">Loading catalog...</div>
      ) : (
        <>
          {/* Installed section */}
          {installed.length > 0 && (
            <section>
              <h2 className="text-sm text-zinc-400 mb-3 flex items-center gap-2"><Music size={14} /> Installed ({installed.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {installed.map((o) => (
                  <OrganCard key={o.name} organ={o} />
                ))}
              </div>
            </section>
          )}

          {/* Catalog section */}
          <section>
            <h2 className="text-sm text-zinc-400 mb-3 flex items-center gap-2"><Globe size={14} /> Available Sample Sets ({filtered.filter(f => !f.installed).length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.filter((f) => !f.installed).map((o) => (
                <OrganCard key={o.name} organ={o} />
              ))}
            </div>
          </section>

          {/* Bach Reference */}
          <section className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h2 className="text-sm text-organ-gold mb-2 font-serif">J.S. Bach Organ Works</h2>
            <p className="text-xs text-zinc-500 mb-3">
              The complete Bach organ repertoire is catalogued in the{" "}
              <a href="https://github.com/sandraschi/grandorgue-mcp/blob/main/docs/BACH_CATALOG.md" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                Bach Catalog
              </a>{" "}
              — BWV 525-771, including Preludes & Fugues, Toccatas, Trio Sonatas, Orgelbuchlein, Schubler Chorales, and the Great Eighteen.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Prelude & Fugue", "Toccata", "Trio Sonata", "Chorale Prelude", "Fantasia", "Passacaglia", "Concerto"].map((cat) => (
                <span key={cat} className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded-full">{cat}</span>
              ))}
            </div>
          </section>

          {/* MIDI Sources */}
          <section>
            <h2 className="text-sm text-zinc-400 mb-3">MIDI File Sources</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Kunst der Fuge", url: "https://www.kunstderfuge.com/", desc: "Largest classical MIDI archive" },
                { name: "Classical Archives", url: "https://www.classicalarchives.com/midi/", desc: "Curated MIDI collection" },
                { name: "Mutopia Project", url: "https://www.mutopiaproject.org/", desc: "Free sheet music + MIDI" },
              ].map((src) => (
                <a key={src.name} href={src.url} target="_blank" rel="noreferrer"
                  className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 hover:border-organ-gold/30 transition-colors block">
                  <div className="text-sm text-zinc-200">{src.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">{src.desc}</div>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function OrganCard({ organ }: { organ: SampleSet }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-organ-gold/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-zinc-200 truncate">{organ.name}</div>
          {organ.style && <div className="text-xs text-organ-gold mt-0.5">{organ.style}</div>}
          {organ.creator && <div className="text-[10px] text-zinc-500">by {organ.creator}</div>}
        </div>
        {organ.installed ? (
          <span className="shrink-0 px-2 py-0.5 text-[10px] bg-green-900 text-green-300 rounded-full">Installed</span>
        ) : (
          <span className="shrink-0 px-2 py-0.5 text-[10px] bg-organ-gold/20 text-organ-gold rounded-full">Free</span>
        )}
      </div>

      <div className="text-xs text-zinc-600 mt-2 line-clamp-2">{organ.description}</div>

      <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-500">
        {organ.manuals > 0 && <span>{organ.manuals} manuals</span>}
        {organ.stops > 0 && <span>{organ.stops} stops</span>}
        {organ.size_hint && <span>{organ.size_hint}</span>}
      </div>

      <div className="flex gap-2 mt-3">
        {organ.installed ? (
          <button className="flex-1 px-3 py-1 text-xs bg-organ-gold/20 text-organ-gold rounded hover:bg-organ-gold/30 transition-colors">
            Load
          </button>
        ) : organ.url ? (
          <a href={organ.url} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1 text-xs bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors">
            <Download size={12} /> Download
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Extend the catalog with rich metadata */
function extendedCatalog(base: SampleSet[]): SampleSet[] {
  return [
    { name: "Caen Abbey", path: "", url: "https://piotrgrabowski.pl/caen/", description: "French Romantic organ — the most famous free sample set. 4 manuals, 54 stops, magnificent Cavaille-Coll sound.", manuals: 4, stops: 54, is_free: true, installed: false, size_hint: "~6 GB", style: "French Romantic", creator: "Piotr Grabowski" },
    { name: "Friesach", path: "", url: "https://piotrgrabowski.pl/friesach/", description: "Austrian Baroque organ with crisp plenum. Excellent for Bach and North German repertoire.", manuals: 3, stops: 34, is_free: true, installed: false, size_hint: "~3 GB", style: "Austrian Baroque", creator: "Piotr Grabowski" },
    { name: "Giubiasco", path: "", url: "https://piotrgrabowski.pl/giubiasco/", description: "Italian Baroque organ in the South German style. Bright, clear principals and flutes.", manuals: 2, stops: 25, is_free: true, installed: false, size_hint: "~2 GB", style: "Italian Baroque", creator: "Piotr Grabowski" },
    { name: "Palma", path: "", url: "https://piotrgrabowski.pl/palma/", description: "Spanish Baroque organ with characteristic horizontal reeds (trompeteria). 4 manuals.", manuals: 4, stops: 52, is_free: true, installed: false, size_hint: "~4 GB", style: "Spanish Baroque", creator: "Piotr Grabowski" },
    { name: "St. Omer", path: "", url: "https://piotrgrabowski.pl/st-omer/", description: "French Classical organ — authentic 18th-century French registration for Couperin and de Grigny.", manuals: 4, stops: 48, is_free: true, installed: false, size_hint: "~5 GB", style: "French Classical", creator: "Piotr Grabowski" },
    { name: "Cracov", path: "", url: "https://piotrgrabowski.pl/cracov/", description: "Polish Romantic organ. Warm foundation stops and a beautiful Oboe solo.", manuals: 2, stops: 31, is_free: true, installed: false, size_hint: "~2.5 GB", style: "Polish Romantic", creator: "Piotr Grabowski" },
    { name: "Burea Church", path: "", url: "http://familjenpalo.se/vpo/burea/", description: "Swedish Romantic church organ. Warm, intimate sound perfect for service playing.", manuals: 2, stops: 20, is_free: true, installed: false, size_hint: "~2 GB", style: "Swedish Romantic", creator: "Lars Palo" },
    { name: "Pitea MHS", path: "", url: "http://familjenpalo.se/vpo/pitea-mhs/", description: "Swedish school organ — bright, clear, ideal for Bach and teaching.", manuals: 2, stops: 12, is_free: true, installed: false, size_hint: "~1.5 GB", style: "Swedish", creator: "Lars Palo" },
    { name: "Melcer Chamber", path: "", url: "https://piotrgrabowski.pl/melcer/", description: "Small Polish chamber organ. Intimate and manageable — perfect for home practice.", manuals: 2, stops: 12, is_free: true, installed: false, size_hint: "~1 GB", style: "Polish Chamber", creator: "Piotr Grabowski" },
    ...base.filter((b) => !["Piotr Grabowski", "Lars Palo", "Burea Church", "Pitea MHS", "Demo Organ"].includes(b.name)),
  ];
}
