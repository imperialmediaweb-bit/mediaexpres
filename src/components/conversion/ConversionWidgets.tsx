"use client";

import { usePathname } from "next/navigation";
import { ExitIntentPopup } from "./ExitIntentPopup";
import { StickyMobileCta } from "./StickyMobileCta";
import { CountdownBanner } from "./CountdownBanner";

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
  if (!pathname || pathname.startsWith("/admin")) return null;
  if (!matches(pathname, COMMERCIAL_PATHS)) return null;

  // Pe landingul platit omul a venit SA CUMPERE. Popup-ul de "primeste oferta
  // pe email" si bara de "cere oferta gratuita" il scot din drumul spre plata —
  // aici bara duce direct la butonul de comanda si nu sare niciun formular.
  if (matches(pathname, ["/oferta-500"])) {
    // Fara pret in eticheta: bara e vizibila permanent, iar clientul poate
    // comuta intre cazino (1.000) si abonament (400). Un pret fix aici ar
    // contrazice pe ecran pretul real din 3 din 4 combinatii.
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md lg:hidden">
        <a
          href="#oferta"
          className="block w-full rounded-lg bg-brand-red px-4 py-3 text-center text-base font-bold text-white"
        >
          Comandă acum
        </a>
      </div>
    );
  }

  return (
    <>
      <ExitIntentPopup />
      <StickyMobileCta />
    </>
  );
}
