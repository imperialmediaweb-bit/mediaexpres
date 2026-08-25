"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Copiaza textul articolului dintr-un click, ca sa nu-l selectezi manual. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocat (http sau permisiune) — utilizatorul selecteaza manual */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-navy hover:text-brand-navy"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copiat" : label}
    </button>
  );
}
