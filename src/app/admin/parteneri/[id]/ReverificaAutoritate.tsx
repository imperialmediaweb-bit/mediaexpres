"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Buton „Reverifică" — citeste din nou DA-ul din Moz (consuma 1 din cele 50 pe luna). */
export function ReverificaAutoritate({ publisherId }: { publisherId: string }) {
  const router = useRouter();
  const [lucru, setLucru] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function reverifica() {
    setLucru(true);
    setMesaj(null);
    const r = await fetch(`/api/admin/publishers/${publisherId}/autoritate`, { method: "POST" })
      .then((x) => x.json())
      .catch(() => ({ ok: false, error: "Conexiune căzută" }));
    setLucru(false);
    if (!r.ok) {
      setMesaj(r.error || "Nu a mers.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        onClick={reverifica}
        disabled={lucru}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-red hover:text-brand-red disabled:opacity-50"
      >
        {lucru ? "Se verifică…" : "Reverifică acum"}
      </button>
      {mesaj && <p className="mt-2 text-xs text-brand-red">{mesaj}</p>}
    </div>
  );
}
