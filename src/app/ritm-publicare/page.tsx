import type { Metadata } from "next";
import Link from "next/link";
import { Clock, CalendarDays, TrendingUp, CheckCircle2 } from "lucide-react";
import { RITMURI } from "@/lib/ritm";

export const metadata: Metadata = {
  title: "În cât timp apar articolele — ritmul de publicare | MediaExpres",
  description:
    "Rapid, în 12 ore, întins pe 3 zile sau pe 2 săptămâni: cum alegi ritmul de publicare pentru cele 50 de articole, în funcție de ce vrei să obții.",
  alternates: { canonical: "/ritm-publicare" },
};

/*
  Pagina la care duce linkul „Detalii" de langa dropdown-ul cu ritmul.
  Omul care alege intre 12 ore si 2 saptamani vrea sa inteleaga DE CE, nu
  doar CAT. Aici e explicat pe intelesul lui, cu cine ar trebui sa aleaga
  ce, fara jargon.
*/

const ICONITE = { rapid: Clock, zile3: CalendarDays, sapt2: TrendingUp } as const;

export default function RitmPublicarePage() {
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center md:py-20">
          <p className="eyebrow text-brand-gold">Ritmul de publicare</p>
          <h1 className="h1 mt-3 text-white">În cât timp apar cele 50 de articole?</h1>
          <p className="lead mx-auto mt-5 max-w-2xl text-white/85">
            Tu alegi, la comandă. Prețul e același, articolele sunt aceleași. Diferă
            doar cât de repede ies și, prin asta, pentru ce sunt potrivite.
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {RITMURI.map((r) => {
              const Icon = ICONITE[r.id];
              return (
                <article
                  key={r.id}
                  className={`flex flex-col rounded-2xl border p-6 ${
                    r.id === "rapid" ? "border-brand-red bg-red-50/30" : "border-slate-200 bg-white"
                  }`}
                >
                  <Icon className="h-8 w-8 text-brand-red" />
                  <h2 className="mt-4 font-serif text-xl font-bold text-brand-navy">{r.eticheta}</h2>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-brand-red">
                    {r.scurt}
                  </p>
                  <p className="mt-4 text-slate-700">{r.explicatie}</p>
                  {r.id === "rapid" && (
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Varianta implicită
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            <h2 className="h2">Cum alegi</h2>
            <ul className="mt-6 space-y-4 text-slate-700">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-600" />
                <span>
                  <strong>Ai o dată fixă</strong> (spectacol, deschidere, lansare, comunicat de presă)?
                  Alege <strong>rapid</strong>. Tot ce nu e azi e prea târziu.
                </span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-600" />
                <span>
                  <strong>Vrei să fii găsit în presă</strong> de clienți, parteneri, bănci, fără grabă?
                  Alege <strong>3 zile</strong>. Aparițiile vin pe rând, ca știrile, și fiecare are
                  timp să fie indexată.
                </span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-600" />
                <span>
                  <strong>Cumperi pentru SEO și linkuri</strong>? Alege <strong>2 săptămâni</strong>.
                  50 de linkuri apărute în aceeași zi se citesc ca o singură acțiune. Întinse în
                  timp, arată ca plasări normale, iar asta e exact ce ai plătit.
                </span>
              </li>
            </ul>

            <h2 className="h2 mt-14">Ce rămâne la fel, orice ai alege</h2>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-gold" />
                <span>Câte o variantă unică pe fiecare ziar, cu titlu și formulare proprii.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-gold" />
                <span>Linkurile tale, exact cum le-ai pus, în toate cele 50 de articole.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-gold" />
                <span>Distribuire pe paginile de Facebook ale ziarelor și promovarea plătită de 3 zile.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-gold" />
                <span>
                  Raportul cu toate cele 50 de linkuri. La variantele întinse, linkurile deja
                  publicate le vezi pe măsură ce apar, iar raportul final vine când iese ultimul.
                </span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-gold" />
                <span>Prețul: același, 500 lei, indiferent de ritm.</span>
              </li>
            </ul>

            <p className="mt-10 text-slate-600">
              Nu ești sigur ce ți se potrivește? Scrie-ne pe{" "}
              <Link href="/contact" className="font-semibold text-brand-red hover:underline">
                WhatsApp
              </Link>{" "}
              și îți spunem în două minute.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-brand-navy text-white">
        <div className="container py-14 text-center">
          <h2 className="h2 text-white">Gata să comanzi?</h2>
          <p className="lead mx-auto mt-3 max-w-xl text-white/85">Alegi ritmul direct în formularul de comandă.</p>
          <Link
            href="/oferta-500"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/20 transition hover:bg-brand-red/90"
          >
            Comandă acum — 500 lei
          </Link>
        </div>
      </section>
    </>
  );
}
