/**
 * Link de WhatsApp catre un numar de telefon romanesc.
 *
 * Exista pentru ca emailul nu e de incredere: un email cu factura catre un
 * client a fost respins de serverul lui („550 blocked by hostkarma"), iar omul
 * a asteptat un document care nu ajunsese niciodata. WhatsApp ajunge oricum, si
 * clientii raspund acolo mai repede decat pe email.
 */

/** 0762593414 / +40 762 593 414 / 0040762593414 -> 40762593414 */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  // Prefixul international scris ca „00" (0040...) — il taiem, altfel iese
  // 40040... si linkul duce spre un numar inexistent.
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("40")) return d.length >= 11 ? d : null;
  if (d.startsWith("0")) return "4" + d;
  if (d.length === 9) return "40" + d;
  return null;
}

/** Link gata de deschis; null daca numarul nu poate fi folosit. */
export function waLink(phone: string | null | undefined, text?: string): string | null {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
