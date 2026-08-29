"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

// ID-ul de masurare GA4. Poate fi suprascris din env fara rebuild de cod;
// fallback-ul hardcodat face tag-ul functional imediat dupa deploy.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-J48G1PDG1E";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Eveniment GA4 din browser — acelasi contract ca trackPixelEvent din
 * MetaPixel.tsx: no-op daca gtag nu s-a incarcat (blocker, retea, admin),
 * ca un esec de analytics sa nu poata strica niciodata un flux de comanda.
 *
 * De ce exista: GA raporta DOAR page_view, deci "Evenimente importante: 0"
 * — nu se vedea cati incep comanda, cati cer lista, cati scriu pe WhatsApp.
 * Nu poti creste o rata de conversie pe care n-o poti masura.
 */
export function trackGaEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params || {});
}

// Aceleasi zone in care nici widgeturile de conversie nu apar. Vizitele
// adminului pe /admin si ale clientilor logati pe /cont nu sunt trafic de
// vanzare — 422 de afisari "Admin" intr-o saptamana ingropau cifrele reale.
function isMeasuredPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return !pathname.startsWith("/admin") && !pathname.startsWith("/cont");
}

// Incarca gtag.js dupa hydration si emite page_view automat.
// Acelasi pattern ca MetaPixel: client-side, strategy=afterInteractive.
export function GoogleAnalytics() {
  const pathname = usePathname();

  // App Router schimba pagina fara reload, iar gtag.js emite page_view doar
  // la incarcare — omul care se plimba pe 5 pagini aparea cu una. config cu
  // page_path la fiecare schimbare de ruta emite page_view-ul lipsa.
  useEffect(() => {
    if (!pathname || !isMeasuredPath(pathname)) return;
    if (typeof window.gtag !== "function") return;
    window.gtag("config", GA_ID, { page_path: pathname });
  }, [pathname]);

  if (!GA_ID || !isMeasuredPath(pathname)) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
