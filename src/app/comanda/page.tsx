import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderForm } from "@/components/forms/OrderForm";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Comandă articol — MediaExpres",
  description: "Completează formularul de comandă și echipa MediaExpres te contactează în 2 ore.",
  alternates: { canonical: "/comanda" },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams?: { pachet?: string };
}

const BENEFITS = [
  "Livrare articol în 24h",
  "Raport PDF cu toate URL-urile",
  "Distribuție Facebook inclusă",
  "Publicare permanent online",
  "Suport dedicat pe email & telefon",
];

export default function ComandaPage({ searchParams }: PageProps) {
  const defaultPackageId = searchParams?.pachet;
  return (
    <section className="bg-white">
      <div className="container grid gap-12 py-16 lg:grid-cols-[1.3fr_1fr] lg:py-20">
        <div className="order-2 lg:order-1">
          <h1 className="h1">Comandă articol</h1>
          <p className="lead mt-4">
            Completează formularul. Iti trimitem proforma pe email cu IBAN-ul nostru — platesti prin transfer si publicam articolul. Factura finala vine dupa publicare.
          </p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <Suspense>
              <OrderForm defaultPackageId={defaultPackageId} />
            </Suspense>
          </div>
        </div>
        <aside className="order-1 lg:order-2">
          <div className="sticky top-24 rounded-2xl bg-brand-navy p-8 text-white">
            <p className="eyebrow text-brand-gold">Ce primești</p>
            <h2 className="mt-2 font-serif text-2xl font-bold">
              Vizibilitate pe 50 ziare + 50 pagini Facebook
            </h2>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-white/90">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-lg bg-white/5 p-5 border border-white/10">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                Nu știi ce pachet să alegi?
              </p>
              <p className="mt-2 text-sm text-white/80">
                Scrie-ne pe email și îți recomandăm noi pachetul potrivit, gratuit.
              </p>
              <a
                href="mailto:contact@mediaexpress.ro"
                className="mt-3 inline-block text-sm font-semibold text-brand-gold hover:underline"
              >
                contact@mediaexpress.ro →
              </a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
