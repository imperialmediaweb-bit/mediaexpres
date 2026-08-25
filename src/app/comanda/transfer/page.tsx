import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landmark } from "lucide-react";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { TransferForm } from "./TransferForm";

export const metadata: Metadata = {
  title: "Comandă prin transfer bancar",
  robots: { index: false, follow: false },
};

/**
 * Traseul pentru cine alege plata prin OP in loc de card. Stripe nu e implicat,
 * deci clientul isi incarca singur dovada platii odata cu materialele, iar noi
 * confirmam incasarea inainte de publicare.
 */
export default function TransferPage({
  searchParams,
}: {
  searchParams: { pachet?: string };
}) {
  const pkg = findPackageById(searchParams.pachet || "promo-50");
  if (!pkg) notFound();

  const isCasino = pkg.category === "casino";

  return (
    <div className="bg-slate-50">
      <section className="bg-brand-navy text-white">
        <div className="container py-12 text-center">
          <h1 className="font-serif text-3xl font-bold md:text-4xl">
            Comandă prin transfer bancar
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">
            {pkg.name} — <strong className="text-brand-gold">{pkg.price.toLocaleString("ro")} lei</strong>.
            Plătești prin OP, încarci dovada și materialele, iar noi publicăm imediat ce
            confirmăm încasarea.
          </p>
        </div>
      </section>

      <section className="container max-w-3xl py-10">
        <div className="rounded-xl border-2 border-brand-gold/40 bg-white p-6">
          <div className="flex items-center gap-3">
            <Landmark className="h-6 w-6 shrink-0 text-brand-red" />
            <h2 className="font-serif text-lg font-bold text-brand-navy">
              Pasul 1: fă plata în contul nostru
            </h2>
          </div>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-slate-500">Beneficiar</dt>
            <dd className="font-semibold text-brand-navy">{SITE.billing.company}</dd>
            <dt className="text-slate-500">IBAN</dt>
            <dd className="break-all font-mono font-semibold text-brand-navy">
              {SITE.billing.iban}
            </dd>
            <dt className="text-slate-500">Banca</dt>
            <dd className="font-semibold text-brand-navy">{SITE.billing.bank}</dd>
            <dt className="text-slate-500">Suma</dt>
            <dd className="font-semibold text-brand-navy">
              {pkg.price.toLocaleString("ro")} lei
            </dd>
            <dt className="text-slate-500">Detalii plată</dt>
            <dd className="text-brand-navy">Publicare articol</dd>
          </dl>
          <p className="mt-4 text-sm text-slate-600">
            După ce ai făcut plata, completează formularul de mai jos. Nu trebuie să aștepți
            ca banii să ajungă la noi — încarci dovada, iar noi confirmăm între timp.
          </p>
        </div>

        <div className="mt-8">
          <TransferForm packageId={pkg.id} price={pkg.price} isCasino={isCasino} />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Preferi să ne trimiți totul pe WhatsApp? Scrie-ne la{" "}
          <strong className="text-brand-navy">{SITE.phone}</strong> — ne ocupăm noi de rest.
        </p>
      </section>
    </div>
  );
}
