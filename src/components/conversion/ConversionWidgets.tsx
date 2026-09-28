"use client";

import { usePathname } from "next/navigation";
import { ExitIntentPopup } from "./ExitIntentPopup";
import { StickyMobileCta } from "./StickyMobileCta";
import { CountdownBanner } from "./CountdownBanner";
import { ButonComanda } from "@/components/comanda/comanda-promo";
import { useZonaLibera } from "@/hooks/useZonaLibera";

const COMMERCIAL_PATHS = [
  "/",
  "/pachete",
  "/oferta",
  // Landingul din reclama Facebook. Lipsea din lista, asa ca pe mobil — unde ajung
  // ~85% din afisari — nu se vedea bara fixa cu butonul de comanda.
  "/oferta-500",
  "/comanda",
  "/reteaua-noastra",
];

const BANNER_PATHS = ["/pachete", "/oferta"];

function matches(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Spune daca pe pagina asta se afiseaza bara fixa de comanda de pe mobil.
 * Butonul de WhatsApp o citeste ca sa se ridice deasupra barei in loc sa o acopere.
 */
export function hasStickyMobileCta(pathname: string | null): boolean {
  if (!pathname || pathname.startsWith("/admin")) return false;
  return matches(pathname, COMMERCIAL_PATHS);
}

export function ConversionBanner() {
  const pathname = usePathname();
  if (!pathname || pathname.startsWith("/admin")) return null;
  if (!matches(pathname, BANNER_PATHS)) return null;
  return <CountdownBanner />;
}

export function ConversionWidgets() {
  const pathname = usePathname();
  // 28.09.2026 — pe telefoanele mici bara fixa statea fix peste „500 lei" din
  // primul ecran: omul vedea titlul, iar pretul era sub bara. Bara urmareste
  // doar fasia de jos a ecranului (ultimele ~14%, cat ocupa ea): cat pretul
  // trece prin fasia aia, bara coboara din cadru; dupa o derulare scurta,
  // pretul urca, bara revine, iar butonul de sub pret intra in ecran.
  // Hook-ul sta inaintea oricarui `return`, cum cer regulile React.
  const pretPeEcran = useZonaLibera(true, "[data-pret]", "-86% 0px 0px 0px");
  if (!pathname || pathname.startsWith("/admin")) return null;
  if (!matches(pathname, COMMERCIAL_PATHS)) return null;

  // Pe landingul platit omul a venit SA CUMPERE — bara de jos duce direct la
  // butonul de comanda. Popup-ul de iesire e montat SI aici: candva lipsea,
  // pentru ca varianta lui veche deturna spre un formular de email; acum vinde
  // (garantie + comanda + WhatsApp), deci are ce cauta fix pe pagina platita.
  if (matches(pathname, ["/oferta-500"])) {
    // Fara pret in eticheta: bara e vizibila permanent, iar clientul poate
    // comuta intre cazino (1.000) si abonament (400). Un pret fix aici ar
    // contrazice pe ecran pretul real din 3 din 4 combinatii.
    return (
      <>
        <ExitIntentPopup />
        <div
          aria-hidden={pretPeEcran}
          className={`fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md transition-transform duration-300 lg:hidden ${
            pretPeEcran ? "pointer-events-none translate-y-full" : "translate-y-0"
          }`}
        >
          {/* 13.09.2026 — era <a href="#oferta">: derula pagina inapoi sus, lin,
              peste 11.000 de pixeli. Omul apasa „Comanda acum", pagina fugea in
              alta parte si nu se intampla nimic — un client a scris pe WhatsApp
              ca „nu functioneaza butonul de cumparare". Acum deschide plata. */}
          <ButonComanda className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-3 text-center text-base font-bold text-white disabled:opacity-60" />
        </div>
      </>
    );
  }

  return (
    <>
      <ExitIntentPopup />
      <StickyMobileCta />
    </>
  );
}
