"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { currentPromoDeadline, promoDeadlineLabel } from "@/data/packages";

/**
 * Bara de sus cu termenul ofertei.
 *
 * Inainte, termenul se calcula ca "3 zile de la prima vizita a acestui
 * browser" si se tinea in localStorage-ul vizitatorului. Adica fiecare om
 * vedea mereu 3 zile, iar golirea cache-ului sau o fereastra incognito il
 * resetau. Nu era o oferta care expira, ci un cronometru decorativ — si, mai
 * rau, contrazicea termenul real afisat pe /oferta-500 ("pana pe 14
 * septembrie"). Doua termene diferite pe acelasi site il invata pe om sa nu
 * creada niciunul.
 *
 * Acum numara catre termenul REAL, acelasi pentru toata lumea, luat din
 * PROMO_ROLLING. Cand oferta chiar se incheie, bara dispare singura.
 */

const DISMISS_KEY = "me_banner_dismissed";

type Remaining = { d: number; h: number; m: number; s: number };

export function CountdownBanner() {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }
    setDismissed(false);
    setLabel(promoDeadlineLabel());

    const tick = () => {
      // Recitim termenul la fiecare secunda: e rulant, deci se poate muta in
      // urmatoarea perioada chiar in timp ce pagina e deschisa.
      const end = currentPromoDeadline();
      if (!end) {
        setRemaining(null);
        return;
      }
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      setRemaining({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff / 3_600_000) % 24),
        m: Math.floor((diff / 60_000) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (dismissed || !remaining) return null;

  return (
    <div className="relative bg-brand-red text-white text-sm">
      <div className="container flex items-center justify-center gap-2 py-2 pr-10 text-center">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {label ? `Oferta de 500 lei, până pe ${label}: ` : "Ofertă limitată: "}
          <strong>
            {remaining.d}z {remaining.h}h {remaining.m}m {remaining.s}s
          </strong>{" "}
          <Link href="/oferta-500" className="underline underline-offset-2 hover:no-underline">
            comandă acum
          </Link>
        </span>
      </div>
      <button
        type="button"
        aria-label="Închide"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
