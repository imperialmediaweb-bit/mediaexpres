"use client";

import Link from "next/link";
import { ArrowRight, Play, Newspaper, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/forms/OrderModal";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient text-white">
      {/* Decorative newsprint pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-red/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-gold/10 blur-3xl"
      />

      <div className="container relative grid gap-12 py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-32">
        <div className="flex flex-col justify-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-gold" />
            </span>
            Distribuție în 24h
          </div>

          <h1 className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Articolul tău în{" "}
            <span className="relative whitespace-nowrap text-brand-gold">
              50 de ziare
              <svg
                aria-hidden="true"
                viewBox="0 0 400 20"
                className="absolute left-0 -bottom-3 w-full"
              >
                <path
                  d="M2 14 C80 2 200 2 398 14"
                  fill="none"
                  stroke="#D7263D"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            românești în 24h.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/85">
            Distribuție rapidă de comunicate de presă pe 50 de ziare și 37 pagini Facebook.
            Primești raport PDF complet cu linkuri și screenshot-uri. Publicare permanentă,
            backlinks SEO incluse.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button variant="accent" size="lg" asChild>
              <Link href="/pachete">
                Vezi pachetele <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <OrderModal
              trigger={
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/5 text-white hover:bg-white hover:text-brand-navy"
                >
                  <Play className="h-4 w-4" /> Comandă acum
                </Button>
              }
            />
          </div>

          <ul className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
            {["Livrare 24h", "Raport PDF inclus", "Publicare permanentă", "50 backlinks SEO"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-gold" /> {item}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="relative flex items-center justify-center animate-fade-in-up">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative w-full max-w-lg">
      {/* Back newspaper */}
      <div className="absolute -left-6 top-10 w-4/5 rotate-[-6deg] rounded-lg bg-white/10 p-6 backdrop-blur-sm border border-white/20">
        <div className="h-2 w-20 rounded bg-white/30" />
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full rounded bg-white/20" />
          <div className="h-1.5 w-3/4 rounded bg-white/20" />
          <div className="h-1.5 w-5/6 rounded bg-white/20" />
        </div>
      </div>

      {/* Front newspaper */}
      <div className="relative w-full rounded-xl bg-white p-6 text-brand-navy shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-brand-red" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Ziar Național
            </span>
          </div>
          <span className="text-[10px] text-slate-400">23 APR 2026</span>
        </div>

        <h3 className="mt-4 font-serif text-xl font-bold leading-tight">
          Compania ta, pe prima pagină a celor mai citite ziare din România
        </h3>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.7fr]">
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded bg-slate-200" />
            <div className="h-1.5 w-full rounded bg-slate-200" />
            <div className="h-1.5 w-5/6 rounded bg-slate-200" />
            <div className="h-1.5 w-full rounded bg-slate-200" />
            <div className="h-1.5 w-3/4 rounded bg-slate-200" />
            <div className="h-1.5 w-full rounded bg-slate-200" />
          </div>
          <div className="aspect-[4/3] rounded bg-gradient-to-br from-brand-navy to-brand-red/80" />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500">
          <span>Citește mai mult →</span>
          <span className="font-semibold text-brand-red">Permanent online</span>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-6 -right-4 flex items-center gap-3 rounded-xl border border-brand-gold/20 bg-white p-4 shadow-xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10">
          <CheckCircle2 className="h-5 w-5 text-brand-red" />
        </div>
        <div>
          <div className="text-sm font-bold text-brand-navy">Publicat pe 50 site-uri</div>
          <div className="text-xs text-slate-500">Raport PDF livrat</div>
        </div>
      </div>
    </div>
  );
}
