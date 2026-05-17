import type { Metadata } from "next";
import { OfertaFbForm } from "./OfertaFbForm";
import { Newspaper, Clock, ShieldCheck, TrendingUp, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Apari în 50 de ziare românești — Ofertă specială",
  description:
    "Distribuție în 50 de ziare online din România. Raport PDF cu screenshot-uri în 24h. De la 150 RON.",
  robots: { index: false, follow: false },
};

export default function OfertaFbPage() {
  return (
    <div className="bg-gradient-to-b from-[#F8F5F0] to-white">
      <section className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-red">
              <Star className="h-3 w-3 fill-current" /> Ofertă specială
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-brand-navy md:text-5xl">
              Apari în <span className="text-brand-red">50 de ziare</span>{" "}
              românești într-o singură zi
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Comunicatul tău publicat pe rețeaua MediaExpres — 50 de ziare online cu trafic
              real. Raport PDF cu screenshot-uri în 24h.
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
                  <strong className="text-brand-navy">Raport PDF</strong> cu screenshot-uri
                  și link-uri verificabile
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
                Primești oferta pe email
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-brand-navy">
                Ofertă personalizată cu prețuri și detalii complete
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Completează form-ul și primești pe email oferta cu pachetele, prețurile și
                lista rețelei de ziare.
              </p>
            </div>
            <OfertaFbForm />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            <TrustCard
              number="312"
              label="companii servite"
              subline="startup-uri, IMM-uri, agenții PR"
            />
            <TrustCard
              number="15.000+"
              label="articole publicate"
              subline="toate indexate Google, link-uri active"
            />
            <TrustCard
              number="24h"
              label="timp publicare"
              subline="de la confirmarea comenzii"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-center font-serif text-2xl font-bold text-brand-navy">
          Întrebări frecvente
        </h2>
        <div className="mt-8 space-y-4">
          <FaqItem
            q="Cât costă?"
            a="Pachetele încep de la 150 RON (1 ziar județean) și ajung la 1500 RON (50 ziare, acoperire națională). Detalii complete primești pe email după completarea formularului."
          />
          <FaqItem
            q="Sunt ziare reale?"
            a="Da. Rețeaua MediaExpres include 50 de domenii .ro proprii, fiecare cu trafic SEO real și indexare Google."
          />
          <FaqItem
            q="Cum primesc dovada că s-a publicat?"
            a="În 24h de la confirmare primești un raport PDF cu URL-urile fiecărui articol publicat plus screenshot-uri."
          />
          <FaqItem
            q="Pot să-mi scriu eu articolul?"
            a="Da. Trimiți textul tău sau, la cerere, îl scriem noi cu AI pe baza temei tale."
          />
        </div>
      </section>
    </div>
  );
}

function TrustCard({
  number,
  label,
  subline,
}: {
  number: string;
  label: string;
  subline: string;
}) {
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
