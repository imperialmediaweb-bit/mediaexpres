"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  SURSA_COOKIE,
  SURSA_ZILE,
  citesteSursaDinBrowser,
  serializeazaSursa,
  sursaDinUrl,
} from "@/lib/sursa";

/**
 * Retine in cookie de unde a venit vizitatorul (vezi lib/sursa.ts).
 *
 * Ruleaza la fiecare schimbare de pagina, nu doar la prima: linkul din
 * reclama poate duce direct pe /oferta-500, iar omul poate reveni a doua zi
 * dintr-o alta reclama — atunci vrem sursa noua. Nu randeaza nimic.
 */
export function SourceCapture() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const rezultat = sursaDinUrl(window.location.search, document.referrer);
      if (!rezultat) return;
      const existent = citesteSursaDinBrowser();
      if (existent && !rezultat.suprascrie) return;
      const valoare = serializeazaSursa(rezultat.sursa);
      if (valoare === existent) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${SURSA_COOKIE}=${encodeURIComponent(valoare)}; Path=/; Max-Age=${
        SURSA_ZILE * 86400
      }; SameSite=Lax${secure}`;
    } catch {
      /* fara cookie-uri (mod privat strict) — comanda merge oricum */
    }
  }, [pathname]);

  return null;
}
