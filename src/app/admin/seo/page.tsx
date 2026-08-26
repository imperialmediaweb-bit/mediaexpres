import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getSession } from "@/lib/auth";
import { SITE } from "@/data/site";
import { INDEXNOW_KEY } from "@/lib/indexnow";
import sitemap from "@/app/sitemap";
import { IndexButton } from "./IndexButton";

export const dynamic = "force-dynamic";

export default function AdminSeoPage() {
  if (!getSession()) redirect("/admin/login?from=/admin/seo");

  const urls = sitemap().map((e) => (typeof e.url === "string" ? e.url : String(e.url)));
  const grupuri = [
    { nume: "Pagini de județ", filtru: "/publicare-comunicat-" },
    { nume: "Pagini de industrie", filtru: "/comunicate-presa-" },
    { nume: "Șabloane", filtru: "/sabloane/" },
    { nume: "Articole de blog", filtru: "/blog/" },
  ].map((g) => ({ ...g, count: urls.filter((u) => u.includes(g.filtru)).length }));
  const restul = urls.length - grupuri.reduce((s, g) => s + g.count, 0);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">SEO și indexare</h1>
      <p className="mt-2 text-sm text-slate-600">
        Anunță toate motoarele de căutare că paginile tale există sau s-au schimbat.
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <IndexButton />
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          Ce se trimite ({urls.length} adrese)
        </h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          {grupuri.map((g) => (
            <li key={g.nume}>
              <strong>{g.count}</strong> — {g.nume}
            </li>
          ))}
          <li>
            <strong>{restul}</strong> — pagini principale (acasă, pachete, ofertă, rețea, legal)
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          Ce trebuie făcut o singură dată
        </h2>
        <ol className="mt-3 space-y-4 text-sm text-slate-700">
          <li>
            <strong>1. Google Search Console</strong> — adaugă proprietatea{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">{SITE.domain}</code>, apoi
            trimite sitemap-ul la Sitemaps:{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">sitemap.xml</code>
            <br />
            <span className="text-slate-500">
              Rămâne calea principală pentru Google. Butonul de sus o accelerează, nu o
              înlocuiește.
            </span>
            <br />
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-brand-red hover:underline"
            >
              Deschide Search Console <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            <strong>2. Bing Webmaster Tools</strong> — se poate importa direct din Search
            Console, în doi pași.
            <br />
            <a
              href="https://www.bing.com/webmasters"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-brand-red hover:underline"
            >
              Deschide Bing Webmaster <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            <strong>3. Google Indexing API</strong> (opțional, accelerează mult) — creează un
            cont de serviciu în Google Cloud, activează &bdquo;Indexing API&rdquo;, adaugă emailul
            contului ca <strong>Owner</strong> în Search Console, apoi pune JSON-ul în
            variabila{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON
            </code>{" "}
            din Railway.
          </li>
        </ol>
      </section>

      <p className="mt-6 text-xs text-slate-400">
        Cheia IndexNow e publică prin natura protocolului:{" "}
        <a
          href={`https://${SITE.domain}/${INDEXNOW_KEY}.txt`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {SITE.domain}/{INDEXNOW_KEY}.txt
        </a>
      </p>
    </div>
  );
}
