import type { Metadata } from "next";
import { OfertaFbForm } from "./OfertaFbForm";
import { Newspaper, Clock, ShieldCheck, TrendingUp, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Apari în 50 de ziare românești — Ofertă specială",
  description:
    "Distribuție garantată în 50 de ziare online din România. Raport PDF cu screenshot-uri în 24h. De la 250 RON.",
  robots: { index: false, follow: false },
};

export default function OfertaFbPage() {
  return (
    <div className="bg-gradient-to-b from-[#F8F5F0] to-white">
      <section className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-red">
              <Star className="h-3 w-3 fill-current" /> Ofertă limitată
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-brand-navy md:text-5xl">
              Apari în <span className="text-brand-red">50 de ziare</span>{" "}
              românești într-o singură zi
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Comunicatul tău publicat pe rețeaua MediaExpres — 50 de ziare
              online cu trafic real. Raport PDF cu screenshot-uri în 24h.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Newspaper className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-red" />
                <span>
                  <strong className="text-brand-navy">50 de ziare online</strong>{" "}
                  cu domeniu propriu și trafic indexat Google
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-red" />
                <span>
                  <strong className="text-brand-navy">Publicat în 24h</strong>{" "}
                  de la confirmarea comenzii
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-red" />
                <span>
                  <strong className="text-brand-navy">Raport PDF</strong> cu
                  screenshot-uri și link-uri verificabile
                </span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-red" />
                <span>
                  <strong className="text-brand-navy">SEO backlinks</strong>{" "}
                  reali din 50 domenii diferite
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-brand-red/20 bg-white p-6 shadow-xl md:p-8">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Începe acum
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-brand-navy">
                Primești oferta personalizată în 30 minute
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Completeă form-ul și te sunăm să-ți explicăm exact ce pachet se
                potrivește bugetului tău.
              </p>
            </div>
            <OfertaFbForm />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            <TrustCard number="312" label="companii servite" subline="în 2024 — startup-uri, IMM-uri, agenții" />
            <TrustCard number="15.000+" label="articole publicate" subline="toate indexate Google, link-uri active" />
            <TrustCard number="24h" label="timp publicare" subline="de la confirmarea comenzii" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-serif text-2xl font-bold text-brand-navy text-center">ntrebări frecvente</h2>
        <div className="mt-8 space-y-4">
          <FaqItem q="Cât costă?" a="Pachetele încep de la 250 RON (5 ziare) și ajung la 1490 RON (50 ziare premium). După ce completeți form-ul, primiți oferta personalizată cu prețul exact." />
          <FaqItem q="Sunt ziare reale?" a="Da. Rețeaua MediaExpres include 50 de domenii .ro proprii, fiecare cu trafic SEO real și indexare Google." />
          <FaqItem q="Cum primesc dovada că s-a publicat?" a="În 24h de la confirmare primeți un raport PDF cu URL-urile fiecărui articol publicat plus screenshot-uri." />
          <FaqItem q="Pot să-mi scriu eu articolul?" a="Da. Trimiteți textul vostru sau, la cerere, scriem noi articolul pe baza brief-ului tău." />
        </div>
      </section>
    </div>
  );
}

function TrustCard({ number, label, subline }: { number: string; label: string; subline: string }) {
  return (
    <div className="text-center">
      <p className="font-serif text-4xl font-bold text-brand-red">{number}</p>
      <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-brand-navy">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{subline}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer list-none font-semibold text-brand-navy marker:hidden">
        <span className="flex items-center justify-between">
          {q}
          <span className="text-brand-red transition-transform group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="mt-3 text-sm text-slate-600">{a}</p>
    </details>
  );
}
