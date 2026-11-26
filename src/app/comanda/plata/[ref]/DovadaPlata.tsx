"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { signAndUpload } from "@/lib/upload-client";

/** Butonul „Încarcă dovada plății" de pe pagina comenzii (OP). */
export function DovadaPlata({ refComanda, dejaTrimisa }: { refComanda: string; dejaTrimisa: boolean }) {
  const [stare, setStare] = useState<"gol" | "urc" | "gata">(dejaTrimisa ? "gata" : "gol");
  const [eroare, setEroare] = useState<string | null>(null);

  async function urca(f: File | undefined) {
    if (!f) return;
    setStare("urc");
    setEroare(null);
    try {
      const up = await signAndUpload(f, "op");
      const r = await fetch("/api/comanda/dovada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refComanda, url: up.url, name: up.name }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) throw new Error(j.error || `Eroare ${r.status}`);
      setStare("gata");
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu s-a putut încărca. Trimiteți dovada pe WhatsApp.");
      setStare("gol");
    }
  }

  if (stare === "gata")
    return (
      <p className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        Dovada a fost primită. O verificăm și pornim campania; vă anunțăm pe email.
      </p>
    );
  return (
    <div className="mt-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
        {stare === "urc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {stare === "urc" ? "Se încarcă..." : "Încarcă dovada plății (poză sau PDF)"}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={stare === "urc"}
          onChange={(e) => {
            void urca(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {eroare && <p className="mt-2 text-sm text-red-700">{eroare}</p>}
    </div>
  );
}
