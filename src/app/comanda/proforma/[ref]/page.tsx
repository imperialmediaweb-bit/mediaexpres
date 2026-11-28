import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { gasesteComanda } from "@/lib/comanda-ref";
import { numarProforma } from "@/lib/proforma";
import { waLink } from "@/lib/whatsapp";
import { INVOICE_PRODUCT_NAME } from "@/lib/startco";
import { DovadaPlata } from "../../plata/[ref]/DovadaPlata";
import { Butoane } from "./Butoane";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Proformă",
  robots: { index: false, follow: false },
};

/**
 * 28.11.2026 (owner) — proforma comenzii prin OP, facuta de noi. Clientul
 * plateste pe baza ei; factura fiscala StartCo se emite abia la confirmarea
 * incasarii. „Descarca PDF" = tiparire din browser (ca raportul).
 */
export default async function ProformaPage({ params }: { params: { ref: string } }) {
  const row = await gasesteComanda(params.ref);
  if (!row) notFound();
  const pkg = findPackageById(row.packageId);
  if (!pkg) notFound();

  const nr = numarProforma(row.id, row.createdAt);
  const data = new Date(row.createdAt).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" });
  const suma = pkg.price;
  const platita = row.status !== "pending_payment";
  const firma = row.companyName || "";
  const cui = row.companyCui || row.cui || "";
  const adresa = row.companyAddress || row.billingAddress || "";
  const wa = waLink(SITE.phone, `Bună ziua, am o întrebare despre proforma ${nr}.`);

  return (
    <div className="bg-slate-50">
      <style>{`@media print{header,footer,nav,.no-print{display:none!important}body{background:#fff!important}.proforma{box-shadow:none!important;border:0!important;margin:0!important}}`}</style>
      <section className="container max-w-3xl py-8">
        {platita ? (
          <p className="no-print mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            ✓ Plata a fost primită. Factura fiscală a plecat pe email.
          </p>
        ) : (
          <div className="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Ultimul pas: plata.</strong> Faceți transferul în contul de mai jos, cu <strong>{nr}</strong> la detalii.
            Publicăm în maximum 12 ore lucrătoare de la încasare. Factura fiscală vine pe email după încasare.
          </div>
        )}

        <div className="proforma rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="MediaExpres" className="h-10 w-auto" />
            <div className="text-right">
              <p className="font-serif text-2xl font-bold text-brand-navy">PROFORMĂ</p>
              <p className="text-sm text-slate-600">Nr. <strong>{nr}</strong></p>
              <p className="text-sm text-slate-600">Data: {data}</p>
            </div>
          </div>

          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Furnizor</p>
              <p className="mt-1 font-semibold text-slate-900">{SITE.billing.company}</p>
              <p className="text-sm text-slate-700">CUI {SITE.legal.cui} · {SITE.legal.regCom}</p>
              <p className="text-sm text-slate-700">{SITE.legal.address}</p>
              <p className="text-sm text-slate-700">IBAN {SITE.billing.iban}</p>
              <p className="text-sm text-slate-700">{SITE.billing.bank}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Client</p>
              <p className="mt-1 font-semibold text-slate-900">{firma || row.email}</p>
              {cui && <p className="text-sm text-slate-700">CUI {cui}</p>}
              {adresa && <p className="text-sm text-slate-700">{adresa}</p>}
              <p className="text-sm text-slate-700">{row.email}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-2">Descriere</th>
                <th className="px-3 py-2 text-right">Cant.</th>
                <th className="px-3 py-2 text-right">Valoare</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3">
                  {INVOICE_PRODUCT_NAME}
                  <span className="block text-xs text-slate-500">{pkg.name}{row.ziareAlese ? ` — ${row.ziareAlese}` : ""}</span>
                </td>
                <td className="px-3 py-3 text-right">1</td>
                <td className="px-3 py-3 text-right">{suma.toFixed(2)} lei</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="px-3 pt-4 text-right font-bold text-brand-navy">Total de plată</td>
                <td className="px-3 pt-4 text-right text-lg font-bold text-brand-navy">{suma.toFixed(2)} lei</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-slate-500">{SITE.legal.vat}</p>

          <div className="mt-6 rounded-lg border-2 border-dashed border-brand-red p-4">
            <p className="text-xs text-slate-500">IBAN</p>
            <p className="select-all font-mono text-lg font-bold tracking-wide text-slate-900 sm:text-xl">{SITE.billing.iban}</p>
            <p className="mt-2 text-sm text-slate-700">
              Beneficiar: <strong>{SITE.billing.company}</strong> · {SITE.billing.bank}
            </p>
            <p className="text-sm text-slate-700">
              Suma: <strong>{suma} lei</strong> · Detalii plată: <strong>{nr}</strong>
            </p>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Document fără valoare fiscală. Factura fiscală se emite după încasare și se trimite pe email.
          </p>
        </div>

        {!platita && (
          <div className="no-print mt-6 space-y-4">
            <Butoane iban={SITE.billing.iban} />
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-brand-navy">Ați plătit? Urcați dovada și pornim imediat.</p>
              <div className="mt-3">
                <DovadaPlata refComanda={params.ref} dejaTrimisa={Boolean(row.paymentProof)} />
              </div>
            </div>
            <p className="text-center text-sm text-slate-600">
              Întrebări?{" "}
              <a href={wa || "#"} className="font-semibold text-emerald-700 underline">Scrieți-ne pe WhatsApp</a>{" "}
              la {SITE.phone}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
