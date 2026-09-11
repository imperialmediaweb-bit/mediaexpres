import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Newspaper, CheckCircle2, CreditCard } from "lucide-react";
import { PORTOFOLIU } from "@/data/portfolio";
import { ClientiStrip } from "@/components/ClientiStrip";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Articole publicate — exemple reale | MediaExpres",
  description:
    "Articole publicate prin rețeaua MediaExpres, cu linkurile reale. Deschide-le pe oricare și vezi cum arată o apariție în presă.",
  alternates: { canonical: "/exemple" },
};

/*
  Pagina care raspunde la singura intrebare pe care o are omul inainte sa
  plateasca 500 de lei unei firme necunoscute: „cum arata, de fapt, articolul
  meu?". Orice descriere pierde in fata unui link pe care il poate deschide.

  De aceea totul aici duce spre click: linkurile se deschid in tab nou, pe
  ziarul real, si nu exista nimic intre om si dovada. Textele de vanzare stau
  la capete — sus o singura fraza, jos butonul — nu printre articole.
*/

export default function ExemplePage() {
  const publicatii = new Set(PORTOFOLIU.map((a) => a.publicatie)).size;

  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center md:py-20">
          <p className="eyebrow text-brand-gold">Portofoliu</p>
          <h1 className="h1 mt-3 text-white">Articole publicate prin MediaExpres</h1>
          <p className="lead mx-auto mt-5 max-w-2xl text-white/85">
            Nu-ți cerem să ne crezi pe cuvânt. Deschide oricare articol de mai
            jos — sunt publicate în ziarele din rețea și sunt online și acum.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm">
            <Stat valoare={`${PORTOFOLIU.length}`} eticheta="articole aici" />
            <Stat valoare={`${publicatii}`} eticheta="publicații diferite" />
            <Stat valoare="50" eticheta="ziare în rețea" />
            <Stat valoare="permanent" eticheta="rămân online" />
          </div>
        </div>
      </section>

      <ClientiStrip />

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            {PORTOFOLIU.map((a) => (
              <div
                key={a.url}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-red hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-brand-ivory px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-red">
                    {a.categorie}
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-brand-red" />
                </div>

                {a.client && (
                  <p className="mt-4 font-serif text-lg font-bold text-brand-navy">{a.client}</p>
                )}

                <h2
                  className={`${a.client ? "mt-1 text-sm text-slate-600" : "mt-4 font-serif text-lg font-bold text-brand-navy"} leading-snug`}
                >
                  {a.titlu}
                </h2>

                <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-slate-500">
                  <Newspaper className="h-4 w-4 text-brand-gold" />
                  <span className="font-semibold text-brand-navy">{a.publicatie}</span>
                  <span>· {a.data}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-red hover:underline"
                  >
                    Deschide articolul →
                  </a>
                  {(a.raportUrl || a.raportPdf) && (
                    <a
                      href={a.raportUrl || a.raportPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-navy hover:underline"
                    >
                      {a.raportUrl ? "Raportul cu toate cele 50 de linkuri →" : "Raportul (PDF) →"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">
            Fiecare articol de mai sus a apărut în toate cele 50 de publicații din
            rețea, în variante scrise separat pentru fiecare ziar. Aici arătăm
            câte una din fiecare.
          </p>
        </div>
      </section>

      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <h2 className="h2 text-white">Aici poate fi și firma ta</h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-white/85">
            Articolul tău, în 50 de ziare românești, publicat în maximum 12 ore
            lucrătoare. Primești lista cu toate cele 50 de linkuri, exact ca
            cele de mai sus.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/oferta-500"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/20 transition hover:bg-brand-red/90"
            >
              <CreditCard className="h-5 w-5" />
              Comandă acum — 500 lei
            </Link>
            <a
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              Întreabă-ne pe WhatsApp
            </a>
          </div>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-gold" /> Factură fiscală
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-gold" /> Nu ai articol? Îl scriem noi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-gold" /> Articolele rămân permanent
            </span>
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({ valoare, eticheta }: { valoare: string; eticheta: string }) {
  return (
    <div>
      <p className="font-serif text-3xl font-bold text-brand-gold">{valoare}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-white/60">{eticheta}</p>
    </div>
  );
}
