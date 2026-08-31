import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, Landmark, Send } from "lucide-react";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { TransferForm } from "./TransferForm";

export const metadata: Metadata = {
  title: "Comandă prin transfer bancar",
  robots: { index: false, follow: false },
};

/**
 * Traseul pentru cine alege plata prin OP in loc de card.
 *
 * Ordinea e cea fireasca pentru o firma: trimiti comanda, primesti factura
 * fiscala pe email si platesti pe baza ei — nu invers. Pagina a avut mult timp
 * sus un chenar "Pasul 1: fa plata in contul nostru" cu IBAN si toate datele,
 * ramas din fluxul vechi: cerea banii inaintea oricarui document si ingropa
 * formularul sub un zid de informatii. Datele de plata vin acum CU factura,
 * unde le e locul; aici ramane doar comanda.
 */
export default function TransferPage({
  searchParams,
}: {
  searchParams: { pachet?: string; email?: string };
}) {
  const pkg = findPackageById(searchParams.pachet || "promo-50");
  if (!pkg) notFound();

  const isCasino = pkg.category === "casino";

  const steps = [
    {
      icon: Send,
      title: "1. Trimiți comanda",
      text: "Formularul de mai jos — datele firmei și articolul. Fără nicio plată acum.",
    },
    {
      icon: FileText,
      title: "2. Primești factura pe email",
      text: "Cu IBAN-ul și toate datele de plată pe ea. O dai contabilității.",
    },
    {
      icon: Landmark,
      title: "3. Plătești și publicăm",
      text: "În maximum 24 de ore lucrătoare de la încasare, cu raportul celor 50 de linkuri.",
    },
  ];

  return (
    <div className="bg-slate-50">
      <section className="bg-brand-navy text-white">
        <div className="container py-12 text-center">
          <h1 className="font-serif text-3xl font-bold md:text-4xl">
            Comandă prin transfer bancar
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">
            {pkg.name} — <strong className="text-brand-gold">{pkg.price.toLocaleString("ro")} lei</strong>.
            Trimiți comanda, primești factura fiscală pe email și plătești pe baza ei.
          </p>
        </div>
      </section>

      <section className="container max-w-3xl py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
              <Icon className="h-5 w-5 text-brand-red" />
              <p className="mt-2 font-serif text-sm font-bold text-brand-navy">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <TransferForm
            packageId={pkg.id}
            price={pkg.price}
            isCasino={isCasino}
            initialEmail={searchParams.email || ""}
          />
        </div>

        {/*
          Datele contului raman pe pagina, dar la coada si pliate: cei mai
          multi platesc dupa factura, insa cine vrea sa vireze pe loc (sau
          cere IBAN-ul pentru aprobare interna inainte sa comande) nu trebuie
          sa astepte emailul ca sa-l afle.
        */}
        <details className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-brand-navy">
            Vrei să faci transferul înainte să primești factura? Datele contului
          </summary>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-slate-500">Beneficiar</dt>
            <dd className="font-semibold text-brand-navy">{SITE.billing.company}</dd>
            <dt className="text-slate-500">IBAN</dt>
            <dd className="break-all font-mono font-semibold text-brand-navy">{SITE.billing.iban}</dd>
            <dt className="text-slate-500">Banca</dt>
            <dd className="font-semibold text-brand-navy">{SITE.billing.bank}</dd>
            <dt className="text-slate-500">Suma</dt>
            <dd className="font-semibold text-brand-navy">{pkg.price.toLocaleString("ro")} lei</dd>
            <dt className="text-slate-500">Detalii plată</dt>
            <dd className="text-brand-navy">Publicare articol</dd>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Dacă ai plătit deja, încarcă dovada în formular — confirmăm mai repede.
          </p>
        </details>

        <p className="mt-8 text-center text-sm text-slate-500">
          Preferi să ne trimiți totul pe WhatsApp? Scrie-ne la{" "}
          <strong className="text-brand-navy">{SITE.phone}</strong> — ne ocupăm noi de rest.
        </p>
      </section>
    </div>
  );
}
