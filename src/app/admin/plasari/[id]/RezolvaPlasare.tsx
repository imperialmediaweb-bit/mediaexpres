"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Cele trei variante pentru o plasare cazuta fara inlocuitor automat. */
export function RezolvaPlasare({
  id,
  parteneri,
  ziare,
  suma,
}: {
  id: string;
  parteneri: { id: string; nume: string; tarif: number }[];
  ziare: string[];
  suma: number;
}) {
  const router = useRouter();
  const [partener, setPartener] = useState("");
  const [ziar, setZiar] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function trimite(body: Record<string, string>) {
    setBusy(body.action);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/placements/${id}/rezolva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setMsg(body.action === "ramburs" ? `Gata. Fă acum returnarea de ${suma} lei din Stripe${j.stripe ? ` (${j.stripe})` : ""}.` : "Gata.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(null);
    }
  }

  const sel = "h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm";
  const btn = "inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50";
  return (
    <div className="mt-6 space-y-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-sm">
      <h2 className="font-serif text-lg font-bold text-brand-navy">Clientului îi datorăm articolul — alege</h2>
      <div>
        <p className="mb-1 font-semibold">1. Alt partener</p>
        <div className="flex gap-2">
          <select value={partener} onChange={(e) => setPartener(e.target.value)} className={sel}>
            <option value="">— alege —</option>
            {parteneri.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nume} — {p.tarif} lei
              </option>
            ))}
          </select>
          <button type="button" disabled={!partener || !!busy} onClick={() => trimite({ action: "partener", publisherId: partener })} className={btn}>
            {busy === "partener" && <Loader2 className="h-3 w-3 animate-spin" />} Trimite
          </button>
        </div>
      </div>
      <div>
        <p className="mb-1 font-semibold">2. Un ziar din rețeaua noastră (publici tu, apoi lipești linkul)</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <select value={ziar} onChange={(e) => setZiar(e.target.value)} className={sel}>
            <option value="">— ziarul —</option>
            {ziare.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… articolul publicat" className={sel} />
          <button type="button" disabled={!ziar || !url || !!busy} onClick={() => trimite({ action: "retea", ziar, url })} className={btn}>
            {busy === "retea" && <Loader2 className="h-3 w-3 animate-spin" />} Anunță clientul
          </button>
        </div>
      </div>
      <div>
        <p className="mb-1 font-semibold">3. Banii înapoi ({suma} lei)</p>
        <button type="button" disabled={!!busy} onClick={() => trimite({ action: "ramburs" })} className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
          {busy === "ramburs" && <Loader2 className="h-3 w-3 animate-spin" />} Anunță clientul că returnăm banii
        </button>
        <p className="mt-1 text-xs text-slate-500">Returnarea propriu-zisă o faci din Stripe (refund parțial).</p>
      </div>
      {msg && <p className="font-medium text-brand-navy">{msg}</p>}
    </div>
  );
}
