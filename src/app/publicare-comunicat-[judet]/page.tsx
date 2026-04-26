import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  Newspaper,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { COUNTIES, findCountyBySlug } from "@/data/counties";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";

export function generateStaticParams() {
  return COUNTIES.map((c) => ({ judet: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { judet: string };
}): Promise<Metadata> {
  const county = findCountyBySlug(params.judet);
  if (!county) return { title: "Pagina nu există" };

  const title = `Publicare comunicat de presă în ${county.name} — MediaExpres`;
  const description = `Publică-ți comunicatul de presă pe ziarele din județul ${county.name} în 24h. Pachet Local de la 150 RON, Regional 500 RON sau Național 1500 RON pe 50 ziare. Plată online cu cardul.`;

  return {
    title,
    description,
    alternates: { canonical: `/publicare-comunicat-${county.slug}` },
    keywords: [
      `publicare comunicat presa ${county.name}`,
      `comunicat presa ${county.capital}`,
      `articole presa ${county.name}`,
      `pr ${county.name}`,
      `advertorial ${county.name}`,
    ],
    openGraph: {
      title,
      description,
      url: `/publicare-comunicat-${county.slug}`,
    },
  };
}

const STEPS = [
  {
    icon: Newspaper,
    title: "Alege pachetul",
    text: "Local pentru județul tău, Regional pentru întreaga zonă, sau Național pe toată țara.",
  },
  {
    icon: Zap,
    title: "Trimite articolul",
    text: "Lipești textul (sau îl generezi cu AI gratuit), eventual 3 poze. Plătești cu cardul.",
  },
  {
    icon: CheckCircle2,
    title: "Publicare în 24h",
    text: "Echipa noastră publică pe ziarele alese. Primești email cu toate URL-urile + raport PDF.",
  },
];

export default function CountyPage({
  params,
}: {
  params: { judet: string };
}) {
  const county = findCountyBySlug(params.judet);
  if (!county) notFound();

  const regionLabel: Record<typeof county.region, string> = {
    Moldova: "Moldova",
    Transilvania: "Transilvania",
    Muntenia: "Muntenia / Dobrogea",
    Banat: "Banat / Oltenia",
    Bucuresti: "București",
  };

  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-gold/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-gold">
              <MapPin className="h-3.5 w-3.5" /> Județul {county.name}
            </div>
            <h1 className="h1 mt-4 text-white">
              Publicare comunicat de presă în {county.name}
            </h1>
            <p className="lead mt-4 text-white/85">
              Articolul tău apare pe ziarele din {county.capital} și împrejurimi
              în maximum 24 de ore. Plată online cu cardul, fără negocieri,
              prețuri fixe și transparente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="gold" size="lg" asChild>
                <a href="#preturi">Vezi prețurile</a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="border-white/30 text-white hover:bg-white hover:text-brand-navy"
              >
                <Link href="/generator-comunicat">Generator AI gratuit</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container">
          <div className="max-w-3xl">
            <p className="eyebrow">Cum funcționează</p>
            <h2 className="h2 mt-2">3 pași până când articolul tău e online</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10 text-brand-red font-serif font-bold">
                    {i + 1}
                  </div>
                  <s.icon className="h-5 w-5 text-brand-red" />
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-brand-navy">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preturi" className="bg-brand-ivory py-16">
        <div className="container">
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-red">Prețuri pentru județul {county.name}</p>
            <h2 className="h2 mt-2">Alege ce acoperire vrei</h2>
            <p className="mt-3 text-slate-600">
              Toate variantele includ publicare permanentă, distribuție Facebook
              și raport cu URL-urile. Plată unică, fără abonament obligatoriu.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <PriceCard
              name="Local"
              tagline={`Doar județul ${county.name}`}
              price={150}
              packageId="local"
              features={[
                `Publicare pe ziarul județean ${county.name}`,
                "Distribuție Facebook județeană",
                "Link permanent + raport URL",
                "Livrare în 24h",
              ]}
            />
            <PriceCard
              name="Regional"
              tagline={`${regionLabel[county.region]} — toată zona`}
              price={500}
              packageId="regional"
              features={[
                `${regionLabel[county.region]} — 10 ziare`,
                "Distribuție pe paginile FB asociate",
                "Linkuri permanente + raport PDF",
                "Livrare în 24h",
              ]}
              highlighted
            />
            <PriceCard
              name="Național 50"
              tagline="Toată România"
              price={1500}
              packageId="national"
              features={[
                "Publicare pe rețeaua națională (50 ziare)",
                "Distribuție FB extinsă",
                "Raport PDF complet cu toate URL-urile",
                "Livrare în 24h",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Shield className="mx-auto h-10 w-10 text-brand-red" />
            <h2 className="h2 mt-4">De ce alege MediaExpres în {county.name}</h2>
            <p className="lead mt-4 text-slate-600">
              Suntem cea mai mare rețea editorială pentru advertoriale de afaceri
              din România. Am publicat articole pentru firme din toate cele 41 de
              județe — locale, IMM-uri, branduri naționale.
            </p>
            <ul className="mt-8 grid gap-3 text-left max-w-xl mx-auto">
              {[
                "Publicare permanentă (linkurile rămân online ani de zile)",
                "Backlink real către site-ul tău (autoritate SEO)",
                "Distribuție automată pe Facebook",
                "Raport PDF cu toate URL-urile pentru evidență",
                "Plată unică, factură fiscală, fără abonament obligatoriu",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-brand-navy text-white py-16">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold">
            Pregătit să publici în {county.name}?
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-white/80">
            Plătești online cu cardul, primești email de confirmare în 30 de
            secunde. Articolul tău e publicat în maximum 24h.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" asChild>
              <Link href="/generator-comunicat">Generator AI gratuit</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="border-white/40 text-white hover:bg-white hover:text-brand-navy"
            >
              <Link href="/pachete">Vezi toate pachetele</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function PriceCard({
  name,
  tagline,
  price,
  packageId,
  features,
  highlighted,
}: {
  name: string;
  tagline: string;
  price: number;
  packageId: "local" | "regional" | "national";
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
        highlighted
          ? "border-brand-red shadow-xl ring-1 ring-brand-red/20"
          : "border-slate-200"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-red px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
          Recomandat
        </span>
      )}
      <h3 className="font-serif text-2xl font-bold text-brand-navy">{name}</h3>
      <p className="mt-1 text-sm text-slate-500">{tagline}</p>
      <p className="mt-4 font-serif text-4xl font-bold text-brand-navy">
        {price} <span className="text-base font-medium text-slate-500">lei</span>
      </p>
      <ul className="mt-5 space-y-2 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-slate-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <CheckoutButton
        packageId={packageId}
        mode="package"
        label={`Plătește ${price} RON`}
        variant={highlighted ? "accent" : "default"}
        size="lg"
        className="mt-6 w-full"
      />
    </div>
  );
}
