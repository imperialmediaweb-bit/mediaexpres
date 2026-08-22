"use client";

import { useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";

const STANDARD = {
  packageId: "promo-50",
  price: 500,
  listPrice: "1.500 lei",
};

const CASINO = {
  packageId: "promo-50-cazino",
  price: 1000,
  listPrice: "2.500 lei",
};

// Bifa cazino e afisata in DOUA locuri pe pagina (hero + CTA final).
// Starea traieste la nivel de modul ca ambele instante sa o vada la fel —
// altfel clientul declara sus si plateste jos pe pachetul standard.
let casinoState = false;
const casinoListeners = new Set<() => void>();
function setCasino(v: boolean) {
  casinoState = v;
  casinoListeners.forEach((fn) => fn());
}
function subscribeCasino(fn: () => void) {
  casinoListeners.add(fn);
  return () => casinoListeners.delete(fn);
}
function useCasino(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(subscribeCasino, () => casinoState, () => false);
  return [value, setCasino];
}

export function PromoOffer({ showPrice = true }: { showPrice?: boolean }) {
  const [isCasino, setIsCasino] = useCasino();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offer = isCasino ? CASINO : STANDARD;

  async function go() {
    if (loading) return;
    setLoading(true);
    setError(null);
    trackPixelEvent("InitiateCheckout", {
      content_name: isCasino ? "Oferta 500 — cazino" : "Oferta 500 — standard",
      content_category: "promo",
      value: offer.price,
      currency: "RON",
    });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: offer.packageId, mode: "package" }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok || !body.url) throw new Error(body.error || "Eroare");
      window.location.href = body.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută");
      setLoading(false);
    }
  }

  return (
    <div>
      {showPrice && (
        <div className="flex items-end justify-center gap-4">
          <div className="text-right">
            <p className="text-sm uppercase tracking-wider text-white/50">
              Preț normal
            </p>
            <p className="font-serif text-3xl font-bold text-white/40 line-through">
              {offer.listPrice}
            </p>
          </div>
          <div className="text-left">
            <p className="text-sm uppercase tracking-wider text-brand-gold">
              Acum
            </p>
            <p className="font-serif text-6xl font-bold text-brand-gold md:text-7xl">
              {offer.price.toLocaleString("ro")} lei
            </p>
          </div>
        </div>
      )}

      <label className="mx-auto mt-8 flex max-w-md cursor-pointer items-start gap-3 rounded-xl border border-white/20 bg-white/5 p-4 text-left">
        <input
          type="checkbox"
          checked={isCasino}
          onChange={(e) => setIsCasino(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-gold"
        />
        <span className="text-sm text-white/80">
          Articolul este despre <strong className="text-white">cazino, pariuri
          sau iGaming</strong>
          <span className="mt-1 block text-white/55">
            Conținutul din această categorie are tarif dublu — 1.000 lei.
            Declarația e obligatorie; articolele nedeclarate se opresc de la
            publicare fără rambursare.
          </span>
        </span>
      </label>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={go}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/30 transition hover:bg-brand-red/90 disabled:opacity-60 sm:w-auto"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CreditCard className="h-5 w-5" />
          )}
          Comandă acum — {offer.price.toLocaleString("ro")} lei
        </button>
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}
