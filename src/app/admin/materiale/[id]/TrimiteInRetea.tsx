"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

/** Trimite / retrimite comanda in reteaua de publicare (04.10.2026). */
export function TrimiteInRetea({ id, trimisa }: { id: string; trimisa: boolean }) {
  const router = useRouter();
  const [ocupat, setOcupat] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function trimite() {
    if (trimisa && !confirm("Retrimiți comanda în rețea? Textul și pozele de acolo se înlocuiesc cu cele de aici (doar dacă nu e publicată).")) return;
    setOcupat(true);
    setMesaj(null);
    try {
      const r = await fetch(`/api/admin/materiale/${id}/retea`, { method: "POST" });
      const j = (await r.json().catch(() => ({ ok: false }))) as { ok: boolean; id?: number; actualizata?: boolean; error?: string };
      setMesaj(j.ok ? `Gata: comanda #${j.id} în rețea${j.actualizata ? ", actualizată" : ""}.` : `Nu a mers: ${j.error || "eroare"}`);
      startTransition(() => router.refresh());
    } finally {
      setOcupat(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={trimite}
        disabled={ocupat}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50"
      >
        {ocupat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {trimisa ? "Retrimite în rețea" : "Trimite în rețea"}
      </button>
      {mesaj && <span className={`text-xs ${mesaj.startsWith("Nu a mers") ? "text-red-700" : "text-emerald-700"}`}>{mesaj}</span>}
    </span>
  );
}
