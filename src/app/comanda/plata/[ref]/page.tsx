import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { DateFirma } from "@/components/DateFirma";
import { gasesteComanda } from "@/lib/comanda-ref";
import { waLink } from "@/lib/whatsapp";
import { ARTICOL_DUPA_PLATA } from "@/lib/content-policy";
import { PlataAlegere } from "./PlataAlegere";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Alege cum plătești",
  robots: { index: false, follow: false },
};

/**
 * 17.10.2026 — pasul de dupa formular. Comanda (articol, poze, firma
 * verificata la ANAF) e deja salvata; aici omul alege doar cum plateste.
 * Acelasi link pleaca si pe email, ca sa poata reveni oricand.
 */
export default async function PlataPage({
  params,
  searchParams,
}: {
  params: { ref: string };
  searchParams: { platit?: string };
}) {
  const row = await gasesteComanda(params.ref);
  // Dupa plata cu cardul, webhookul muta comanda pe sesiunea Stripe — referinta
  // nu mai exista. Intoarcerea din Stripe (?platit=1) arata confirmarea.
  if (!row && searchParams.platit !== "1") notFound();

  if (!row || row.status !== "pending_payment") {
    return (
      <div className="bg-slate-50">
        <section className="container max-w-2xl py-16 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-4 font-serif text-3xl font-bold text-brand-navy">Plata a fost primită</h1>
          <p className="mx-auto mt-3 max-w-lg text-slate-700">
            Mulțumim! Factura fiscală vine pe email în câteva minute. Publicăm în maximum
            12 ore lucrătoare și îți trimitem raportul cu toate cele 50 de linkuri.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Întrebări? Scrie-ne pe WhatsApp la <strong className="text-brand-navy">{SITE.phone}</strong>.
          </p>
        </section>
      </div>
    );
  }

  const pkg = findPackageById(row.packageId);
  if (!pkg) notFound();
  const cui = row.companyCui || row.cui || "";
  const wa = waLink(
    SITE.phone,
    `Bună ziua, am trimis comanda pentru ${pkg.name} (${pkg.price} lei), firma ${row.companyName || ""}. Am o întrebare despre plată.`,
  );

  return (
    <div className="bg-slate-50">
      <section className="bg-brand-navy text-white">
        <div className="container max-w-3xl py-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <h1 className="mt-3 font-serif text-3xl font-bold md:text-4xl">Comanda ta e salvată</h1>
          <p className="mx-auto mt-2 max-w-xl text-white/85">
            Ultimul pas: alege cum plătești. Factura fiscală o primești automat pe email.
          </p>
        </div>
      </section>

      <section className="container max-w-3xl py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-slate-500">Pachet</dt>
            <dd className="font-semibold text-brand-navy">{pkg.name}{row.ziareAlese ? ` — ${row.ziareAlese}` : ""}</dd>
            <dt className="text-slate-500">Firma</dt>
            <dd className="font-semibold text-brand-navy">{row.companyName}{cui ? `, CUI ${cui}` : ""}</dd>
            <dt className="text-slate-500">Articol</dt>
            <dd className="text-brand-navy">{row.body === ARTICOL_DUPA_PLATA ? "îl trimiți după plată, din linkul primit pe email" : row.title}</dd>
            <dt className="text-slate-500">Total</dt>
            <dd className="text-lg font-bold text-brand-red">{pkg.price.toLocaleString("ro")} lei <span className="text-xs font-normal text-slate-500">— preț final, fără TVA (firma nu e plătitoare)</span></dd>
          </dl>
        </div>

        <PlataAlegere
          refComanda={params.ref}
          price={pkg.price}
          opAles={row.paymentMethod === "op"}
          waHref={wa || "#"}
          iban={SITE.billing.iban}
          beneficiar={SITE.billing.company}
          banca={SITE.billing.bank}
        />

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Nu publicăm în 12 ore lucrătoare de la plată? Îți dăm toți banii înapoi.
        </p>

        <DateFirma className="mt-8" />
      </section>
    </div>
  );
}
