import { domainToUnicode } from "node:url";
import { ExternalLink, Facebook } from "lucide-react";
import { NEWSPAPERS } from "@/data/newspapers";
import { stareRetea, acum } from "@/lib/stare-retea";
import type { ScorRetea } from "@/lib/autoritate-retea";

/*
  15.11.2026 — lista ziarelor „cu dovezi": pentru fiecare ziar, captura primei
  pagini (public/retea/<domeniu>-v1.webp, facuta pe telefon), linkul, DA/PA
  (Moz, din baza), articolele din ultimele 24 h si ultimul articol (live, din
  platforma retelei). Cerut de proprietar: clientii intreaba „exista o lista?".
  Cand platforma nu raspunde, cardurile raman, fara cifrele live.
*/

function gazda(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Domeniul cum il citeste omul (fara punycode). */
function domeniuAfisat(url: string): string {
  try {
    return domainToUnicode(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return url;
  }
}

/** Domeniile care au captura in public/retea/<domeniu>-v1.webp (refaceti lista cand adaugati poze). */
const CU_POZA = new Set<string>(["acunews.ro", "albaexpres.ro", "aradexpres.ro", "argesexpress.ro", "bacauexpress.ro", "bihorexpres.ro", "bistrita-nasaudexpres.ro", "botosaniexpres.ro", "brailaexpres.ro", "brasovexpress.ro", "bucurestiexpres.ro", "buzauexpres.ro", "calarasiexpres.ro", "caras-severinexpres.ro", "clujexpres.ro", "covasnaexpres.ro", "dambovitaexpress.ro", "diasporanews.ro", "doljexpres.ro", "epochdaily.ro", "galatiexpres.ro", "giurgiuexpres.ro", "gorjexpres.ro", "harghitaexpres.ro", "hunedoaraexpres.ro", "ialomitaexpres.ro", "iasiexpres.ro", "ilfovexpres.ro", "legionews.ro", "lidernews.ro", "maramuresexpres.ro", "mehedintiexpres.ro", "metronews.ro", "muresexpres.ro", "neamtexpres.ro", "oltexpres.ro", "pointnews.ro", "prahovaexpres.ro", "romaniaexpres.ro", "romanialeak.ro", "salajexpress.ro", "satu-marexpres.ro", "suceavaexpres.ro", "teleormanexpres.ro", "tulceaexpres.ro", "valceaexpres.ro", "vasluiexpres.ro", "vranceaexpres.ro", "xn--constanaexpres-mbf.ro", "xn--timiexpres-xxd.ro"]);

export async function ZiareCuPoze({ autoritate }: { autoritate: ScorRetea }) {
  const s = await stareRetea();
  const live = new Map((s?.ziare ?? []).map((z) => [gazda(z.url), z]));
  const fata = new Date();

  const ziare = NEWSPAPERS.map((n) => ({ n, h: gazda(n.url) }))
    .filter(({ h }) => CU_POZA.has(h))
    .sort((a, b) => (a.n.type === "national" ? 0 : 1) - (b.n.type === "national" ? 0 : 1));

  return (
    <div>
      {s && (
        <p className="mx-auto mb-6 max-w-3xl text-center text-sm text-slate-600">
          Live acum: <strong className="text-brand-navy">{s.articole24h} de articole</strong> publicate în
          ultimele 24 de ore în rețea. Cifrele de pe fiecare card se actualizează la câteva minute.
        </p>
      )}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ziare.map(({ n, h }) => {
          const z = live.get(h);
          const a = autoritate[h];
          return (
            <li key={h} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <a href={n.url} target="_blank" rel="noopener" className="block border-b border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/retea/${h}-v1.webp`}
                  alt={`Prima pagină ${n.name}`}
                  width={360}
                  height={508}
                  loading="lazy"
                  className="aspect-[360/400] w-full object-cover object-top"
                />
              </a>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold leading-tight text-brand-navy">{n.name}</h3>
                    <p className="text-xs text-slate-500">{n.type === "national" ? "Ziar național" : `Județul ${n.county}`}</p>
                  </div>
                  {a && (
                    <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                      DA {a.da}
                      {a.pa != null && <span className="font-normal"> · PA {a.pa}</span>}
                    </span>
                  )}
                </div>
                {z && (
                  <p className="mt-3 text-sm text-slate-700">
                    <strong className="text-brand-navy">{z.articole_24h}</strong> articole în ultimele 24 h
                    <br />
                    <span className="text-xs text-slate-500">Ultimul: {acum(z.ultimul_articol, fata)}</span>
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4 text-sm">
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-navy px-3 py-1.5 font-semibold text-white"
                  >
                    {domeniuAfisat(n.url)} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {z?.facebook && (
                    <a
                      href={z.facebook}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700"
                    >
                      <Facebook className="h-3.5 w-3.5" /> Facebook
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
