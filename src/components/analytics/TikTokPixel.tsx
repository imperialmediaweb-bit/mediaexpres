"use client";

import Script from "next/script";

/**
 * Pixelul TikTok (21.11.2026) — ca TikTok sa vada cine intra pe site si cine
 * plateste, iar campania sa caute oameni ca ei. Fara NEXT_PUBLIC_TIKTOK_PIXEL_ID
 * nu se incarca nimic. Evenimentele: PageView automat, Contact/InitiateCheckout
 * oglindite din trackPixelEvent (MetaPixel.tsx), CompletePayment din
 * AdsConversion (pagina de confirmare a platii).
 */
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

export function TikTokPixel() {
  if (!TIKTOK_PIXEL_ID) return null;
  return (
    <Script id="tiktok-pixel" strategy="afterInteractive">
      {`!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
ttq.load('${TIKTOK_PIXEL_ID}');
ttq.page();
}(window, document, 'ttq');`}
    </Script>
  );
}

declare global {
  interface Window {
    ttq?: { track: (event: string, data?: Record<string, unknown>, opt?: Record<string, unknown>) => void };
  }
}

/** Eveniment TikTok din browser; no-op daca pixelul nu e incarcat. */
export function trackTikTok(event: string, data?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.track(event, data || {}, eventId ? { event_id: eventId } : undefined);
  } catch {
    /* un esec de analytics nu atinge pagina */
  }
}
