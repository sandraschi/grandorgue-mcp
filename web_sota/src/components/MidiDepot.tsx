import { Download, Loader2, Music, Music2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";

interface MidiFile {
  name: string;
  size_bytes: number;
  modified: number;
}

export default function MidiDepot() {
  const [files, setFiles] = useState<MidiFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [bachBusy, setBachBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api
      .get("/midi-depot")
      .then((r: any) => {
        setFiles(r.files ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const binary = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("");
    const dataBase64 = btoa(binary);
    const r = await api.post("/midi-depot/upload", {
      name: file.name,
      data_base64: dataBase64,
    });
    if (r.success) {
      setMessage(`Uploaded ${file.name}`);
      load();
    } else {
      setMessage("Upload failed");
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleDownloadBach = async () => {
    setBachBusy(true);
    setMessage("Downloading Bach organ bundle from bachcentral.com...");
    try {
      const r: any = await api.post("/midi-depot/batch/bach", {});
      if (r.success) {
        setMessage(
          `Bach bundle: ${r.count} MIDI files extracted. ${r.files.slice(0, 5).join(", ")}${r.count > 5 ? `... and ${r.count - 5} more` : ""}`,
        );
        load();
      } else {
        setMessage(`Bach download failed: ${r.message}`);
      }
    } catch {
      setMessage("Bach download failed — network error");
    } finally {
      setBachBusy(false);
    }
  };

  const handleDownload = async (name: string) => {
    const r: any = await api.get(`/midi-depot/${encodeURIComponent(name)}/download`);
    if (r.success) {
      const blob = new Blob([Uint8Array.from(atob(r.data_base64), (c) => c.charCodeAt(0))]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    const r: any = await api.del(`/midi-depot/${encodeURIComponent(name)}`);
    if (r.success) {
      setMessage(`Deleted ${name}`);
      load();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-organ-gold">MIDI Depot</h1>
        <div className="flex gap-2">
          <input ref={fileInput} type="file" accept=".mid,.midi" onChange={handleUpload} hidden />
          <button
            onClick={() => fileInput.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-organ-gold/20 text-organ-gold rounded-lg hover:bg-organ-gold/30 transition-colors"
          >
            <Upload size={14} /> Upload MIDI
          </button>
          <button
            onClick={handleDownloadBach}
            disabled={bachBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-900/30 text-amber-400 rounded-lg hover:bg-amber-900/50 transition-colors disabled:opacity-40"
          >
            {bachBusy ? <Loader2 size={14} className="animate-spin" /> : <Music2 size={14} />}
            {bachBusy ? "Downloading..." : "Bach Bundle"}
          </button>
        </div>
      </div>

      {message && (
        <div className="text-sm text-zinc-400 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800">
          {message}
          <button onClick={() => setMessage("")} className="ml-2 text-zinc-600 hover:text-zinc-400">
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading...</div>
      ) : files.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg p-8 border border-zinc-800 text-center text-zinc-500">
          <Music size={32} className="mx-auto mb-3 opacity-40" />
          <p>No MIDI files in the depot.</p>
          <p className="text-xs mt-1">Upload a .mid file to get started.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 bg-zinc-900 rounded-lg px-4 py-3 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <Music size={16} className="text-zinc-500 shrink-0" />
              <span className="flex-1 text-sm text-zinc-200 truncate">{f.name}</span>
              <span className="text-xs text-zinc-600 w-16 text-right">
                {formatSize(f.size_bytes)}
              </span>
              <button
                onClick={() => handleDownload(f.name)}
                className="p-1.5 text-zinc-500 hover:text-organ-gold transition-colors"
                title="Download"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => handleDelete(f.name)}
                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
