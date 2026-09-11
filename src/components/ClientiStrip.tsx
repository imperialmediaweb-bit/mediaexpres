import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { CLIENTI } from "@/data/clienti";

/*
  Banda „Au publicat prin MediaExpres". Componenta de server: verifica pe
  disc daca logo-ul exista si, daca nu, arata numele ca text. Nimic nu se
  rupe cand lipseste un fisier — proprietarul le adauga cand le are.
*/

function eLink(v?: string): boolean {
  return !!v && /^https?:\/\//.test(v);
}

function logoExista(fisier?: string): boolean {
  if (!fisier) return false;
  if (eLink(fisier)) return true;
  try {
    return fs.existsSync(path.join(process.cwd(), "public", "clienti", fisier));
  } catch {
    return false;
  }
}

export function ClientiStrip({ className = "" }: { className?: string }) {
  if (CLIENTI.length === 0) return null;

  return (
    <section className={`border-b border-slate-200 bg-white ${className}`} aria-label="Clienți">
      <div className="container py-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Au publicat prin MediaExpres
        </p>
        <p className="mt-2 text-center font-serif text-lg font-bold text-brand-navy md:text-xl">
          Agenții de comunicare, organizatori de turnee și firme din toată țara
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {CLIENTI.map((c) => {
            const areLogo = logoExista(c.logo);
            const continut = areLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={eLink(c.logo) ? c.logo : `/clienti/${c.logo}`}
                alt={c.nume}
                title={c.ce ? `${c.nume} — ${c.ce}` : c.nume}
                loading="lazy"
                className="h-8 w-auto max-w-[140px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0 md:h-9"
              />
            ) : (
              <span
                title={c.ce}
                className="font-serif text-base font-bold text-slate-500 transition hover:text-brand-navy md:text-lg"
              >
                {c.nume}
              </span>
            );
            return (
              <li key={c.nume} className="flex items-center">
                {c.site ? (
                  <a href={c.site} target="_blank" rel="noopener noreferrer nofollow">
                    {continut}
                  </a>
                ) : (
                  continut
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/exemple" className="font-semibold text-brand-red hover:underline">
            Vezi articolele publicate →
          </Link>
        </p>
      </div>
    </section>
  );
}
