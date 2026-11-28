"use client";

import { useState } from "react";

/** Descarca PDF (tiparire din browser) + copiaza IBAN-ul dintr-o atingere. */
export function Butoane({ iban }: { iban: string }) {
  const [copiat, setCopiat] = useState(false);
  return (
    <div className="no-print flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex-1 rounded-lg bg-brand-red px-5 py-3 font-bold text-white shadow hover:bg-brand-red/90"
      >
        Descarcă proforma (PDF)
      </button>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(iban.replace(/\s+/g, "")).then(
            () => {
              setCopiat(true);
              setTimeout(() => setCopiat(false), 2500);
            },
            () => undefined,
          );
        }}
        className="flex-1 rounded-lg border-2 border-brand-navy px-5 py-3 font-bold text-brand-navy hover:bg-slate-50"
      >
        {copiat ? "✓ IBAN copiat" : "Copiază IBAN-ul"}
      </button>
    </div>
  );
}
