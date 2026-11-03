import Script from "next/script";

/**
 * 03.11.2026 — Microsoft Clarity: harti termice si inregistrari ale vizitelor,
 * ca sa vedem unde se opreste omul pe oferta si la comanda. Gratuit.
 * Proiectul e in contul proprietarului (clarity.microsoft.com).
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "z7wxvv59lp";

export function Clarity() {
  if (!CLARITY_ID) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
    </Script>
  );
}
