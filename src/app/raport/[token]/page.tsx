import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { NEWSPAPERS } from "@/data/newspapers";
import { articleIdFromToken } from "@/lib/raport-link";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Raport de publicare — MediaExpres",
  robots: { index: false, follow: false },
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Numele ziarului vine din rețea, nu din domeniu: domeniile sunt scrise
// diferit, iar clientul trebuie să vadă "Botoșani Expres", nu "botosaniexpres".
const BY_HOST = new Map(NEWSPAPERS.map((n) => [hostOf(n.url), n] as const));

const DATE = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Bucharest",
});

/**
 * Raportul de publicare în timp real — linkul din emailul clientului.
 *
 * Emailul de publicare trimitea în cont, deci clientul avea nevoie de parolă
 * ca să vadă unde i-a apărut articolul. Pagina asta se deschide din link, se
 * reîncarcă singură cât timp publicarea e în curs și arată fiecare ziar pe
 * nume, cu linkul lui.
 */
export default async function RaportPage({ params }: { params: { token: string } }) {
  const id = articleIdFromToken(params.token);
  if (!id) notFound();

  const rows = await db
    .select({
      title: articles.title,
      status: articles.status,
      publishedUrls: articles.publishedUrls,
      createdAt: articles.createdAt,
      submittedAt: articles.submittedAt,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  const a = rows[0];
  if (!a) notFound();

  let urls: string[] = [];
  try {
    urls = a.publishedUrls ? (JSON.parse(a.publishedUrls) as string[]) : [];
  } catch {
    urls = [];
  }
  const live = a.status === "published" && urls.length > 0;

  const steps = [
    { label: "Comandă primită", at: a.createdAt, done: true },
    { label: "La redacție", at: a.submittedAt, done: Boolean(a.submittedAt) || live },
    {
      label: live ? `Publicat în ${urls.length} ziare` : "Publicare în rețea",
      at: a.publishedAt,
      done: live,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {!live && <AutoRefresh seconds={60} />}
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-red">
        Raport de publicare {live ? "" : "· se actualizează în timp real"}
      </p>
      <h1 className="mt-2 font-serif text-2xl font-bold text-brand-navy sm:text-3xl">{a.title}</h1>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.label}
            className={`rounded-xl border p-4 ${
              s.done ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-slate-400" />
              )}
              {s.label}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {s.done && s.at ? DATE.format(s.at) : s.done ? "Gata" : "În 24 de ore"}
            </p>
          </li>
        ))}
      </ol>

      {live ? (
        <>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-brand-navy">
              Cele {urls.length} link-uri ale tale
            </h2>
            <p className="text-xs text-slate-500">Permanente · dofollow · indexate în Google</p>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Ziar</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Județ</th>
                  <th className="px-4 py-3">Articol</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((u, i) => {
                  const paper = BY_HOST.get(hostOf(u));
                  return (
                    <tr key={u} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-brand-navy">
                        {paper?.name || hostOf(u)}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                        {paper?.county || (paper?.type === "national" ? "Național" : "—")}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-brand-red hover:underline"
                        >
                          Deschide <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mt-10 rounded-xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
          Articolul tău se publică în rețeaua MediaExpres. Pagina asta se reîncarcă singură —
          fiecare link apare aici în momentul în care e live, iar pe email îți scriem când e gata.
          Păstrează linkul: rămâne valabil permanent.
        </p>
      )}
    </div>
  );
}
