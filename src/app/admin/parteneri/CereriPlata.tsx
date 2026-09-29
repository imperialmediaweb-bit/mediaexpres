"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CererePlataAdmin {
  id: string;
  publicatie: string;
  suma: number;
  articole: number;
  iban: string;
  titular: string;
  cui: string | null;
  factura: string | null;
  cerutaLa: string;
}

/**
 * Caseta galbena din /admin/parteneri: cererile de plata ale partenerilor.
 * „Am platit" se apasa DUPA ce banii au plecat — de aici pleaca emailul.
 */
export function CereriPlata({ cereri }: { cereri: CererePlataAdmin[] }) {
  const router = useRouter();
  const [lucru, setLucru] = useState<string | null>(null);

  async function actiune(id: string, action: "platit" | "anulat") {
    if (action === "anulat" && !confirm("Anulezi cererea? Articolele revin în soldul partenerului.")) return;
    setLucru(id);
    const r = await fetch(`/api/admin/payouts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).then((x) => x.json()).catch(() => ({ ok: false, error: "Conexiune căzută" }));
    setLucru(null);
    if (!r.ok) alert(r.error || "Nu a mers.");
    router.refresh();
  }

  if (cereri.length === 0) return null;
  return (
    <section className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
      <h2 className="font-serif text-lg font-bold text-amber-900">Cereri de plată ({cereri.length})</h2>
      <ul className="mt-3 space-y-3">
        {cereri.map((c) => (
          <li key={c.id} className="rounded-lg border border-amber-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-brand-navy">{c.publicatie}</strong>
              <span className="font-serif text-xl font-bold text-brand-red">{c.suma} lei</span>
            </div>
            <p className="mt-1 text-slate-600">
              {c.articole} articole · cerută pe {c.cerutaLa} · {c.titular}
              {c.cui ? ` · CUI ${c.cui}` : ""} · factură: {c.factura || "nu a trimis-o încă"}
            </p>
            <p className="mt-1 select-all font-mono text-slate-800">{c.iban}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => actiune(c.id, "platit")}
                disabled={lucru === c.id}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Am plătit
              </button>
              <button
                onClick={() => actiune(c.id, "anulat")}
                disabled={lucru === c.id}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:border-brand-red hover:text-brand-red disabled:opacity-50"
              >
                Anulează
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
