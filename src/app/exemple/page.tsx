import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Newspaper, CheckCircle2, CreditCard, FileText, Target } from "lucide-react";
import { PORTOFOLIU } from "@/data/portfolio";
import { ClientiStrip } from "@/components/ClientiStrip";
import { CAMPANII, EXEMPLU_RAPORT } from "@/data/campanii";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Clienți și campanii — agenții de PR, turnee, firme | MediaExpres",
  description:
    "Agenții de comunicare, organizatori de turnee și firme din toată țara publică prin MediaExpres. Campanii reale, articole publicate, raport de publicare ca exemplu.",
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
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center md:py-20">
          <p className="eyebrow text-brand-gold">Clienți și campanii</p>
          <h1 className="h1 mt-3 text-white">
            Agențiile de PR și organizatorii de turnee publică prin noi
          </h1>
          <p className="lead mx-auto mt-5 max-w-2xl text-white/85">
            Când o agenție de comunicare are de trimis comunicatul unui client
            în toată țara, sau un turneu are nevoie de presă în 13 orașe deodată,
            ajunge aici. Mai jos: campaniile, articolele reale și raportul pe
            care îl primește fiecare client.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm">
            <Stat valoare="50" eticheta="ziare în rețea" />
            <Stat valoare="13 orașe" eticheta="cel mai mare turneu" />
            <Stat valoare={`${PORTOFOLIU.length}`} eticheta="articole de deschis" />
            <Stat valoare="permanent" eticheta="rămân online" />
          </div>
        </div>
      </section>

      <ClientiStrip />

      {/*
        Campaniile: descrise, fara linkuri (cerinta proprietarului). Omul
        vede pentru ce au cumparat firme ca a lui si ce au primit. Linkurile
        sunt mai jos, la articole, iar raportul complet apare o singura
        data, ca exemplu.
      */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Campanii</p>
            <h2 className="h2 mt-2">De la turnee naționale la comunicatele agențiilor de PR</h2>
            <p className="mt-3 text-slate-600">
              Fiecare a venit cu altă nevoie. Pentru fiecare, ce a vrut și ce a primit.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CAMPANII.map((c) => (
              <article
                key={c.client}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6"
              >
                <span className="self-start rounded-full bg-brand-ivory px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-red">
                  {c.categorie}
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-brand-navy">{c.client}</h3>
                <p className="mt-2 flex gap-2 text-sm text-slate-600">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <span>{c.scop}</span>
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ce a primit
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {c.livrat.map((l) => (
                    <li key={l} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-5 text-xs text-slate-500">{c.data}</p>
              </article>
            ))}
          </div>

          {/* Un singur raport, ca exemplu de ce primeste la final. */}
          <div className="mx-auto mt-8 flex max-w-5xl flex-col items-center justify-between gap-4 rounded-2xl border border-brand-navy/15 bg-white p-6 md:flex-row">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-6 w-6 shrink-0 text-brand-red" />
              <div>
                <p className="font-serif text-lg font-bold text-brand-navy">
                  Așa arată raportul pe care îl primești la final
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Exemplu real, campania {EXEMPLU_RAPORT.client}. {EXEMPLU_RAPORT.descriere}
                </p>
              </div>
            </div>
            <a
              href={EXEMPLU_RAPORT.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-navy/90"
            >
              Deschide raportul (PDF)
            </a>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto max-w-2xl pb-10 text-center">
            <p className="eyebrow">Articole publicate</p>
            <h2 className="h2 mt-2">Deschide și vezi cum arată</h2>
          </div>
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
            Același serviciu pe care îl folosesc agențiile: articolul tău în 50
            de ziare românești, publicat în maximum 12 ore lucrătoare, cu raportul
            cu toate linkurile la final.
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
