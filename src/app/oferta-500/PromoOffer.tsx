"use client";

import { CreditCard, RefreshCw, ChevronDown, Newspaper, MessageCircle, ShieldCheck, Loader2 } from "lucide-react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";
import { SITE } from "@/data/site";
import { useSursaWhatsApp } from "@/hooks/useSursaWhatsApp";
import { FormError } from "@/components/forms/FormError";
// Preturile, alegerea (cazino / lunar) si drumul spre Stripe stau intr-un
// singur modul, folosit de toate butoanele de comanda din pagina si de bara
// fixa de jos. Vezi comentariul din 13.09.2026 de acolo.
import { setSelection, useComandaPromo } from "@/components/comanda/comanda-promo";

// 12.09.2026 — direct la plata. Intre 8 si 12 septembrie, dupa click pe
// „Comanda acum" aparea un pas cu email obligatoriu si declaratia de
// continut in caseta galbena. Rezultatul: 27 de oameni au apasat butonul,
// zero au platit, zero au scris pe WhatsApp — inainte era o comanda pe zi.
// Emailul il cere Stripe oricum; declaratia se bifeaza la trimiterea
// articolului (formularul de dupa plata o are), inainte de publicare.
export function PromoOffer({ showPrice = true }: { showPrice?: boolean }) {
  const { start, loading, error, offer, isCasino, monthly } = useComandaPromo();

  // Mesajul pre-scris E comanda: ii spune omului exact ce sa trimita, ca
  // prima lui interactiune pe WhatsApp sa fie o comanda completa, nu un
  // "buna ziua" dupa care il intrebam noi de toate. Acelasi link apare pe
  // AMBELE ecrane — si inainte, si dupa "Comanda acum": cine prefera
  // WhatsApp nu trebuie sa descopere asta abia la pasul de plata.
  // Ultima linie spune de unde a venit omul (Google, Facebook) — asa aflam
  // si pentru leadurile de pe WhatsApp care reclama a adus comanda.
  const propozitieSursa = useSursaWhatsApp();
  const waOrderHref = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    [
      `Bună ziua! Vreau să comand articolul în cele 50 de ziare (${offer.price} lei${offer.suffix}).`,
      "",
      // 13.09.2026 — mesajul era scris din gura NOASTRA, dar il trimite
      // CLIENTUL: „Pentru comandă avem nevoie de: 1. Datele firmei...".
      // Adica omul iti trimitea pe WhatsApp propriul tau text de vanzare, ca
      // si cum si-ar cere singur actele. Acum vorbeste el, despre ce trimite.
      "Vă trimit:",
      "1. Datele firmei pentru factură: denumire, CUI, adresă",
      "2. Articolul, cu linkurile în text — sau tema și site-ul, dacă îl scrieți voi",
      "3. Pozele (până la 3, opțional)",
      ...(propozitieSursa ? ["", propozitieSursa] : []),
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
        // `data-nu-acoperi`: bulele plutitoare (chat, WhatsApp) se dau la o
        // parte cat timp caseta asta e pe ecran. Pe iPhone stateau fix peste
        // „1.500 lei" taiat si peste „500 lei" — pretul, al doilea lucru pe
        // care il cauta omul dupa titlu. Vezi src/hooks/useZonaLibera.ts.
        <div data-nu-acoperi="1" className="mt-8 flex items-end justify-center gap-4">
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

      {/*
        22.09.2026 — un om a intrat si nu a inteles de ce scrie si 1.500, si
        500. Cele doua cifre stateau una langa alta cu „Pret normal" si „Acum"
        scrise mic si gri, fara sa spuna nimeni ce inseamna. Aici e o singura
        propozitie care raspunde: de ce 1.500, de ce 500, si cat iese pe ziar.
      */}
      {showPrice && !monthly && (
        <p className="mx-auto mt-4 max-w-lg text-sm text-white/75">
          Prețul obișnuit al pachetului este{" "}
          <strong className="text-white">{offer.listPrice}</strong>. Cei{" "}
          <strong className="text-brand-gold">{offer.price.toLocaleString("ro")} de lei</strong>{" "}
          sunt o ofertă de intrare pentru clienți noi — adică{" "}
          <strong className="text-white">
            {Math.round(offer.price / 50)} lei pe ziar
          </strong>
          , pentru toate cele 50.
        </p>
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

      {(
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/30 transition hover:bg-brand-red/90 disabled:opacity-60 sm:w-auto"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
            {loading
              ? "Se deschide plata..."
              : `${monthly ? "Abonează-te" : "Comandă acum"} — ${offer.price.toLocaleString("ro")} lei${offer.suffix}`}
          </button>
          {/* Singura promisiune cu bani inapoi de pe pagina — pana acum
              existau doar mentiuni negative ("fara rambursare"). Riscul e al
              nostru si e mic: publicarea o controlam noi. Frica pe care o
              stinge e exact cea care opreste prima comanda catre un
              necunoscut. */}
          <p className="inline-flex items-center gap-1.5 text-sm text-white/75">
            <ShieldCheck className="h-4 w-4 text-brand-gold" />
            Nu publicăm în 12 ore lucrătoare? Îți dăm toți banii înapoi.
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
            Acelasi drum spre raspunsuri si AICI, in momentul deciziei. Sus e
            pentru cine citeste pagina de la inceput; asta e pentru cine a
            derulat direct la pret si sta cu degetul pe buton, dar vrea sa mai
            verifice ceva inainte sa plateasca.

            Scria „ce trafic au ziarele, ce nu promitem" — sub butonul de
            comanda, in secunda deciziei. Cine nu se gandise la trafic afla
            de la noi ca e ceva de verificat. Cifrele raman pe pagina, la
            #detalii; de aici trimitem la intrebari, unde le gaseste cine le
            cauta, fara sa le fluturam in fata celui care nu le cauta.
          */}
          <a
            href="#intrebari"
            className="text-xs font-medium text-white/60 underline underline-offset-4 transition hover:text-white/90"
          >
            Ai o întrebare înainte să comanzi? Răspunsurile, mai jos ↓
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
            <strong className="text-white">3.</strong> Publicăm în maximum 12 ore
            lucrătoare, pe toate ziarele, și promovăm postarea 3 zile pe Facebook,
            pe ziarul ales de tine. Comanda făcută seara sau în weekend se
            publică a doua zi lucrătoare.{" "}
            <span className="text-white/60">
              (La plata prin OP, cronometrul pornește după ce confirmăm încasarea în
              extras — câteva ore lucrătoare, în funcție de bancă.)
            </span>
          </li>
          <li>
            <strong className="text-white">4.</strong> Primești pe email lista cu toate
            cele 50 de linkuri, în PDF și Excel — documentul pe care îl trimiți
            mai departe.{" "}
            <span className="text-white/60">
              Factura fiscală o primești pe email în aceeași zi lucrătoare, indiferent cum plătești.
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

    </div>
  );
}
