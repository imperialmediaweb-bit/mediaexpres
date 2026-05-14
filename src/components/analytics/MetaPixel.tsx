"use client";

import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Component-ul incarca Meta Pixel client-side. Genereaza un script async dupa
// hydration (strategy=afterInteractive) si emite PageView automat la fiecare
// navigare. Pentru evenimente custom (Lead, Purchase) folosim helper-ul
// trackPixelEvent + Conversions API server-side pentru duplicare/fallback.
export function MetaPixel() {
  if (!PIXEL_ID) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Helper pentru evenimente custom client-side. Daca pasezi eventId,
// Meta deduplicheaza intre Pixel-ul browser si CAPI server-side (acelasi event_id).
export function trackPixelEvent(
  eventName: string,
  data?: Record<string, unknown>,
  eventId?: string,
) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) {
    window.fbq("track", eventName, data || {}, { eventID: eventId });
  } else {
    window.fbq("track", eventName, data || {});
  }
}
