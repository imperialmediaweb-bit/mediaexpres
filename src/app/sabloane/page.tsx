import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/data/templates";

const TITLE = "Șabloane comunicate de presă — MediaExpres";
const DESCRIPTION =
  "12 șabloane gratuite de comunicate de presă pentru orice industrie. Lansare produs, eveniment, parteneriat, rezultate, premii — copy-paste, ajustezi și publici.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/sabloane" },
  keywords: [
    "șabloane comunicat presă",
    "model comunicat presă",
    "exemplu comunicat presă",
    "press release template Romania",
  ],
};

export default function SabloaneIndexPage() {
  const byCategory = (Object.keys(TEMPLATE_CATEGORIES) as Array<keyof typeof TEMPLATE_CATEGORIES>)
    .map((cat) => ({
      category: cat,
      label: TEMPLATE_CATEGORIES[cat],
      items: TEMPLATES.filter((t) => t.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <section className="bg-gradient-to-b from-brand-ivory to-white">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-red">
              <FileText className="h-3.5 w-3.5" /> Gratuit • 12 șabloane
            </div>
            <h1 className="h1 mt-4">
              Șabloane comunicate de presă pentru orice ocazie
            </h1>
            <p className="lead mt-4 text-slate-600">
              Lansare produs, eveniment, parteneriat, rezultate, premii — am
              pregătit 12 șabloane standard pe care le poți folosi gratuit.
              Copy-paste, înlocuiești detaliile între paranteze pătrate, gata.
            </p>
            <div className="mt-6">
              <Button variant="accent" size="lg" asChild>
                <Link href="/generator-comunicat">
                  <Sparkles className="h-4 w-4" /> Sau lasă AI să-l scrie pentru tine
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 space-y-12">
        {byCategory.map((group) => (
          <div key={group.category}>
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              {group.label}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.items.map((t) => (
                <Link
                  key={t.slug}
                  href={`/sabloane/${t.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-red hover:shadow-md"
                >
                  <FileText className="h-6 w-6 text-brand-red" />
                  <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy group-hover:text-brand-red">
                    {t.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{t.industry}</p>
                  <p className="mt-2 text-sm text-slate-600">{t.description}</p>
                  <p className="mt-3 text-xs font-semibold text-brand-red">
                    Vezi șablonul →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="bg-brand-navy text-white py-16">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold">
            Ai șablonul. Ce mai urmează?
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-white/80">
            Completezi datele firmei, apoi îl publici pe rețeaua noastră de
            ziare. Sau dacă ai nevoie de variantă personalizată, AI-ul îl
            generează în 30 de secunde.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" asChild>
              <Link href="/pachete">Vezi pachetele</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="border-white/40 text-white hover:bg-white hover:text-brand-navy"
            >
              <Link href="/generator-comunicat">Generator AI gratuit</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
