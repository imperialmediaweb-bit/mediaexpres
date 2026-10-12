import type { Metadata } from "next";
import { SITE } from "@/data/site";
import { Hero } from "@/components/home/Hero";
import { CoverageBanner } from "@/components/home/CoverageBanner";
import { ClientiStrip } from "@/components/ClientiStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Features } from "@/components/home/Features";
import { Stats } from "@/components/home/Stats";
import { PricingTeaser } from "@/components/home/PricingTeaser";
import { Testimonials } from "@/components/home/Testimonials";
import { FAQ } from "@/components/home/FAQ";
import { CtaBanner } from "@/components/home/CtaBanner";

// Canonical pe prima pagina (audit SEO 09.10.2026: lipsea).
// Titlul tinteste „advertorial" (Ubersuggest RO: ~1.000 cautari/luna,
// dificultate 11/100) si „comunicat de presa", fara sa repete brandul.
export const metadata: Metadata = {
  title: "Advertorial și comunicat de presă în 50 de ziare",
  description:
    "Advertorialul sau comunicatul tău de presă publicat în 50 de ziare online din România, în 12 ore lucrătoare. Raport cu toate linkurile, factură, de la 150 lei.",
  alternates: { canonical: "/", languages: { "ro-RO": "/", en: "/en", "x-default": "/" } },
};

// Serviciul, descris pentru motoarele de cautare si asistentii AI (11.10.2026):
// ce vindem, unde, la ce pret. Preturile sunt cele din data/packages.ts.
const SERVICIU = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Publicare advertoriale și comunicate de presă în 50 de ziare online",
  serviceType: "Publicare advertoriale și comunicate de presă",
  description:
    "Advertorialul sau comunicatul de presă al clientului, publicat în 50 de ziare online din România (41 locale, câte unul pe județ, și 9 naționale), în maximum 12 ore lucrătoare, cu raport cu toate linkurile și distribuire pe 46 de pagini de Facebook.",
  provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
  areaServed: { "@type": "Country", name: "România" },
  url: SITE.url,
  offers: [
    { "@type": "Offer", name: "Articol în 50 de ziare (ofertă)", price: "500", priceCurrency: "RON", url: `${SITE.url}/oferta-500` },
    { "@type": "Offer", name: "Local: 1 ziar ales", price: "150", priceCurrency: "RON", url: `${SITE.url}/pachete` },
    { "@type": "Offer", name: "Regional: 10 ziare dintr-o regiune", price: "500", priceCurrency: "RON", url: `${SITE.url}/pachete` },
    { "@type": "Offer", name: "Cazino și pariuri: 50 de ziare", price: "1000", priceCurrency: "RON", url: `${SITE.url}/oferta-500` },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICIU) }} />
      <Hero />
      <CoverageBanner />
      <ClientiStrip />
      <HowItWorks />
      <Features />
      <Stats />
      <PricingTeaser />
      <Testimonials />
      <FAQ />
      <CtaBanner />
    </>
  );
}
