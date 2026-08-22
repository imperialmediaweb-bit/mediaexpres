"use client";

import { useRef, useState } from "react";
import { Loader2, Send, CheckCircle2, Paperclip } from "lucide-react";

export function RaportForm() {
  const [email, setEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [links, setLinks] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkCount = links
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//i.test(l)).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setDone(null);
    setSending(true);
    try {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("clientName", clientName);
      fd.set("articleTitle", articleTitle);
      fd.set("links", links);
      const f = fileRef.current?.files?.[0];
      if (f) fd.set("file", f);

      const res = await fetch("/api/admin/raport", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Trimiterea a eșuat");

      setDone(
        `Raportul a plecat către ${email}` +
          (json.linksCount ? ` cu ${json.linksCount} linkuri` : "") +
          (json.attached ? " + fișierul atașat" : "") +
          ".",
      );
      setLinks("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare neașteptată");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email client *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@firma.ro"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nume client
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Andrei Popescu"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Titlul articolului
        </label>
        <input
          type="text"
          value={articleTitle}
          onChange={(e) => setArticleTitle(e.target.value)}
          placeholder="Apare în subiectul emailului"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Linkurile publicate{" "}
          <span className="font-normal text-slate-500">
            (unul pe linie{linkCount > 0 ? ` — ${linkCount} detectate` : ""})
          </span>
        </label>
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          rows={10}
          placeholder={"https://iasiexpres.ro/articolul-tau\nhttps://clujexpres.ro/articolul-tau\n..."}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed focus:border-brand-red focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Fișier Excel (opțional, se atașează la email)
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-brand-red">
          <Paperclip className="h-4 w-4" />
          {fileName || "Alege fișierul .xlsx / .csv"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
        </label>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {done && (
        <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {done}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-6 py-3 font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Trimite raportul
      </button>
    </form>
  );
}
