import { Landmark } from "lucide-react";
import { SITE } from "@/data/site";

// Caseta cu plata prin transfer bancar (OP), afisata pe paginile de vanzare.
// Datele vin din SITE.billing. Factura pentru OP se emite manual dupa plata —
// direct factura fiscala, fara proforma. Abonamentele raman doar cu cardul (OP nu e recurent).
export function BankTransferBox({ note }: { note: string }) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
      <div className="flex items-center gap-3">
        <Landmark className="h-6 w-6 shrink-0 text-brand-red" />
        <h3 className="font-serif text-xl font-bold text-brand-navy">
          Preferi plata prin transfer bancar (OP)?
        </h3>
      </div>
      <p className="mt-3 text-sm text-slate-600">{note}</p>
      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-500">Beneficiar</dt>
        <dd className="font-semibold text-brand-navy">{SITE.billing.company}</dd>
        <dt className="text-slate-500">IBAN</dt>
        <dd className="font-mono font-semibold text-brand-navy break-all">{SITE.billing.iban}</dd>
        <dt className="text-slate-500">Banca</dt>
        <dd className="font-semibold text-brand-navy">{SITE.billing.bank}</dd>
      </dl>
      {/*
        Textul de aici a ramas o data pe fluxul vechi („dupa plata, trimite
        dovada...") in timp ce pasii de pe aceeasi pagina spuneau invers —
        doua instructiuni opuse, la un ecran distanta. Regula e una singura,
        peste tot: comanzi, primesti factura pe email, platesti pe baza ei.
      */}
      <p className="mt-4 text-sm text-slate-600">
        <strong>Nu trebuie să plătești înainte.</strong> Trimiți comanda pe{" "}
        <a href="/comanda/transfer?pachet=promo-50" className="font-semibold text-brand-red hover:underline">
          pagina de transfer
        </a>{" "}
        — cu articolul și datele de facturare — primești factura fiscală pe email și
        plătești pe baza ei, în contul de mai sus. Imediat ce vedem încasarea, publicăm
        în maximum 12 ore lucrătoare și primești raportul cu toate linkurile.
        Abonamentele lunare se plătesc doar cu cardul.
      </p>
    </div>
  );
}
