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
import { ZiarulJudetului, numeZiarJudet } from "@/components/ZiareCuPoze";
import { citesteAutoritateaRetelei, type ScorRetea } from "@/lib/autoritate-retea";
import { NEWSPAPERS } from "@/data/newspapers";
import { stiriZiar } from "@/lib/stiri-judet";

// 15.11.2026 — cifrele live ale ziarului (articole, DA) se reimprospateaza.
export const revalidate = 1800;

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

  // 15.11.2026 — titlurile pe cautarile reale (Google Ads, RO): „publicitate <oras>",
  // „agentie de publicitate/marketing <oras>", „ziar <oras>"; „comunicat de presa <oras>"
  // are ~0 cautari, ramane in text.
  const ziar = numeZiarJudet(county.name);
  const title = ziar
    ? `Publicitate în ${county.capital}: articol în ziarul local ${ziar}, de la 150 lei`
    : `Publicitate în ${county.capital}: articol și comunicat de presă, de la 150 lei`;
  const description = `Promovare pentru firme din ${county.capital} și județul ${county.name}: articol sau comunicat de presă în ziarul local${ziar ? ` ${ziar}` : ""}, cu link și distribuire pe Facebook, publicat în 12 ore lucrătoare. 150 lei un ziar, 500 lei toate cele 50.`;

  return {
    title,
    description,
    alternates: { canonical: `/publicare-comunicat-${county.slug}` },
    keywords: [
      `publicitate ${county.capital}`,
      `agentie de publicitate ${county.capital}`,
      `agentie marketing ${county.capital}`,
      `promovare firma ${county.capital}`,
      `ziar ${county.capital}`,
      `comunicat de presa ${county.name}`,
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
    title: "Publicare în 12 ore lucrătoare",
    text: "Echipa noastră publică pe ziarele alese. Primești email cu toate URL-urile + raport PDF.",
  },
];

