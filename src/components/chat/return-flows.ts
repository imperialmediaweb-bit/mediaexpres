/**
 * Drumurile clientului care REVINE in chat, dupa ce a comandat.
 *
 * Pe WhatsApp, proprietarul facea trei lucruri cu mana, de zeci de ori:
 * primea dovada platii si o punea pe comanda; primea articolul si pozele
 * trimise „mai tarziu"; raspundea la „ce e cu comanda mea?". Chatul stia sa
 * ia o comanda noua, dar pentru cine revenea nu avea nicio usa — omul
 * scria pe WhatsApp, si tot proprietarul facea treaba.
 *
 * Aici sunt doar tipurile si etichetele; logica de UI sta in OfferChatBubble,
 * iar scrierea in baza de date in /api/chat/comanda.
 */

export type ReturnIntent = "dovada" | "articol" | "stare";

/** O comanda, asa cum o vede clientul in chat (fara date interne). */
export interface ChatOrder {
  id: string;
  packageName: string;
  price: number;
  createdAt: string;
  paymentMethod: "card" | "op";
  status: string;
  publishedAt: string | null;
  hasProof: boolean;
  /** Articolul exista (nu e placeholder-ul „de redactat”). */
  hasArticle: boolean;
  /** Linkurile din raportul de publicare, daca exista. */
  reportLinks: number;
}

/** Ce vede clientul si care e pasul urmator, pentru fiecare stare. */
export function describeOrder(o: ChatOrder): { eticheta: string; urmatorul: string } {
  if (o.publishedAt || o.reportLinks > 0) {
    return {
      eticheta: "publicată",
      urmatorul: o.reportLinks
        ? `Raportul cu cele ${o.reportLinks} linkuri e pe emailul tău și în contul tău de pe site.`
        : "Raportul cu linkurile vine pe email imediat ce e gata.",
    };
  }
  if (o.status === "paid") {
    return {
      eticheta: "plătită — se publică",
      urmatorul: o.hasArticle
        ? "Publicăm în maximum 12 ore lucrătoare și primești raportul pe email."
        : "Așteptăm articolul (sau tema) de la tine — îl poți trimite aici.",
    };
  }
  if (o.status === "pending_payment") {
    return {
      eticheta: o.hasProof ? "dovadă primită — confirmăm încasarea" : "așteaptă plata",
      urmatorul: o.hasProof
        ? "Verificăm încasarea în extras și publicăm în maximum 12 ore lucrătoare de la confirmare."
        : "Factura e pe emailul tău. După ce plătești, poți trimite dovada aici ca să confirmăm mai repede.",
    };
  }
  return {
    eticheta: "în lucru",
    urmatorul: o.hasArticle
      ? "Publicăm în maximum 12 ore lucrătoare și primești raportul pe email."
      : "Așteptăm articolul (sau tema) de la tine — îl poți trimite aici.",
  };
}

export function orderLabel(o: ChatOrder): string {
  const d = new Date(o.createdAt);
  const data = isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  return `${o.packageName} · ${data} · ${describeOrder(o).eticheta}`;
}

export const INTENT_LABEL: Record<ReturnIntent, string> = {
  dovada: "Am plătit — trimit dovada",
  articol: "Trimit articolul / pozele",
  stare: "Unde e comanda mea?",
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
