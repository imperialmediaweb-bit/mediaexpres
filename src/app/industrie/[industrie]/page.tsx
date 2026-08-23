import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Newspaper, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INDUSTRIES, findIndustryBySlug } from "@/data/industries";
import { COUNTIES } from "@/data/counties";
import { SITE } from "@/data/site";

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ industrie: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { industrie: string };
}): Promise<Metadata> {
  const industry = findIndustryBySlug(params.industrie);
  if (!industry) return { title: "Pagina nu există" };

  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: { canonical: `/comunicate-presa-${industry.slug}` },
    keywords: industry.keywords,
    openGraph: {
      title: industry.metaTitle,
      description: industry.metaDescription,
      url: `/comunicate-presa-${industry.slug}`,
    },
  };
}

export default function IndustryPage({
  params,
}: {
  params: { industrie: string };
}) {
  const industry = findIndustryBySlug(params.industrie);
  if (!industry) notFound();

  // JSON-LD: FAQ (eligibil pentru rich results), Service si Breadcrumb.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: industry.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: industry.heading,
    description: industry.metaDescription,
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
    areaServed: { "@type": "Country", name: "România" },
    serviceType: "Distribuție comunicate de presă",
    offers: {
      "@type": "Offer",
      priceCurrency: "RON",
      price: "150",
      description: "Publicare de la 150 RON (pachet Local)",
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Acasă", item: SITE.url },
      {
        "@type": "ListItem",
        position: 2,
        name: industry.heading,
        item: `${SITE.url}/comunicate-presa-${industry.slug}`,
      },
    ],
  };

  // Interlinking: cateva judete mari + alte industrii (fara pagina curenta).
  const bigCounties = COUNTIES.filter((c) =>
    ["bucuresti", "cluj", "iasi", "timis", "constanta", "brasov"].includes(c.slug),
  );
  const otherIndustries = INDUSTRIES.filter((i) => i.slug !== industry.slug).slice(0, 6);

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-brand-navy text-white">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <nav className="text-sm text-white/60">
              <Link href="/" className="hover:text-white">Acasă</Link>
              <span className="mx-2">/</span>
              <span className="text-white/80">Comunicate {industry.name}</span>
            </nav>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight md:text-5xl">
              {industry.heading}
            </h1>
            <p className="mt-5 text-lg text-white/85">{industry.intro[0]}</p>
            <p className="mt-3 text-white/75">{industry.intro[1]}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="accent" size="lg" asChild>
                <Link href="/pachete">Vezi pachetele — de la 150 RON</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <Link href="/generator-comunicat">Generează articolul gratuit</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* De ce functioneaza */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">De ce funcționează</p>
            <h2 className="h2 mt-2">
              Presa aduce clienți pentru {industry.name}
            </h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            {industry.reasons.map((r) => (
              <div
                key={r.title}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <CheckCircle2 className="h-6 w-6 text-brand-red" />
                <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy">
                  {r.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Idei de articole */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-7 w-7 text-brand-gold" />
              <h2 className="h2">Idei de articole care se publică des</h2>
            </div>
            <ul className="mt-8 space-y-3">
              {industry.exampleTopics.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <Newspaper className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <span className="text-slate-700">{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-slate-600">
              Nu ai timp să scrii? Descrii subiectul în două fraze și{" "}
              <Link href="/generator-comunicat" className="font-semibold text-brand-red hover:underline">
                redactorul nostru AI scrie articolul
              </Link>{" "}
              — tu doar îl aprobi.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2 text-center">Întrebări frecvente</h2>
            <div className="mt-10 space-y-4">
              {industry.faq.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-slate-200 bg-white p-5"
                >
                  <summary className="cursor-pointer list-none font-semibold text-brand-navy marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="text-xl text-brand-red transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-navy text-white">
        <div className="container py-14 text-center">
          <h2 className="h2 text-white">
            Publică primul articol în 4 ore
          </h2>
          <p className="lead mx-auto mt-3 max-w-2xl text-white/85">
            De la 150 RON pentru un ziar județean, până la 50 de ziare în toată
            țara. Plată cu cardul, raport cu toate linkurile.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button variant="accent" size="lg" asChild>
              <Link href="/pachete">
                Alege pachetul <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Interlinking */}
      <section className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="container">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Publicare pe județe
              </h3>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {bigCounties.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/publicare-comunicat-${c.slug}`}
                      className="text-slate-600 hover:text-brand-red"
                    >
                      Comunicate {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Alte industrii
              </h3>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {otherIndustries.map((i) => (
                  <li key={i.slug}>
                    <Link
                      href={`/comunicate-presa-${i.slug}`}
                      className="text-slate-600 hover:text-brand-red"
                    >
                      {i.name.charAt(0).toUpperCase() + i.name.slice(1)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
