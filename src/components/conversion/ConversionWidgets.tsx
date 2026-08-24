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
  return (
    <>
      <ExitIntentPopup />
      <StickyMobileCta />
    </>
  );
}
