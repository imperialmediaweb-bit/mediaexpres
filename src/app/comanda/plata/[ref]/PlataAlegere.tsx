"use client";

import { useState } from "react";
import { CreditCard, Landmark, Loader2, MessageCircle, CheckCircle2 } from "lucide-react";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";
import { FormError } from "@/components/forms/FormError";

export function PlataAlegere({
  refComanda,
  price,
  opAles,
  waHref,
  iban,
  beneficiar,
  banca,
}: {
  refComanda: string;
  price: number;
  opAles: boolean;
  waHref: string;
  iban: string;
  beneficiar: string;
  banca: string;
}) {
  const [busy, setBusy] = useState<"card" | "op" | null>(null);
  const [op, setOp] = useState(opAles);
  const [error, setError] = useState<string | null>(null);

  async function alege(metoda: "card" | "op") {
    if (busy) return;
    setBusy(metoda);
    setError(null);
    try {
      const res = await fetch("/api/comanda/plata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refComanda, metoda }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Eroare");
      trackGaEvent("begin_checkout", { value: price, currency: "RON", payment_type: metoda });
      if (metoda === "card" && j.url) {
        window.location.href = j.url;
        return;
      }
      setOp(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(null);
    }
  }

  if (op) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-serif text-xl font-bold text-emerald-900">Factura vine pe email în câteva minute</h2>
            <p className="mt-1 text-sm text-emerald-900/90">
              O dai la contabilitate și faci transferul. La detalii scrie numărul facturii.
              Publicăm în maximum 12 ore lucrătoare de la încasare.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-1.5 rounded-lg bg-white p-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-slate-500">Beneficiar</dt>
          <dd className="font-semibold text-brand-navy">{beneficiar}</dd>
          <dt className="text-slate-500">IBAN</dt>
          <dd className="break-all font-mono font-semibold text-brand-navy">{iban}</dd>
          <dt className="text-slate-500">Banca</dt>
          <dd className="font-semibold text-brand-navy">{banca}</dd>
          <dt className="text-slate-500">Suma</dt>
          <dd className="font-semibold text-brand-navy">{price.toLocaleString("ro")} lei</dd>
        </dl>
      </div>
    );
  }

  const card =
    "flex flex-col items-center rounded-2xl border-2 bg-white p-5 text-center transition disabled:opacity-60";

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => alege("card")}
          disabled={busy !== null}
          className={`${card} border-brand-red shadow-lg hover:bg-red-50 sm:order-none`}
        >
          {busy === "card" ? <Loader2 className="h-8 w-8 animate-spin text-brand-red" /> : <CreditCard className="h-8 w-8 text-brand-red" />}
          <span className="mt-2 font-serif text-lg font-bold text-brand-navy">Plătesc cu cardul</span>
          <span className="mt-1 text-xs text-slate-600">
            Pagina securizată Stripe, cu firma deja completată. Factura vine pe email în câteva minute.
          </span>
          <span className="mt-3 w-full rounded-lg bg-brand-red px-4 py-2.5 text-sm font-bold text-white">
            Plătește {price.toLocaleString("ro")} lei
          </span>
        </button>

        <button
          type="button"
          onClick={() => alege("op")}
          disabled={busy !== null}
          className={`${card} border-slate-200 hover:border-brand-navy`}
        >
          {busy === "op" ? <Loader2 className="h-8 w-8 animate-spin text-brand-navy" /> : <Landmark className="h-8 w-8 text-brand-navy" />}
          <span className="mt-2 font-serif text-lg font-bold text-brand-navy">Plătesc prin OP</span>
          <span className="mt-1 text-xs text-slate-600">
            Primești acum factura pe email, cu IBAN-ul. Plătești din contul firmei.
          </span>
          <span className="mt-3 w-full rounded-lg border-2 border-brand-navy px-4 py-2 text-sm font-bold text-brand-navy">
            Trimite-mi factura
          </span>
        </button>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${card} border-slate-200 hover:border-emerald-600`}
        >
          <MessageCircle className="h-8 w-8 text-emerald-600" />
          <span className="mt-2 font-serif text-lg font-bold text-brand-navy">Vorbesc pe WhatsApp</span>
          <span className="mt-1 text-xs text-slate-600">
            Ai o întrebare înainte să plătești? Comanda ta e salvată, discutăm.
          </span>
          <span className="mt-3 w-full rounded-lg border-2 border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700">
            Scrie-ne
          </span>
        </a>
      </div>
      <FormError message={error} className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" />
    </div>
  );
}
