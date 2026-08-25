import { Quote, Star } from "lucide-react";
import { CLIENT_TESTIMONIALS } from "@/data/client-testimonials";

/**
 * Recomandari de la clienti reali, cu numele firmei si link catre site-ul lor.
 * Pe landingul platit lipsea orice dovada ca exista clienti multumiti — omul
 * venea din reclama si vedea doar promisiuni.
 */
export function ClientTestimonials({ dark = false }: { dark?: boolean }) {
  if (CLIENT_TESTIMONIALS.length === 0) return null;

  return (
    <div
      className={`mx-auto grid max-w-5xl gap-5 ${
        CLIENT_TESTIMONIALS.length > 1 ? "md:grid-cols-2" : "max-w-2xl"
      }`}
    >
      {CLIENT_TESTIMONIALS.map((t) => (
        <figure
          key={t.company}
          className={`relative rounded-2xl border p-6 ${
            dark
              ? "border-white/15 bg-white/5"
              : "border-slate-200 bg-white shadow-sm"
          }`}
        >
          <Quote
            className={`absolute right-5 top-5 h-8 w-8 ${
              dark ? "text-white/10" : "text-slate-100"
            }`}
            aria-hidden
          />
          <div className="flex gap-0.5" aria-label="5 din 5 stele">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-4 w-4 fill-brand-gold text-brand-gold" />
            ))}
          </div>
          <blockquote
            className={`mt-3 text-[15px] leading-relaxed ${
              dark ? "text-white/90" : "text-slate-700"
            }`}
          >
            &bdquo;{t.quote}&rdquo;
          </blockquote>
          <figcaption
            className={`mt-4 border-t pt-3 text-sm ${
              dark ? "border-white/10" : "border-slate-100"
            }`}
          >
            {t.url ? (
              <a
                href={t.url}
                target="_blank"
                rel="noopener"
                className={`font-bold ${
                  dark ? "text-brand-gold hover:underline" : "text-brand-navy hover:text-brand-red"
                }`}
              >
                {t.company}
              </a>
            ) : (
              <span className={`font-bold ${dark ? "text-brand-gold" : "text-brand-navy"}`}>
                {t.company}
              </span>
            )}
            {t.context && (
              <span className={dark ? "text-white/50" : "text-slate-500"}> · {t.context}</span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
