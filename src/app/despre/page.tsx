import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Target, Users, Award, Handshake } from "lucide-react";
import { Stats } from "@/components/home/Stats";
import { CtaBanner } from "@/components/home/CtaBanner";

export const metadata: Metadata = {
  title: "Despre noi — MediaExpres",
  description:
    "MediaExpres este o agenție românească specializată în distribuție de comunicate de presă pe rețeaua celor mai citite ziare din România.",
  alternates: { canonical: "/despre" },
};

const VALUES = [
  {
    icon: Target,
    title: "Rezultate măsurabile",
    description:
      "Fiecare articol publicat e documentat cu URL și screenshot. Vezi exact ce cumperi.",
  },
  {
    icon: Users,
    title: "Clientul pe primul loc",
    description:
      "Suport dedicat, timp de răspuns sub 2 ore în program. Zero roboți, doar oameni.",
  },
  {
    icon: Award,
    title: "Calitate editorială",
    description:
      "Publicăm doar pe site-uri active, cu trafic real și autoritate SEO demonstrată.",
  },
  {
    icon: Handshake,
    title: "Parteneriat pe termen lung",
    description:
      "Abonamentele noastre sunt gândite pentru brand-uri care vor prezență constantă.",
  },
];

export default function DesprePage() {
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-20 text-center">
          <p className="eyebrow text-brand-gold">Despre MediaExpres</p>
          <h1 className="h1 mt-3 text-white max-w-3xl mx-auto">
            Facem presa accesibilă tuturor afacerilor românești
          </h1>
          <p className="lead mx-auto mt-6 max-w-2xl text-white/85">
            Am pornit de la o întrebare simplă: de ce ar plăti o firmă locală sume uriașe pentru
            publicare în presă, când tehnologia ne permite să distribuim rapid și eficient pe zeci
            de ziare simultan?
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Misiune</p>
            <h2 className="h2 mt-2">Comunicate de presă, la îndemâna oricărei afaceri</h2>
            <div className="prose-me mt-6 space-y-4">
              <p>
                Timp de ani de zile, apariția în presă a fost un privilegiu rezervat corporațiilor
                cu bugete de PR consistente. MediaExpres schimbă asta.
              </p>
              <p>
                Cu o rețea de 50 de ziare partenere (41 locale + 9 naționale) și 37 pagini Facebook,
                oferim IMM-urilor, clinicilor, restaurantelor, startup-urilor și agențiilor de
                marketing acces la vizibilitatea pe care, până acum, doar cei mari și-o permiteau.
              </p>
              <p>
                Totul cu prețuri fixe, transparente, livrare în 24h și raport PDF complet —
                documentat la link și screenshot.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-red p-10 text-white shadow-2xl">
              <blockquote className="font-serif text-2xl leading-relaxed italic">
                &ldquo;Vedem presa ca pe o infrastructură de comunicare — și vrem să fie la
                îndemâna oricărei afaceri care are ceva important de spus.&rdquo;
              </blockquote>
              <p className="mt-6 text-sm font-semibold text-brand-gold">
                — Echipa MediaExpres
              </p>
            </div>
          </div>
        </div>
      </section>

      <Stats />

      <section className="section bg-newsprint">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Valorile noastre</p>
            <h2 className="h2 mt-2">În ce credem</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="flex gap-5 rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
                  <v.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-brand-navy">
                    {v.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </>
  );
}
