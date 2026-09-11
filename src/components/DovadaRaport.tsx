import Link from "next/link";
import { CheckCircle2, FileText, ArrowRight } from "lucide-react";
import { CAMPANII, EXEMPLU_RAPORT } from "@/data/campanii";

/*
  Dovada, inainte de plata. Textul de pe pagina spune ce primesti; blocul
  asta ARATA: prima pagina a unui raport real (click = PDF-ul intreg) si
  campaniile clientilor de top, cu o propozitie fiecare. Omul care ezita la
  500 de lei nu mai are nevoie de inca un paragraf — are nevoie sa vada.
*/

const TOP = CAMPANII.slice(0, 4);

export function DovadaRaport() {
  return (
    <section className="section bg-brand-navy text-white">
      <div className="container">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Raportul, ca imagine — click pe el deschide PDF-ul */}
          <a
            href={EXEMPLU_RAPORT.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mx-auto block w-full max-w-md"
            aria-label="Deschide raportul exemplu (PDF)"
          >
            <div className="absolute -inset-3 rounded-2xl bg-brand-gold/20 blur-xl transition group-hover:bg-brand-gold/30" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rapoarte/exemplu-raport-pagina-1.jpg"
              alt={`Prima pagină din raportul de publicare pentru ${EXEMPLU_RAPORT.client}`}
              width={640}
              height={905}
              loading="lazy"
              className="relative w-full rounded-xl border border-white/15 shadow-2xl shadow-black/50 transition group-hover:-translate-y-1"
            />
            <span className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-lg">
              <FileText className="h-4 w-4" /> Deschide raportul (PDF)
            </span>
          </a>

          <div>
            <p className="eyebrow text-brand-gold">Vezi înainte să plătești</p>
            <h2 className="h2 mt-2 text-white">Așa arată ce primești la final</h2>
            <p className="mt-4 text-white/80">
              Raport real, dintr-o campanie publicată în septembrie 2026. Îl
              primește fiecare client, pe email, în aceeași zi cu ultimul articol.
            </p>
            <ul className="mt-6 space-y-3 text-white/90">
              {[
                "toate cele 50 de publicații, cu adresa fiecărui articol",
                "postările de pe paginile de Facebook ale ziarelor",
                "captura campaniei plătite pe Facebook, cu publicul ales",
                "confirmarea trimiterii la indexare în Google",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Cine a mai publicat așa
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {TOP.map((c) => (
                <li key={c.client} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="font-serif font-bold">{c.client}</p>
                  <p className="mt-0.5 text-xs text-brand-gold">{c.categorie}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/exemple"
              className="mt-5 inline-flex items-center gap-2 font-semibold text-brand-gold hover:underline"
            >
              Toate campaniile și articolele publicate <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