export default async function CountyPage({
  params,
}: {
  params: { judet: string };
}) {
  const county = findCountyBySlug(params.judet);
  if (!county) notFound();
  const ziar = numeZiarJudet(county.name);
  // La build nu exista baza (Railway); scorurile vin la prima regenerare (revalidate).
  const scoruri = process.env.NEXT_PHASE === "phase-production-build" ? new Map() : await citesteAutoritateaRetelei();
  const autoritate: ScorRetea = {};
  for (const [d, a] of scoruri) if (a.da != null) autoritate[d] = { da: a.da, pa: a.pa };
  // 18.11.2026 — ultimele stiri din ziarul local, jos pe pagina: pagina se schimba zilnic.
  const ziarLocal = NEWSPAPERS.find((x) => x.type === "local" && x.county === county.name);
  const stiri =
    ziarLocal && process.env.NEXT_PHASE !== "phase-production-build" ? await stiriZiar(ziarLocal.url) : [];
  const zi = (d: Date) =>
    d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" });
  const faq = [
    {
      q: `Cât costă publicitatea în ${county.capital}?`,
      a: `Un articol în ziarul local${ziar ? ` ${ziar}` : ""} costă 150 lei. Același articol în toate cele 50 de ziare ale rețelei (41 județene și 9 naționale) costă 500 lei. Prețuri finale, cu factură.`,
    },
    {
      q: "În cât timp apare articolul?",
      a: "În maximum 12 ore lucrătoare de la plată. Poți alege și publicare eșalonată, pe 3 zile sau pe 2 săptămâni.",
    },
    {
      q: "Ce primesc după publicare?",
      a: "Un link de raport, pe email, unde vezi în timp real fiecare articol cu linkul lui. Raportul se descarcă și în PDF și Excel. Articolele rămân online permanent.",
    },
    {
      q: "Trebuie să am articolul scris?",
      a: "Nu. Ne trimiți site-ul și ce vrei să promovezi, îl scriem noi și ți-l arătăm înainte de publicare. Dacă îl ai, îl trimiți în Word sau ca text, cu până la 3 poze și 3 linkuri.",
    },
    {
      q: `Sunteți o agenție de publicitate din ${county.capital}?`,
      a: `Suntem o rețea de 50 de ziare online, cu câte un ziar în fiecare județ${ziar ? `; în județul ${county.name} ziarul este ${ziar}` : ""}. Publicăm direct, fără intermediari, și distribuim articolul pe pagina de Facebook a ziarului.`,
    },
  ];

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
              Publicitate în {county.capital}: articol în ziarul local{ziar ? ` ${ziar}` : ""}
            </h1>
            <p className="lead mt-4 text-white/85">
              Promovare pentru firmele din {county.capital} și județul {county.name}: articolul sau
              comunicatul tău de presă apare în ziarul local, cu link spre site și distribuire pe
              Facebook, în maximum 12 ore lucrătoare. Prețuri fixe: 150 lei un ziar, 500 lei toate cele 50.
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

      <section className="bg-slate-50 py-16">
        <div className="container grid items-start gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">Ziarul local din {county.capital}</p>
            <h2 className="h2 mt-2">{ziar ?? `Ziarul din județul ${county.name}`}</h2>
            <p className="mt-4 text-slate-600">
              Aici apare articolul tău. Prima pagină de azi, autoritatea în Google (DA și PA, Moz) și câte
              articole a publicat ziarul în ultimele 24 de ore. Apasă și verifică.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/oferta-500">Toate cele 50 de ziare — 500 lei</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/cum-comanzi">Cum comanzi</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Vrei să vezi toate ziarele? <Link href="/reteaua-noastra" className="underline">Lista celor 50 de ziare</Link>
            </p>
          </div>
          <ZiarulJudetului judet={county.name} autoritate={autoritate} />
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
                "Livrare în 12 ore lucrătoare",
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
                "Livrare în 12 ore lucrătoare",
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
                "Livrare în 12 ore lucrătoare",
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
                "Link permanent către site-ul tău, din articol",
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
            secunde. Articolul tău e publicat în maximum 12 ore lucrătoare.
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
      {/* 15.11.2026 — text pe cautarile reale din oras (Google Ads, RO): publicitate,
          agentie de publicitate / marketing, promovare firma, ziar <oras>. Plus date
          structurate Service, ca motoarele si AI-urile (ChatGPT, Gemini, Perplexity)
          sa citeasca clar: ce, unde, cat costa. */}
      <section className="bg-white py-16">
        <div className="container max-w-3xl space-y-8 text-slate-700">
          <div>
            <h2 className="h2">Publicitate în {county.capital}, prin ziarul local</h2>
            <p className="mt-3">
              Pentru o firmă din {county.capital}, cea mai directă formă de publicitate este un articol în ziarul
              online al județului{ziar ? `, ${ziar}` : ""}. Articolul rămâne online permanent, are până la 3 linkuri
              spre site-ul tău și este distribuit pe pagina de Facebook a ziarului, unde îl văd oamenii din
              {" "}{county.capital} și din tot județul {county.name}.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-brand-navy">Agenție de publicitate în {county.capital} sau articol în ziar?</h3>
            <p className="mt-2">
              O agenție de publicitate sau de marketing din {county.capital} îți face o campanie cu abonament lunar.
              Un articol în ziarul local costă o singură dată 150 lei și lucrează pentru tine ani de zile: apare în
              Google la căutările despre firma ta, aduce vizite pe site și îți dă un link din presă pe care îl poți
              arăta clienților. Pentru acoperire în toată țara, același articol apare în toate cele 50 de ziare ale
              rețelei, la 500 lei.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-brand-navy">Promovarea firmei tale în {county.capital}, pas cu pas</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Trimiți articolul (Word sau text) sau doar site-ul, și îl scriem noi.</li>
              <li>Adaugi până la 3 poze și până la 3 linkuri spre site.</li>
              <li>Plătești cu cardul, prin ordin de plată sau ne scrii pe WhatsApp.</li>
              <li>Articolul apare în maximum 12 ore lucrătoare și primești linkul de raport, în timp real.</li>
            </ol>
            <p className="mt-2">
              Detalii, cu clip și capturi: <Link href="/cum-comanzi" className="underline">cum comanzi</Link>.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-brand-navy">Publicitate și în alte orașe din {regionLabel[county.region]}</h3>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {COUNTIES.filter((c) => c.region === county.region && c.slug !== county.slug).map((c) => (
                <Link key={c.slug} href={`/publicare-comunicat-${c.slug}`} className="underline">
                  {c.capital}
                </Link>
              ))}
            </p>
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: `Publicitate în ${county.capital}: articol în ziarul local${ziar ? ` ${ziar}` : ""}`,
              serviceType: "Publicare articol și comunicat de presă în ziar online",
              areaServed: { "@type": "City", name: county.capital, containedInPlace: { "@type": "AdministrativeArea", name: `Județul ${county.name}` } },
              provider: { "@type": "Organization", name: "MediaExpres", url: "https://mediaexpress.ro" },
              offers: [
                { "@type": "Offer", name: `Articol în ziarul local${ziar ? ` ${ziar}` : ""}`, price: "150", priceCurrency: "RON" },
                { "@type": "Offer", name: "Articol în toate cele 50 de ziare", price: "500", priceCurrency: "RON", url: "https://mediaexpress.ro/oferta-500" },
              ],
            }),
          }}
        />
      </section>

      <section className="bg-white py-16">
        <div className="container max-w-3xl">
          <p className="eyebrow">Întrebări frecvente</p>
          <h2 className="h2 mt-2">Publicitate în {county.capital}: ce trebuie să știi</h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {faq.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer font-semibold text-brand-navy">{f.q}</summary>
                <p className="mt-2 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            }),
          }}
        />
      </section>

      {ziarLocal && stiri.length > 0 && (
        <section className="bg-slate-50 py-10">
          <div className="container max-w-3xl">
            <h2 className="text-base font-semibold text-brand-navy">Ultimele știri din {ziarLocal.name}</h2>
            <ul className="mt-3 divide-y divide-slate-200 text-sm">
              {stiri.map((s) => (
                <li key={s.link} className="flex items-baseline justify-between gap-4 py-2">
                  <a href={s.link} target="_blank" rel="noopener" className="text-slate-700 hover:text-brand-navy hover:underline">
                    {s.titlu}
                  </a>
                  {s.data && <span className="shrink-0 text-xs text-slate-500">{zi(s.data)}</span>}
                </li>
              ))}
            </ul>
            {stiri[0].data && (
              <p className="mt-3 text-xs text-slate-500">
                Pagină actualizată la {zi(stiri[0].data)}. Știrile vin direct din {ziarLocal.name}.
              </p>
            )}
          </div>
        </section>
      )}
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
