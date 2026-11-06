import type { Metadata } from "next";
import Link from "next/link";
import { TraficRetea } from "@/components/TraficRetea";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Statisticile rețelei — trafic real, actualizat zilnic",
  description:
    "Câți cititori are rețeaua MediaExpres: vizite, cititori și pagini citite în ultimele 30 de zile, de unde vin (Facebook, Google), urmăritori și articole publicate zilnic. Date Google Analytics.",
  alternates: { canonical: "/statistici" },
};

export default function StatisticiPage() {
  return (
    <main className="container py-10">
      <h1 className="font-serif text-3xl font-bold text-brand-navy sm:text-4xl">Statisticile rețelei</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Traficul real al celor 50 de ziare din rețea, din Google Analytics, actualizat zilnic. Aici ajunge articolul
        dumneavoastră.
      </p>
      <div className="mt-8">
        <TraficRetea />
      </div>
      <p className="mt-8">
        <Link
          href="/oferta-500"
          className="inline-block rounded-lg bg-brand-red px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          Articol în 50 de ziare — 500 lei
        </Link>
      </p>
    </main>
  );
}
