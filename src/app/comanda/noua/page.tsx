import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, CreditCard, Newspaper } from "lucide-react";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { DateFirma } from "@/components/DateFirma";
import { ComandaForm } from "./ComandaForm";

export const metadata: Metadata = {
  title: "Comandă",
  robots: { index: false, follow: false },
};

/**
 * 17.10.2026 — comanda in ordinea fireasca pentru o firma: intai ce publici
 * (articolul, pozele, firma), abia apoi plata — card, OP sau WhatsApp, pe
 * /comanda/plata/[ref]. Inainte, butonul ducea direct la card si omul platea
 * pe o promisiune; 5 din 5 au ajuns la card intr-o saptamana si n-au platit.
 */
export default function ComandaNouaPage({
  searchParams,
}: {
  searchParams: { pachet?: string; email?: string; alegere?: string };
}) {
  const pkg = findPackageById(searchParams.pachet || "promo-50");
  if (!pkg || pkg.currency === "EUR") notFound();

  const steps = [
    { icon: FileText, title: "1. Completezi comanda", text: "Firma (o căutăm după CUI), articolul și pozele. Fără nicio plată acum." },
    { icon: CreditCard, title: "2. Alegi cum plătești", text: "Card, ordin de plată sau WhatsApp. Factura vine automat pe email." },
    { icon: Newspaper, title: "3. Publicăm în 12 ore", text: "Pe toate ziarele, și primești raportul cu toate linkurile." },
  ];

  return (
    <div className="bg-slate-50">
      <section className="bg-brand-navy text-white">
        <div className="container py-10 text-center">
          <h1 className="font-serif text-3xl font-bold md:text-4xl">Comandă</h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">
            {pkg.name} — <strong className="text-brand-gold">{pkg.price.toLocaleString("ro")} lei</strong>, preț final.
            Completezi comanda, apoi alegi cum plătești.
          </p>
        </div>
      </section>

      <section className="container max-w-3xl py-8">
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
          <ComandaForm
            packageId={pkg.id}
            price={pkg.price}
            isCasino={pkg.category === "casino"}
            initialEmail={searchParams.email || ""}
            initialAlegere={searchParams.alegere || ""}
          />
        </div>

        <DateFirma className="mt-8" />

        <p className="mt-8 text-center text-sm text-slate-500">
          Preferi să ne trimiți totul pe WhatsApp? Scrie-ne la{" "}
          <strong className="text-brand-navy">{SITE.phone}</strong>.
        </p>
      </section>
    </div>
  );
}
