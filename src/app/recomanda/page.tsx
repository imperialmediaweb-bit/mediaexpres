import type { Metadata } from "next";
import { InscriereForm } from "./InscriereForm";
import { COMISION_LEI } from "@/lib/afiliati";

export const metadata: Metadata = {
  title: "Câștigă recomandând MediaExpres — program de parteneri",
  description: `Freelancer, blogger, vlogger sau agenție? Recomandă publicarea în 50 de ziare online și primești ${COMISION_LEI} lei pentru fiecare client care plătește.`,
  alternates: { canonical: "/recomanda" },
};

const PASI = [
  { t: "Vă înscrieți", d: "Durează un minut. Primiți pe loc linkul personal." },
  { t: "Recomandați", d: "Pe blog, pe canal, în postări sau direct clienților dumneavoastră." },
  { t: "Câștigați", d: `${COMISION_LEI} lei pentru fiecare client care comandă prin link și plătește.` },
];

const CINE = [
  "Freelanceri în marketing, SEO și social media",
  "Web designeri și firme de site-uri",
  "Bloggeri și vloggeri",
  "Consultanți pe fonduri europene",
  "Agenții de PR și evenimente",
  "Contabili și consultanți de afaceri",
];

/** 31.10.2026 — programul de recomandari (lib/afiliati.ts). */
export default function Recomanda() {
  return (
    <section className="bg-white">
      <div className="container grid gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Program de parteneri</p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-brand-navy lg:text-5xl">
            Câștigați {COMISION_LEI} lei pentru fiecare client recomandat
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Clienții dumneavoastră primesc un articol publicat în 50 de ziare online, cu raport în timp real și
            promovare pe Facebook. Dumneavoastră primiți comisionul, fără să vindeți, să facturați sau să
            livrați ceva: ne ocupăm noi de tot.
          </p>

          <ol className="mt-8 space-y-4">
            {PASI.map((p, i) => (
              <li key={p.t} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-brand-navy">{p.t}</p>
                  <p className="text-sm text-slate-600">{p.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-10 font-serif text-xl font-bold text-brand-navy">Pentru cine e programul</h2>
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {CINE.map((c) => (
              <li key={c}>✓ {c}</li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl bg-slate-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-brand-navy">Cum se plătește</p>
            <p className="mt-1">
              În contul de partener vedeți fiecare client adus și comisionul. La începutul lunii ne trimiteți factura
              pentru comenzile încasate luna trecută, iar noi plătim prin transfer bancar.
            </p>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-slate-200 p-6 shadow-sm lg:p-8">
          <h2 className="mb-5 font-serif text-2xl font-bold text-brand-navy">Înscriere</h2>
          <InscriereForm />
        </div>
      </div>
    </section>
  );
}
