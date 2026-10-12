"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Pe pagina in engleza (/en) ascundem ce e romanesc: footerul cu linkuri spre
 * pachetele in lei, bannerele si popup-urile ofertei de 500 de lei
 * (12.10.2026, decizia proprietarului: strainii raman in engleza, la 149 EUR).
 */
export function AscundePeEn({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/en" || pathname?.startsWith("/en/")) return null;
  return <>{children}</>;
}
