"use client";

import { useEffect } from "react";
import { ADS_ID } from "./GoogleAnalytics";

/**
 * Conversia „Achizitie" pentru Google Ads — fragmentul pe care Ads il cere
 * „pe pagina de confirmare a achizitiei".
 *
 * De ce NU sta pe /comanda/multumim, unde te-ai astepta: la plata cu cardul,
 * pagina aia face redirect pe server catre /articol/[token] si nu se
 * randeaza niciodata in browser. Un fragment pus acolo n-ar porni in veci,
 * iar campania ar licita orbeste fara sa stie nimeni. Pagina reala de
 * confirmare e /articol/[token] — tokenul se semneaza doar dupa o sesiune
 * Stripe platita.
 *
 * transaction_id = sesiunea Stripe: omul deschide linkul de mai multe ori
 * (e valabil 90 de zile), iar Google numara conversia o singura data.
 * sessionStorage e a doua plasa, pentru navigarile din aceeasi fila.
 *
 * gtag-ul e incarcat de GoogleAnalytics dupa hidratare, deci poate sa nu
 * existe inca in momentul efectului — asteptam pana la 6 secunde, apoi
 * renuntam in liniste. Un esec de analytics nu are voie sa atinga fluxul.
 */
const PURCHASE_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "vAvYCOnh6t0BEMKVsvMC";

export function AdsConversion({
  transactionId,
  value,
  currency = "RON",
}: {
  transactionId: string;
  value?: number;
  currency?: string;
}) {
  useEffect(() => {
    if (!transactionId) return;
    const cheie = `aw-conv-${transactionId}`;
    try {
      if (sessionStorage.getItem(cheie)) return;
    } catch {
      /* fara storage (mod privat) mergem mai departe: transaction_id dedupeaza oricum */
    }

    let incercari = 0;
    const timer = setInterval(() => {
      incercari++;
      if (typeof window.gtag === "function") {
        clearInterval(timer);
        window.gtag("event", "conversion", {
          send_to: `${ADS_ID}/${PURCHASE_LABEL}`,
          transaction_id: transactionId,
          ...(typeof value === "number" ? { value, currency } : {}),
        });
        try {
          sessionStorage.setItem(cheie, "1");
        } catch {
          /* ignoram */
        }
      } else if (incercari >= 30) {
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [transactionId, value, currency]);

  return null;
}
