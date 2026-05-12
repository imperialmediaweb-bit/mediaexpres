import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Globe2,
  Brain,
  Zap,
  ArrowRight,
  CheckCircle2,
  Newspaper,
  Facebook,
} from "lucide-react";
import { StrategyGenerator } from "../oferta/[token]/StrategyGenerator";

export const metadata: Metadata = {
  title: "Strateg Editorial AI - 5 idei de articole in 30 secunde | MediaExpres",
  description:
    "Tool gratuit: introdu site-ul sau brandul vostru si primesti instant 5 idei de articole tailored, pachet de distributie potrivit si frecventa optima. Powered by MediaExpres, cea mai mare retea de presa online din Romania.",
  openGraph: {
    title: "Strateg Editorial AI - MediaExpres",
    description:
      "Genereaza in 30 secunde o strategie editoriala completa: 5 idei de articole + pachet + calendar sezonalitate.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Strateg Editorial AI - MediaExpres",
    description:
      "Genereaza in 30 secunde strategie editoriala pentru brandul tau: 5 idei + pachet + calendar.",
  },
};

export default function StrategAiPage() {
  return (
    <>
      <section className="bg-brand-navy text-white relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-amber-500 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-rose-500 blur-3xl" />
        </div>
        <div className="container relative py-16 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-red to-amber-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
              <Sparkles className="h-4 w-4" />
              Tool gratuit • Exclusiv MediaExpres
            </div>
            <h1 className="mt-6 font-serif text-4xl md:text-6xl font-bold text-white leading-tight max-w-3xl mx-auto">
              Strateg Editorial AI
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
              Dai site-ul sau brandul vostru. Primesti in <strong className="text-brand-gold">30 de secunde</strong>:
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto">
              <div className="rounded-xl bg-white/10 p-5 backdrop-blur border border-white/10">
                <div className="font-serif text-4xl font-bold text-brand-gold">5</div>
                <p className="mt-1 text-sm text-white/80">idei de articole tailored brandului vostru</p>
              </div>
              <div className="rounded-xl bg-white/10 p-5 backdrop-blur border border-white/10">
                <div className="font-serif text-4xl font-bold text-brand-gold">1</div>
                <p className="mt-1 text-sm text-white/80">pachet potrivit din portofoliul nostru</p>
              </div>
              <div className="rounded-xl bg-white/10 p-5 backdrop-blur border border-white/10">
                <div className="font-serif text-4xl font-bold text-brand-gold">12</div>
                <p className="mt-1 text-sm text-white/80">luni cu sezonalitate calculata pentru voi</p>
              </div>
            </div>
            <p className="mt-8 text-sm text-white/60 max-w-xl mx-auto">
              Bazat pe portofoliul real de 50 publicatii romanesti (1 per judet + 9 nationale) si
              50 pagini Facebook asociate. Fara cont, fara email.
            </p>
          </div>
        </div>
      </section>

      <StrategyGenerator
        actionHref="#cum-publicam"
        actionLabel="Vezi cum publicam aceste idei"
      />

      <section className="section bg-white">
        <div className="container max-w-5xl">
          <div className="text-center">
            <p className="eyebrow">Cum functioneaza</p>
            <h2 className="h2 mt-2">3 pasi pana la strategie</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Step
              icon={Brain}
              n={1}
              title="Dai brandul"
              desc="Site URL (ex: dentcluj.ro) sau nume firma. Adaugi optional 1-2 propozitii despre voi pentru raspunsuri mai precise."
            />
            <Step
              icon={Zap}
              n={2}
              title="Strategul analizeaza"
              desc="Agentul nostru identifica industria, audienta, oportunitatile editoriale si sezonalitatea. Aproximativ 30 secunde."
            />
            <Step
              icon={Globe2}
              n={3}
              title="Primesti planul complet"
              desc="5 idei tailored brandului vostru, fiecare cu tip articol si luna, plus pachet si frecventa din portofoliul real MediaExpres."
            />
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container max-w-3xl">
          <p className="eyebrow">De ce e unic</p>
          <h2 className="h2 mt-2">
            Strategia e ancorata in reteaua reala MediaExpres
          </h2>
          <p className="lead mt-4 text-slate-600">
            Spre deosebire de tool-uri AI generice care iti dau idei "in vid", strategul nostru
            stie exact:
          </p>
          <ul className="mt-6 space-y-3.5 text-slate-700">
            <li className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                Pe ce <strong>50 publicatii romanesti</strong> poate fi distribuit articolul
                (1 per judet + 9 nationale, toate cu DA 37)
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                Ce tipuri de articole functioneaza pe retea: redactional jurnalistic, NU
                reclama platita
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                Ce pachet ti se potriveste (Local 150 RON / Regional 500 RON / National 1500
                RON / Abonamente Bronze-Platinum)
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                Cum se aliniaza ideile cu sezonalitatea pietei romanesti (bilanturi in
                decembrie, lansari in toamna, etc.)
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                Frecventa optima pentru brand-ul vostru (one-shot single article vs abonament
                Gold pentru clienti recurenti)
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                Pentru iGaming/cazino: pachete ONJN-compliant cu mentiuni joc responsabil
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section id="cum-publicam" className="section bg-white">
        <div className="container max-w-5xl">
          <div className="text-center">
            <p className="eyebrow">Reteaua MediaExpres</p>
            <h2 className="h2 mt-2">Cum publicam aceste idei</h2>
            <p className="lead mt-4 text-slate-600 max-w-2xl mx-auto">
              Daca ti-au placut ideile generate, le putem distribui pe reteaua reala de 50
              publicatii romanesti. Iata cum.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <NetworkCard
              icon={Newspaper}
              big="50"
              title="publicatii online romanesti"
              desc="41 publicatii locale (cate 1 per judet) + 9 publicatii nationale. Articolul apare simultan pe toate."
            />
            <NetworkCard
              icon={Facebook}
              big="50"
              title="pagini Facebook asociate"
              desc="Fiecare publicatie are pagina Facebook proprie. Articolul se distribuie automat in ziua publicarii."
            />
            <NetworkCard
              icon={CheckCircle2}
              big="12h"
              title="raport PDF garantat"
              desc="In 12 ore primesti raport cu toate URL-urile + screenshot-uri + factura post-publicare."
            />
          </div>

          <div className="mt-10 rounded-2xl border-2 border-brand-navy bg-brand-navy p-8 text-white">
            <div className="grid gap-6 md:grid-cols-3 md:items-center">
              <div className="md:col-span-2">
                <h3 className="font-serif text-2xl md:text-3xl font-bold text-white">
                  Articol redactional, NU reclama platita
                </h3>
                <p className="mt-3 text-white/85 leading-relaxed">
                  Articolul vostru apare ca <strong className="text-brand-gold">stire
                  jurnalistica</strong>, cu format redactional pe fiecare publicatie - nu ca
                  banner sau ad. Mult mai credibil. Plus: linkuri PERMANENTE care raman online
                  ani de zile si lucreaza continuu pentru SEO.
                </p>
              </div>
              <div className="md:text-right">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gold px-6 py-3.5 text-sm font-bold text-brand-navy shadow-lg hover:shadow-xl transition"
                >
                  Vezi toate pachetele
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <h2 className="h2 text-white">Pasul urmator</h2>
          <p className="lead mt-4 mx-auto max-w-2xl text-white/85">
            Ti-au placut ideile? Hai sa le publicam. Agentul nostru te ajuta cu redactarea - voi
            furnizati doar tematica si 3 poze. In 12 ore ai raportul.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gold px-8 py-4 text-base font-bold text-brand-navy shadow-lg hover:shadow-xl transition"
            >
              Vezi pachetele MediaExpres
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/parteneri"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition"
            >
              Esti agentie PR? Vezi program reseller
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-8 text-xs text-white/50">
            Powered by MediaExpres - mediaexpress.ro - cea mai mare retea de presa online din
            Romania
          </p>
        </div>
      </section>
    </>
  );
}

function Step({
  icon: Icon,
  n,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-lg">
        <Icon className="h-7 w-7" />
      </div>
      <div className="mt-3 text-xs font-bold uppercase tracking-wider text-brand-red">
        Pasul {n}
      </div>
      <h3 className="mt-1 font-serif text-xl font-bold text-brand-navy">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function NetworkCard({
  icon: Icon,
  big,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  big: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-brand-red" />
      <div className="mt-3 font-serif text-5xl font-bold text-brand-navy">{big}</div>
      <p className="mt-1 text-sm font-semibold text-brand-navy">{title}</p>
      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
