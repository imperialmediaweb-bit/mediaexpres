"use client";

import { useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";

// Oferta are 4 combinatii: (standard | cazino) x (o data | lunar).
// Abonamentul lunar promo e mai ieftin decat plata unica: 400 lei/luna (cazino 800).
export const OFFERS = {
  once: {
    standard: { packageId: "promo-50", price: 500, listPrice: "1.500 lei", suffix: "" },
    casino: { packageId: "promo-50-cazino", price: 1000, listPrice: "2.500 lei", suffix: "" },
  },
  monthly: {
    standard: { packageId: "promo-lunar", price: 400, listPrice: "1.300 lei/lună", suffix: "/lună" },
    casino: { packageId: "promo-lunar", price: 800, listPrice: "2.300 lei/lună", suffix: "/lună" },
  },
} as const;

// Optiunile sunt afisate in MAI MULTE locuri pe pagina (hero, mijlocul paginii,
// CTA final, bara fixa de jos). Starea traieste la nivel de modul ca toate sa o
// vada la fel — altfel clientul alege sus si plateste jos pe alta varianta.
export type Selection = { isCasino: boolean; monthly: boolean };
let selection: Selection = { isCasino: false, monthly: false };
const listeners = new Set<() => void>();
const serverSnapshot: Selection = { isCasino: false, monthly: false };

export function setSelection(patch: Partial<Selection>) {
  selection = { ...selection, ...patch };
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function useSelection(): Selection {
  return useSyncExternalStore(subscribe, () => selection, () => serverSnapshot);
}

// Drumul spre plata, intr-un singur loc. Orice buton „Comanda acum" de pe
// pagina il foloseste — nu mai exista butoane care doar deruleaza inapoi sus.
export function useComandaPromo() {
  const { isCasino, monthly } = useSelection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offer = OFFERS[monthly ? "monthly" : "once"][isCasino ? "casino" : "standard"];

  async function go() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: offer.packageId,
          mode: monthly ? (isCasino ? "subscription-casino" : "subscription-standard") : "package",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok || !body.url) throw new Error(body.error || "Eroare");
      window.location.href = body.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută");
      setLoading(false);
    }
  }

  function start() {
    if (loading) return;
    setError(null);
    // Evenimentul de pixel pleaca la intentia reala de comanda, nu dupa email —
    // altfel am pierde din masuratoare exact oamenii care ezita.
    trackPixelEvent("InitiateCheckout", {
      content_name: `Oferta 500 — ${isCasino ? "cazino" : "standard"}${monthly ? " lunar" : ""}`,
      content_category: "promo",
      value: offer.price,
      currency: "RON",
    });
    // Oglinda in GA4 — fara ea, Analytics arata "Evenimente importante: 0"
    // si rata de conversie a reclamei nu se poate citi nicaieri.
    trackGaEvent("begin_checkout", { value: offer.price, currency: "RON" });
    void go();
  }

  return { start, loading, error, offer, isCasino, monthly };
}

// 13.09.2026 — un client a scris pe WhatsApp ca „nu functioneaza butonul de
// cumparare". Nu era stricat: butoanele din mijlocul paginii si bara fixa de
// jos erau <a href="#oferta">, adica derulau pagina 11.000 de pixeli INAPOI
// SUS, cu derulare lina. Pe telefon asta arata exact ca un buton mort: apesi,
// pagina fuge in alta parte, nu se intampla nimic. Acum fiecare buton deschide
// direct plata.
export function ButonComanda({
  className,
  eticheta,
  cuPret = true,
}: {
  className?: string;
  eticheta?: string;
  cuPret?: boolean;
}) {
  const { start, loading, error, offer, monthly } = useComandaPromo();
  const text = eticheta ?? (monthly ? "Abonează-te" : "Comandă acum");
  return (
    <>
      {/*
        16.09.2026 — `data-comanda` nu schimba nimic aici. E semnul dupa care
        bula de chat stie sa se dea la o parte cat timp un buton de comanda e
        pe ecran: pe telefon statea exact peste el (vezi OfferChatBubble).
      */}
      <button type="button" data-comanda="1" onClick={start} disabled={loading} className={className}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
        {loading
          ? "Se deschide plata..."
          : cuPret
            ? `${text} — ${offer.price.toLocaleString("ro")} lei${offer.suffix}`
            : text}
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-red-200">{error}</p>}
    </>
  );
}
