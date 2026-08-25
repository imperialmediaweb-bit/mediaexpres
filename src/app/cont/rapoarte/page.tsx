import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { publicationReports } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Rapoartele mele",
  robots: { index: false, follow: false },
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { dateStyle: "long" });
}

export default async function RapoartePage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/cont/login");

  // Rapoartele se leaga prin email, nu prin userId: raportul poate fi trimis
  // inainte ca omul sa-si fi activat contul.
  const rows = await db
    .select()
    .from(publicationReports)
    .where(eq(publicationReports.email, email.toLowerCase()))
    .orderBy(desc(publicationReports.createdAt));

  return (
    <section className="container py-12">
      <div className="max-w-4xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Rapoartele mele</h1>
        <p className="lead mt-3 text-slate-600">
          Toate publicările tale, cu linkurile către fiecare articol. Rămân aici
          permanent — nu trebuie să cauți prin emailuri.
        </p>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Încă nu ai niciun raport. Apare aici automat după prima publicare.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {rows.map((r) => {
              // Rapoartele noi contin {url, title}; cele vechi doar sirul URL-ului.
              let links: { url: string; title?: string }[] = [];
              try {
                const raw = JSON.parse(r.links || "[]") as unknown[];
                links = raw
                  .map((x) =>
                    typeof x === "string"
                      ? { url: x }
                      : (x as { url?: string; title?: string })?.url
                        ? { url: (x as { url: string }).url, title: (x as { title?: string }).title }
                        : null,
                  )
                  .filter((x): x is { url: string; title?: string } => x !== null);
              } catch {
                links = [];
              }
              return (
                <article
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-xl font-bold text-brand-navy">
                      {r.articleTitle || "Articol publicat"}
                    </h2>
                    <span className="text-sm text-slate-500">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Publicat în <strong>{links.length}</strong>{" "}
                    {links.length === 1 ? "publicație" : "publicații"}
                  </p>
                  {links.length > 0 && (
                    <ol className="mt-4 space-y-2.5 text-sm">
                      {links.map((l, i) => (
                        <li key={`${l.url}-${i}`} className="flex gap-2">
                          <span className="shrink-0 text-slate-400">{i + 1}.</span>
                          <span className="min-w-0">
                            {l.title && (
                              <span className="block font-medium text-brand-navy">{l.title}</span>
                            )}
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-brand-red hover:underline"
                              title={l.url}
                            >
                              {l.url.replace(/^https?:\/\//, "")}
                            </a>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
