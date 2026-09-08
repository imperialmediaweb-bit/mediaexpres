import { SITE } from "@/data/site";

// Datele de identificare ale firmei, dintr-un singur loc (SITE.legal).
//
// Exista pentru ca un vizitator a intrebat cine e firma din spatele site-ului
// si n-a gasit raspunsul nicaieri. Se afiseaza in trei locuri unde omul chiar
// se uita: pe pagina de comanda (langa datele bancare), pe /contact si in
// footer. Adresa e doar orasul — strada ramane pe factura.

/** Denumire, CUI, Reg. Com. si oras, pe un singur rand. Pentru footer. */
export function DateFirmaLinie({ className = "" }: { className?: string }) {
  const l = SITE.legal;
  return (
    <span className={className}>
      {l.companyName} · CUI {l.cui} · {l.regCom} · {l.address}
    </span>
  );
}

/**
 * Caseta „Firma care emite factura" — pe paginile unde omul e pe punctul sa
 * plateasca. Acolo intrebarea „cine sunt astia?" apare cel mai des si acolo
 * costa cel mai mult daca ramane fara raspuns.
 */
export function DateFirma({
  titlu = "Firma care emite factura",
  className = "",
  dark = false,
}: {
  titlu?: string;
  className?: string;
  /** Pe fundal inchis (CTA-ul final de pe /oferta-500). */
  dark?: boolean;
}) {
  const l = SITE.legal;
  const cutie = dark
    ? "rounded-xl border border-white/15 bg-white/5 p-5"
    : "rounded-xl border border-slate-200 bg-slate-50 p-5";
  const eticheta = dark ? "text-white/50" : "text-slate-500";
  const valoare = dark ? "font-semibold text-white" : "font-semibold text-brand-navy";
  return (
    <div className={`${cutie} ${className}`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${eticheta}`}>{titlu}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
        <dt className={eticheta}>Denumire</dt>
        <dd className={valoare}>{l.companyName}</dd>
        <dt className={eticheta}>CUI</dt>
        <dd className={valoare}>{l.cui}</dd>
        <dt className={eticheta}>Reg. Com.</dt>
        <dd className={valoare}>{l.regCom}</dd>
        <dt className={eticheta}>Sediu</dt>
        <dd className={valoare}>{l.address}</dd>
      </dl>
      <p className={`mt-3 text-xs ${eticheta}`}>{l.vat}</p>
    </div>
  );
}
