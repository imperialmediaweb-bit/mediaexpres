"use client";

import { useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { SITE } from "@/data/site";

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
  // Pasul de email dinainte de plata. Stripe capteaza emailul abia pe pagina lui,
  // deci cine pleaca de acolo mai devreme ramanea complet necunoscut si nu putea
  // fi recuperat. Aici il cerem noi, il salvam ca lead si il trimitem precompletat
  // mai departe — omul are un camp mai putin de scris la Stripe.
  const [askEmail, setAskEmail] = useState(false);
  const [email, setEmail] = useState("");

  const offer = OFFERS[monthly ? "monthly" : "once"][isCasino ? "casino" : "standard"];

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
    setAskEmail(true);
  }

  async function go() {
    if (loading) return;
    const clean = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean)) {
      setError("Scrie o adresă de email validă — acolo primești factura.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: clean,
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
            className={`flex-1 rounded-full px-4 py-3 transition ${
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
          className="mt-0.5 h-6 w-6 shrink-0 accent-brand-gold"
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

      {askEmail ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void go();
          }}
          className="mt-6 rounded-xl border border-white/20 bg-white/5 p-4"
        >
          <label className="block text-left">
            <span className="text-sm font-semibold text-white">
              Emailul tău — acolo primești factura și raportul
            </span>
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="nume@firma.ro"
              className="mt-2 w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-base text-brand-navy placeholder:text-slate-400 focus:border-brand-gold focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/30 transition hover:bg-brand-red/90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            Continuă spre plată — {offer.price.toLocaleString("ro")} lei{offer.suffix}
          </button>
          <p className="mt-2 text-center text-xs text-white/60">
            Plată securizată prin Stripe · factură fiscală automată
          </p>
          {!monthly && (
            <p className="mt-3 border-t border-white/10 pt-3 text-center text-xs text-white/70">
              Preferi transfer bancar?{" "}
              <a
                href={`/comanda/transfer?pachet=${offer.packageId}`}
                className="font-semibold text-brand-gold underline"
              >
                Comandă prin OP →
              </a>
            </p>
          )}
        </form>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/30 transition hover:bg-brand-red/90 disabled:opacity-60 sm:w-auto"
          >
            <CreditCard className="h-5 w-5" />
            {monthly ? "Abonează-te" : "Comandă acum"} — {offer.price.toLocaleString("ro")} lei{offer.suffix}
          </button>
          {/* Lista e mai jos pe pagina, dar nimeni nu stia — omul vedea pretul si
              butonul si pleca fara sa afle ca poate verifica ziarele inainte. */}
          <a
            href="#lista-ziare"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 underline decoration-white/30 underline-offset-4 transition hover:text-brand-gold hover:decoration-brand-gold"
          >
            Vezi lista celor 50 de ziare
            <ChevronDown className="h-4 w-4" />
          </a>
        </div>
      )}
      {/* Ce se intampla DUPA plata, spus inainte de plata. Un lead a scris pe
          WhatsApp: "se cere plata, dar informatii despre articol nimic" —
          fluxul exista, dar omul nu-l vedea nicaieri si pleca. */}
      <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 text-left">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
          Ce se întâmplă după plată
        </p>
        <ol className="mt-2 space-y-1.5 text-sm text-white/85">
          <li>
            <strong className="text-white">1.</strong>{" "}
            <strong className="text-white">Cu cardul:</strong> ești dus direct la un
            formular unde trimiți articolul și până la 3 poze.{" "}
            <strong className="text-white">Prin OP:</strong> completezi totul pe pagina
            de transfer, odată cu dovada plății.
          </li>
          <li>
            <strong className="text-white">2.</strong> Nu ai articol scris?{" "}
            <strong className="text-white">Îl scriem noi</strong> — ne dai site-ul
            firmei și 1–2 propoziții. Îl citești și îl poți modifica înainte de
            publicare.
          </li>
          <li>
            <strong className="text-white">3.</strong> Publicăm în maximum 4 ore
            lucrătoare, pe toate ziarele.{" "}
            <span className="text-white/60">
              (La plata prin OP, cronometrul pornește după ce confirmăm încasarea în
              extras — câteva ore lucrătoare, în funcție de bancă.)
            </span>
          </li>
          <li>
            <strong className="text-white">4.</strong> Primești pe email raportul cu
            toate linkurile și factura fiscală.{" "}
            <span className="text-white/60">
              Cu cardul, factura se emite automat; prin OP, imediat după confirmarea
              plății.
            </span>
          </li>
        </ol>
        {!monthly && (
          <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/70">
            <strong className="text-white/90">Plătești prin transfer bancar (OP)?</strong>{" "}
            <a
              href={`/comanda/transfer?pachet=${offer.packageId}`}
              className="font-semibold text-brand-gold underline"
            >
              Mergi pe traseul pentru OP
            </a>{" "}
            — acolo ai datele de plată și încarci dovada, articolul, pozele și datele de
            facturare, într-un singur pas. Sau ne trimiți totul pe WhatsApp la{" "}
            <strong className="text-white/90">{SITE.phone}</strong>.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}
