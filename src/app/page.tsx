import type { Metadata } from "next";
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
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
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
