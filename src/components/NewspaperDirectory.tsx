import { Newspaper } from "lucide-react";
import { NEWSPAPERS } from "@/data/newspapers";

// Lista publica a retelei, cu link spre fiecare ziar — aceeasi componenta pe
// /oferta-500 si /reteaua-noastra, generata din data/newspapers.ts. Acordeonul
// e <details> nativ, deci ramane server component (zero JS trimis).
/** Domeniul din adresa ziarului — cheia sub care e salvat scorul Moz. */
function domeniu(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
}

/**
 * `autoritate`: domeniu → Domain Authority (Moz), citit de noi (lib/autoritate-retea).
 * Optional: fara el, lista arata ca pana acum.
 */
/** Culoarea etichetei dupa DA: verde ≥ 35, galben 20–34, gri sub 20. */
function clasaScor(da: number): string {
  if (da >= 35) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (da >= 20) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-500 ring-slate-200";
}

export function NewspaperDirectory({ autoritate }: { autoritate?: Record<string, { da: number; pa: number | null }> } = {}) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {(["Național", "Moldova", "Transilvania", "Muntenia", "Banat"] as const).map(
        (region) => {
          const papers = NEWSPAPERS.filter((n) => n.region === region)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "ro"));
          if (papers.length === 0) return null;
          return (
            <details
              key={region}
              className="group rounded-xl border border-slate-200 bg-white"
              open={region === "Național"}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-semibold text-brand-navy marker:hidden">
                <span>
                  {region === "Național" ? "Ziare naționale" : `Regiunea ${region}`}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({papers.length} publicații)
                  </span>
                </span>
                <span className="text-xl text-brand-red transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <ul className="grid gap-2 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {papers.map((p) => (
                  <li key={p.url}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-slate-700 transition hover:bg-red-50 hover:text-brand-red"
                    >
                      <Newspaper className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        {p.name}
                        {p.county ? (
                          <span className="text-slate-400"> — {p.county}</span>
                        ) : null}
                      </span>
                      {autoritate?.[domeniu(p.url)] && (
                        <span
                          title="Domain Authority · Page Authority (Moz), măsurate de noi"
                          className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${clasaScor(autoritate[domeniu(p.url)].da)}`}
                        >
                          DA {autoritate[domeniu(p.url)].da}
                          {autoritate[domeniu(p.url)].pa != null && <span className="font-normal opacity-80"> · PA {autoritate[domeniu(p.url)].pa}</span>}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          );
        },
      )}
    </div>
  );
}
