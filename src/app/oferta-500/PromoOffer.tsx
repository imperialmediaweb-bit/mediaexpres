"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, RefreshCw, ChevronDown, Newspaper, Landmark, MessageCircle, ShieldCheck, Info } from "lucide-react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";
import {
  CONTENT_DECLARATION,
  CONTENT_DECLARATION_ERROR,
  CONTENT_DECLARATION_WARNING,
} from "@/lib/content-policy";
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
  const [declar, setDeclar] = useState(false);
  const emailFormRef = useRef<HTMLFormElement>(null);

  // Pe telefon, formularul de email se deschidea SUB marginea ecranului —
  // acoperit de bara fixa de comanda si de bula de chat. Omul apasa "Comanda
  // acum" si nu vedea nicio schimbare, deci pleca. Il aducem in mijlocul
  // ecranului imediat ce apare.
  useEffect(() => {
    if (askEmail) {
      emailFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [askEmail]);

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
    // Oglinda in GA4 — fara ea, Analytics arata "Evenimente importante: 0"
    // si rata de conversie a reclamei nu se poate citi nicaieri.
    trackGaEvent("begin_checkout", { value: offer.price, currency: "RON" });
    setAskEmail(true);
  }

  async function go() {
    if (loading) return;
    const clean = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean)) {
      setError("Scrie o adresă de email validă — acolo primești factura.");
      return;
    }
    // La card, banii intra INAINTE sa vedem articolul — asa functioneaza
    // Stripe. Nu putem verifica textul mai devreme, dar putem cere declaratia
    // mai devreme: daca se dovedeste ca nu se poate publica, temeiul de a nu
    // restitui exista deja, semnat inainte de plata. Pe transfer bancar
    // articolul se verifica efectiv inainte sa plece vreun leu.
    if (!declar) {
      setError(CONTENT_DECLARATION_ERROR);
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

  // Mesajul pre-scris E comanda: ii spune omului exact ce sa trimita, ca
  // prima lui interactiune pe WhatsApp sa fie o comanda completa, nu un
  // "buna ziua" dupa care il intrebam noi de toate. Acelasi link apare pe
  // AMBELE ecrane — si inainte, si dupa "Comanda acum": cine prefera
  // WhatsApp nu trebuie sa descopere asta abia la pasul de plata.
  const waOrderHref = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    [
      `Bună ziua! Vreau să comand articolul în cele 50 de ziare (${offer.price} lei${offer.suffix}).`,
      "",
      "Pentru comandă avem nevoie de:",
      "1. Datele firmei pentru factură: denumire, CUI, adresă",
      "2. Articolul, cu linkurile în text — sau tema și site-ul, dacă îl scrieți voi (inclus în preț)",
      "3. Pozele (până la 3, opțional)",
    ].join("\n"),
  )}`;
  const trackWaOrder = () => {
    trackPixelEvent("Contact", { content_name: "Comanda pe WhatsApp din oferta" });
    trackGaEvent("begin_checkout", { value: offer.price, currency: "RON", payment_type: "whatsapp" });
  };

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

      {/* Colapsata prin design: ~95% dintre vizitatori nu au legatura cu
          jocurile de noroc. Desfasurata in hero, caseta ii intreba pe toti de
          cazinouri si le arata "fara rambursare" inainte de orice alt text
          despre bani — si impingea butonul de comanda sub marginea ecranului
          pe telefon. Bifata ramane obligatorie pentru cine chiar e in nisa,
          deci <details> ramane deschis dupa bifare. */}
      <details
        open={isCasino}
        className="mx-auto mt-5 max-w-md rounded-xl border border-white/15 bg-white/5 text-left"
      >
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-white/65 hover:text-white/90">
          Articolul e despre cazino sau pariuri? <span className="underline decoration-dotted underline-offset-2">Tarif diferit — apasă aici</span>
        </summary>
        <label className="flex cursor-pointer items-start gap-3 px-4 pb-4 pt-1">
          <input
            type="checkbox"
            checked={isCasino}
            onChange={(e) => setSelection({ isCasino: e.target.checked })}
            className="mt-0.5 h-6 w-6 shrink-0 accent-brand-gold"
          />
          <span className="text-sm text-white/80">
            Da, articolul este despre <strong className="text-white">cazino, pariuri
            sau iGaming</strong>
            <span className="mt-1 block text-white/55">
              Conținutul din această categorie are tarif de {monthly ? "800 lei/lună" : "1.000 lei"} —
              cerințe suplimentare de conformitate (ONJN, joc responsabil).
              Bifarea e obligatorie pentru articolele din nișă.
            </span>
          </span>
        </label>
      </details>

      {askEmail ? (
        <form
          ref={emailFormRef}
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
            {/* O litera gresita aici = nici factura, nici raportul. */}
            <span className="mt-1.5 block text-xs text-white/60">
              Verifică adresa — dacă greșești, scrie-ne pe WhatsApp la {SITE.phone}.
            </span>
          </label>
          {/*
            Cele doua metode, ca alegere egala.
            Inainte, cardul era un buton rosu mare iar transferul bancar o
            notita gri de 12px sub el. Din 8 oameni care au ajuns pana aici, 0
            au platit — o firma din Romania nu scoate cardul personal pentru un
            serviciu B2B de 500 de lei, vrea ordin de plata si factura. Optiunea
            exista, dar nu o vedea nimeni.
          */}
          <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-300/40 bg-amber-400/10 p-3 text-left">
            <input
              type="checkbox"
              name="contentDeclaration"
              checked={declar}
              onChange={(ev) => setDeclar(ev.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-gold"
            />
            <span className="text-xs leading-relaxed text-white/85">
              {CONTENT_DECLARATION}{" "}
              <a href="/legal/termeni" target="_blank" rel="noreferrer" className="font-semibold text-brand-gold underline">
                Regulile de conținut
              </a>
              <span className="mt-1 block text-white/60">{CONTENT_DECLARATION_WARNING}</span>
            </span>
          </label>

          <p className="mt-4 text-center text-sm font-semibold text-white">
            Cum plătești?
          </p>
          <div className={`mt-2 grid gap-2 ${monthly ? "" : "sm:grid-cols-2"}`}>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex flex-col items-center justify-center gap-0.5 rounded-lg bg-brand-red px-6 py-3.5 font-bold text-white shadow-xl shadow-brand-red/30 transition hover:bg-brand-red/90 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2 text-base">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                Card — plătesc acum
              </span>
              <span className="text-xs font-normal text-white/80">
                factură automată pe email
              </span>
            </button>

            {!monthly && (
              <a
                // Emailul scris mai sus pleaca in link: altfel omul care alege
                // OP il scrie a doua oara pe formular — frictiune gratuita.
                href={`/comanda/transfer?pachet=${offer.packageId}${/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim()) ? `&email=${encodeURIComponent(email.trim())}` : ""}`}
                onClick={(ev) => {
                  // Puntea telefon -> birou: cine alege OP primeste pe loc un
                  // email cu datele de plata si linkul precompletat, ca sa
                  // poata termina de pe alt dispozitiv. keepalive: cererea
                  // supravietuieste navigarii care incepe chiar acum.
                  if (!declar) {
                    // Acelasi prag ca la card: fara declaratie nu incepe nicio
                    // comanda, indiferent de metoda de plata.
                    ev.preventDefault();
                    setError(CONTENT_DECLARATION_ERROR);
                    return;
                  }
                  const clean = email.trim();
                  if (/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean)) {
                    void fetch("/api/oferta/continua", {
                      method: "POST",
                      keepalive: true,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: clean, packageId: offer.packageId }),
                    }).catch(() => {});
                  }
                  trackGaEvent("select_content", { content_type: "plata_op" });
                }}
                className="inline-flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-brand-gold bg-brand-gold/10 px-6 py-3.5 font-bold text-brand-gold transition hover:bg-brand-gold/20"
              >
                <span className="inline-flex items-center gap-2 text-base">
                  <Landmark className="h-5 w-5" />
                  Ordin de plată
                </span>
                <span className="text-xs font-normal text-brand-gold/80">
                  transfer bancar, cu factură
                </span>
              </a>
            )}
          </div>
          {/* A treia cale: omul care nu are incredere sa plateasca unui
              necunoscut vrea intai sa vorbeasca cu cineva. Tina Digi a facut
              exact asta pe cont propriu; acum drumul exista in pagina.
              Evenimentul Contact il face vizibil in Ads Manager — altfel
              conversatiile astea par ca reclama n-a produs nimic. */}
          <a
            href={waOrderHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackWaOrder}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/50 hover:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Comandă pe WhatsApp — îți spunem ce să trimiți
          </a>
          <p className="mt-1.5 text-center text-xs text-white/60">
            Ai întrebări? Îți răspundem cu drag, tot acolo.
          </p>
          <p className="mt-3 text-center text-xs text-white/60">
            {offer.price.toLocaleString("ro")} lei{offer.suffix} · factură fiscală în ambele
            cazuri · publicare în 24 de ore lucrătoare
          </p>
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
          {/* Singura promisiune cu bani inapoi de pe pagina — pana acum
              existau doar mentiuni negative ("fara rambursare"). Riscul e al
              nostru si e mic: publicarea o controlam noi. Frica pe care o
              stinge e exact cea care opreste prima comanda catre un
              necunoscut. */}
          <p className="inline-flex items-center gap-1.5 text-sm text-white/75">
            <ShieldCheck className="h-4 w-4 text-brand-gold" />
            Nu publicăm în 24 de ore lucrătoare? Îți dăm toți banii înapoi.
          </p>
          {/* Lista e mai jos pe pagina, dar nimeni nu stia — omul vedea pretul si
              butonul si pleca fara sa afle ca poate verifica ziarele inainte. */}
          <a
            href="#lista-ziare"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-brand-gold/60 bg-brand-gold/10 px-6 py-3 text-base font-bold text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold/20 sm:w-auto"
          >
            <Newspaper className="h-5 w-5" />
            Vezi lista celor 50 de ziare
            <ChevronDown className="h-4 w-4" />
          </a>
          <a
            href={waOrderHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackWaOrder}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/50 hover:text-white sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" />
            Comandă pe WhatsApp
          </a>
          {/*
            Acelasi drum spre date si AICI, in momentul deciziei. Sus e pentru
            cine citeste pagina de la inceput; asta e pentru cine a derulat
            direct la pret si sta cu degetul pe buton, dar vrea sa mai verifice
            ceva inainte sa plateasca.
          */}
          <a
            href="#detalii"
            className="text-xs font-medium text-white/60 underline underline-offset-4 transition hover:text-white/90"
          >
            Vezi datele: ce primești, ce trafic au ziarele, ce nu promitem
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
            de transfer — primești factura pe email și plătești pe baza ei, după.
          </li>
          <li>
            <strong className="text-white">2.</strong> Nu ai articol scris?{" "}
            <strong className="text-white">Îl scriem noi</strong> — ne dai site-ul
            firmei și 1–2 propoziții. Îl citești și îl poți modifica înainte de
            publicare.
          </li>
          <li>
            <strong className="text-white">3.</strong> Publicăm în maximum 24 de ore
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
