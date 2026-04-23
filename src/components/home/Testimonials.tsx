import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/data/testimonials";

export function Testimonials() {
  return (
    <section className="section bg-brand-ivory">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Ce spun clienții noștri</p>
          <h2 className="h2 mt-2">Rezultate reale, oameni reali</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="relative flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-slate-200"
            >
              <Quote className="h-8 w-8 text-brand-red/30" />
              <blockquote className="mt-4 flex-1 text-slate-700 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                  {t.initials}
                </div>
                <div>
                  <div className="font-semibold text-brand-navy">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    {t.role}, {t.company}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
