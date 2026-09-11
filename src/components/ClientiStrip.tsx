import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { CLIENTI } from "@/data/clienti";
import { EXEMPLU_RAPORT } from "@/data/campanii";

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
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {CLIENTI.map((c) => {
            const areLogo = logoExista(c.logo);
            const continut = areLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={eLink(c.logo) ? c.logo : `/clienti/${c.logo}`}
                alt={c.nume}
                title={c.ce ? `${c.nume} — ${c.ce}` : c.nume}
                loading="lazy"
                className="h-9 w-auto max-w-[150px] object-contain md:h-10"
              />
            ) : (
              <span
                title={c.ce}
                className="font-serif text-base font-bold text-brand-navy md:text-lg"
              >
                {c.nume}
              </span>
            );
            return (
              // Toate in cartonase egale: logo-urile vin ca screenshoturi cu
              // fundaluri diferite, iar numele fara logo trebuie sa stea la fel.
              <li
                key={c.nume}
                className={`flex h-16 items-center justify-center rounded-xl border px-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  c.fundalInchis ? "border-brand-navy bg-brand-navy" : "border-slate-200 bg-white"
                }`}
              >
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
        {/*
          Inainte sa comande, omul vrea sa vada doua lucruri: cum arata un
          articol publicat si ce primeste la final. Amandoua, la un click.
        */}
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm font-semibold">
          <Link href="/exemple" className="text-brand-red hover:underline">
            Vezi campaniile și articolele publicate →
          </Link>
          <a
            href={EXEMPLU_RAPORT.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-navy hover:underline"
          >
            Așa arată raportul cu cele 50 de linkuri (PDF) →
          </a>
        </p>
      </div>
    </section>
  );
}
