"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, X, Loader2 } from "lucide-react";

interface Attachment {
  url: string;
  name: string;
}

const MAX_FILES = 5;
const MAX_BYTES = 8 * 1024 * 1024;

export function MessageComposer() {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setUploading(true);
    const next = [...files];
    try {
      for (const file of Array.from(list)) {
        if (next.length >= MAX_FILES) break;
        if (file.size > MAX_BYTES) {
          setError(`„${file.name}" depășește 8MB.`);
          continue;
        }
        // Semnatura vine de la server; cheia Cloudinary nu ajunge in browser.
        const signRes = await fetch("/api/cont/upload-sign", { method: "POST" });
        const sign = await signRes.json();
        if (!signRes.ok || !sign.ok) throw new Error(sign.error || "Nu am putut pregăti încărcarea");

        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", sign.apiKey);
        fd.append("timestamp", String(sign.timestamp));
        fd.append("signature", sign.signature);
        if (sign.folder) fd.append("folder", sign.folder);

        const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
          method: "POST",
          body: fd,
        });
        const res = await up.json();
        if (!up.ok || !res.secure_url) throw new Error("Încărcarea a eșuat");
        next.push({ url: res.secure_url, name: file.name });
      }
      setFiles(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare");
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (busy) return;
    if (body.trim().length < 5) {
      setError("Scrie mesajul (minim 5 caractere).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cont/mesaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), attachments: files }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Eroare");
      setBody("");
      setFiles([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-navy">Scrie-ne</h2>
      <p className="mt-1 text-sm text-slate-600">
        Cere o modificare pe un articol, trimite capturi din aplicație, siglă sau orice
        material. Modificările pe articolele publicate sunt gratuite.
      </p>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Ex: Vă rog adăugați în articolul de pe Cluj Expres captura atașată și un link către pagina noastră de Facebook."
        className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
      />

      <div className="mt-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-brand-navy hover:text-brand-navy">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? "Se încarcă..." : "Atașează fișiere (capturi, siglă, poze)"}
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            disabled={uploading || files.length >= MAX_FILES}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={f.url} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                <Paperclip className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="min-w-0 truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Șterge ${f.name}`}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="ml-auto text-slate-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={send}
        disabled={busy || uploading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Trimite mesajul
      </button>
    </div>
  );
}
