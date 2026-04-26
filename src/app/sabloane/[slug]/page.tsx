import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEMPLATES, TEMPLATE_CATEGORIES, findTemplateBySlug } from "@/data/templates";
import { CopyButton } from "./CopyButton";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const t = findTemplateBySlug(params.slug);
  if (!t) return { title: "Șablon inexistent" };
  const title = `${t.title} — Șablon comunicat de presă`;
  const description = `${t.description} Șablon gratuit de comunicat de presă pentru ${t.industry}, gata de copy-paste și publicare.`;
  return {
    title,
    description,
    alternates: { canonical: `/sabloane/${t.slug}` },
    openGraph: { title, description, url: `/sabloane/${t.slug}` },
  };
}

export default function TemplatePage({ params }: { params: { slug: string } }) {
  const t = findTemplateBySlug(params.slug);
  if (!t) notFound();

  const related = TEMPLATES.filter(
    (x) => x.category === t.category && x.slug !== t.slug
  ).slice(0, 3);

  return (
    <section className="bg-white">
      <div className="container py-12 max-w-4xl">
        <Link
          href="/sabloane"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red"
        >
          <ArrowLeft className="h-4 w-4" /> Toate șabloanele
        </Link>

        <div className="mt-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-red">
            <FileText className="h-3.5 w-3.5" /> {TEMPLATE_CATEGORIES[t.category]}
          </div>
          <h1 className="h1 mt-3">{t.title}</h1>
          <p className="mt-3 text-sm text-slate-500">Pentru: {t.industry}</p>
          <p className="lead mt-4 text-slate-600">{t.description}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-serif text-lg font-bold text-brand-navy">
              Textul șablonului
            </h2>
            <CopyButton text={t.body} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Înlocuiește textul între paranteze pătrate <code>[...]</code> cu
            datele firmei tale.
          </p>
          <pre className="mt-5 whitespace-pre-wrap text-sm font-sans text-slate-700 leading-relaxed">
            {t.body}
          </pre>
        </div>

        <div className="mt-8 rounded-2xl bg-brand-navy p-6 md:p-8 text-white">
          <div className="flex items-start gap-4">
            <Sparkles className="h-10 w-10 shrink-0 text-brand-gold" />
            <div className="flex-1">
              <h3 className="font-serif text-2xl font-bold">
                Vrei o variantă personalizată cu datele tale?
              </h3>
              <p className="mt-2 text-sm text-white/80">
                AI-ul ți-o scrie în 30 de secunde, plecând de la șablonul ăsta și
                de la informațiile firmei tale. Apoi o publici pe 50 de ziare în
                24h.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="gold" size="lg" asChild>
                  <Link href="/generator-comunicat">
                    <Sparkles className="h-4 w-4" /> Generator AI gratuit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="border-white/40 text-white hover:bg-white hover:text-brand-navy"
                >
                  <Link href="/pachete">Vezi pachetele de publicare</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-xl font-bold text-brand-navy">
              Alte șabloane similare
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/sabloane/${r.slug}`}
                  className="rounded-lg border border-slate-200 p-4 hover:border-brand-red hover:shadow-sm transition"
                >
                  <p className="text-xs text-slate-500">
                    {TEMPLATE_CATEGORIES[r.category]}
                  </p>
                  <p className="mt-1 font-semibold text-brand-navy">{r.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
