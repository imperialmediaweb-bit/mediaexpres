"use client";

import Script from "next/script";

// ID-ul de masurare GA4. Poate fi suprascris din env fara rebuild de cod;
// fallback-ul hardcodat face tag-ul functional imediat dupa deploy.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-J48G1PDG1E";

// Incarca gtag.js dupa hydration si emite page_view automat.
// Acelasi pattern ca MetaPixel: client-side, strategy=afterInteractive.
export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
