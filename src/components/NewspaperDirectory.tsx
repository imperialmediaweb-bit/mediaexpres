import { Newspaper } from "lucide-react";
import { NEWSPAPERS } from "@/data/newspapers";

// Lista publica a retelei, cu link spre fiecare ziar — aceeasi componenta pe
// /oferta-500 si /reteaua-noastra, generata din data/newspapers.ts. Acordeonul
// e <details> nativ, deci ramane server component (zero JS trimis).
export function NewspaperDirectory() {
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
                      <span>
                        {p.name}
                        {p.county ? (
                          <span className="text-slate-400"> — {p.county}</span>
                        ) : null}
                      </span>
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
