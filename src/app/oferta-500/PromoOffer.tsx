"use client";

import { useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";

// Oferta are 4 combinatii: (standard | cazino) x (o data | lunar).
// Abonamentul lunar promo e mai ieftin decat plata unica: 400 lei/luna (cazino 800).
const OFFERS = {
  once: {
    standard: { packageId: "promo-50", price: 500, listPrice: "1.500 lei", suffix: "" },
    casino: { packageId: "promo-50-cazino", price: 1000, listPrice: "2.500 lei", suffix: "" },
  },
  monthly: {
    standard: { packageId: "promo-lunar", price: 400, listPrice: "1.300 lei/lună", suffix: "/lună" },
    casino: { packageId: "promo-lunar", price: 800, listPrice: "2.300 lei/lună", suffix: "/lună" },
  },
} as const;

// Optiunile sunt afisate in DOUA locuri pe pagina (hero + CTA final).
// Starea traieste la nivel de modul ca ambele instante sa o vada la fel —
// altfel clientul alege sus si plateste jos pe alta varianta.
type Selection = { isCasino: boolean; monthly: boolean };
let selection: Selection = { isCasino: false, monthly: false };
const listeners = new Set<() => void>();
const serverSnapshot: Selection = { isCasino: false, monthly: false };
function setSelection(patch: Partial<Selection>) {
  selection = { ...selection, ...patch };
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function useSelection(): Selection {
  return useSyncExternalStore(subscribe, () => selection, () => serverSnapshot);
}

export function PromoOffer({ showPrice = true }: { showPrice?: boolean }) {
  const { isCasino, monthly } = useSelection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offer = OFFERS[monthly ? "monthly" : "once"][isCasino ? "casino" : "standard"];

  async function go() {
    if (loading) return;
    setLoading(true);
    setError(null);
    trackPixelEvent("InitiateCheckout", {
      content_name: `Oferta 500 — ${isCasino ? "cazino" : "standard"}${monthly ? " lunar" : ""}`,
      content_category: "promo",
      value: offer.price,
      currency: "RON",
    });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: offer.packageId,
          mode: monthly
            ? isCasino
              ? "subscription-casino"
              : "subscription-standard"
            : "package",
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

  return (
    <div>
      {/* O data / Lunar */}
      <div className="mx-auto flex max-w-xs overflow-hidden rounded-full border border-white/20 bg-white/5 p-1 text-sm font-semibold">
        {(
          [
            [false, "O singură dată"],
            [true, "Abonament lunar"],
          ] as [boolean, string][]
        ).map(([m, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setSelection({ monthly: m })}
            className={`flex-1 rounded-full px-4 py-2 transition ${
              monthly === m
                ? "bg-brand-gold text-brand-navy"
                : "text-white/70 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showPrice && (
        <div className="mt-8 flex items-end justify-center gap-4">
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
              {offer.suffix && (
                <span className="text-2xl font-normal text-white/60 md:text-3xl">
                  {offer.suffix}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {monthly && (
        <p className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2 text-sm text-white/70">
          <RefreshCw className="h-3.5 w-3.5" />
          1 articol nou pe cele 50 de ziare, în fiecare lună — cu {isCasino ? "200" : "100"} lei
          mai ieftin decât plata unică. Anulezi oricând din cont.
        </p>
      )}

      <label className="mx-auto mt-6 flex max-w-md cursor-pointer items-start gap-3 rounded-xl border border-white/20 bg-white/5 p-4 text-left">
        <input
          type="checkbox"
          checked={isCasino}
          onChange={(e) => setSelection({ isCasino: e.target.checked })}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-gold"
        />
        <span className="text-sm text-white/80">
          Articolul este despre <strong className="text-white">cazino, pariuri
          sau iGaming</strong>
          <span className="mt-1 block text-white/55">
            Conținutul din această categorie are tarif dublu — {monthly ? "800 lei/lună" : "1.000 lei"}.
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
          {monthly ? "Abonează-te" : "Comandă acum"} — {offer.price.toLocaleString("ro")} lei{offer.suffix}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}
