import { Check, Download, Plus, Save, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface StopEntry {
  cc: number;
  name: string;
  state: boolean;
}

interface Registration {
  id: number;
  organ: string;
  name: string;
  stops: string;
  created: string;
  updated: string;
}

export default function RegistrationManager() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [name, setName] = useState("");
  const [organ, setOrgan] = useState("");
  const [stops, setStops] = useState<StopEntry[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/registrations");
      const d = await r.json();
      setRegistrations(d.registrations || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setError(null); setMessage("");
    try {
      const body = { name: name.trim(), organ: organ.trim(), stops };
      if (editing) {
        await fetch(`/api/registrations/${editing}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        setMessage("Updated");
      } else {
        await fetch("/api/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        setMessage("Saved");
      }
      setName(""); setStops([]); setEditing(null);
      await load();
    } catch (e) { setError(String(e)); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/registrations/${id}`, { method: "DELETE" });
      await load();
    } catch (e) { setError(String(e)); }
  };

  const handleApply = async (id: number) => {
    try {
      const r = await fetch(`/api/registrations/${id}/apply`, { method: "POST" });
      const d = await r.json();
      setMessage(`Applied ${d.applied} stops`);
    } catch (e) { setError(String(e)); }
  };

  const handleEdit = (reg: Registration) => {
    setEditing(reg.id);
    setName(reg.name);
    setOrgan(reg.organ);
    try { setStops(JSON.parse(typeof reg.stops === "string" ? reg.stops : JSON.stringify(reg.stops))); }
    catch { setStops([]); }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(registrations, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "grandorgue-registrations.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const list = Array.isArray(data) ? data : (data.registrations || []);
        for (const reg of list) {
          await fetch("/api/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: reg.name || "Imported", organ: reg.organ || "", stops: reg.stops || [] }) });
        }
        setMessage(`Imported ${list.length} registrations`);
        await load();
      } catch (e) { setError(String(e)); }
    };
    input.click();
  };

  const addStop = () => {
    setStops(prev => [...prev, { cc: prev.length > 0 ? prev[prev.length - 1].cc + 1 : 0, name: "", state: true }]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-amber-500">Registration Manager</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700 flex items-center gap-1"><Download size={14} /> Export</button>
          <button onClick={handleImport} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700 flex items-center gap-1"><Upload size={14} /> Import</button>
        </div>
      </div>

      {error && <div className="bg-red-950/40 border border-red-800 text-red-300 px-4 py-2 rounded text-sm">{error}</div>}
      {message && <div className="bg-green-950/40 border border-green-800 text-green-300 px-4 py-2 rounded text-sm flex items-center gap-2"><Check size={14} />{message}</div>}

      {/* Registration form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Registration name..." className="flex-1 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-3 py-2 text-sm" />
          <input value={organ} onChange={e => setOrgan(e.target.value)} placeholder="Organ (optional)" className="w-48 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>

        <div className="space-y-1.5">
          {stops.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="number" value={s.cc} onChange={e => { const n = [...stops]; n[i] = { ...n[i], cc: parseInt(e.target.value) || 0 }; setStops(n); }} className="w-16 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1 text-xs font-mono" placeholder="CC" />
              <input value={s.name} onChange={e => { const n = [...stops]; n[i] = { ...n[i], name: e.target.value }; setStops(n); }} className="flex-1 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1 text-xs" placeholder="Stop name" />
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <input type="checkbox" checked={s.state} onChange={e => { const n = [...stops]; n[i] = { ...n[i], state: e.target.checked }; setStops(n); }} className="accent-amber-500" /> On
              </label>
              <button onClick={() => { setStops(stops.filter((_, j) => j !== i)); }} className="p-1 text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={addStop} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={12} /> Add stop</button>
        </div>

        <button onClick={handleSave} className="px-4 py-2 bg-amber-600 text-black rounded text-sm font-medium hover:bg-amber-500 flex items-center gap-1.5"><Save size={14} /> {editing ? "Update" : "Save"} Registration</button>
      </div>

      {/* Registration list */}
      <div className="space-y-2">
        {registrations.map(reg => (
          <div key={reg.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-200 font-medium">{reg.name}</div>
              <div className="text-xs text-zinc-500">{reg.organ || "Any organ"} — {reg.updated}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleApply(reg.id)} className="px-3 py-1.5 bg-green-900 text-green-300 rounded text-xs hover:bg-green-800">Apply</button>
              <button onClick={() => handleEdit(reg)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700">Edit</button>
              <button onClick={() => handleDelete(reg.id)} className="px-3 py-1.5 bg-red-900/50 text-red-400 rounded text-xs hover:bg-red-900"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
        {registrations.length === 0 && (
          <div className="text-zinc-600 text-sm text-center py-8">No saved registrations yet. Create your first one above.</div>
        )}
      </div>
    </div>
  );
}
