import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { verificaToken } from "@/lib/plasare-token";
import { plasarileComenzii } from "@/lib/mesaje-plasare";
import { ChatPlasare } from "@/components/ChatPlasare";
import { SITE } from "@/data/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comanda ta", robots: { index: false, follow: false } };

/** Ce vede clientul: refuzul sau intarzierea partenerului sunt treaba noastra. */
function stareClient(s: string): string {
  switch (s) {
    case "trimis":
      return "În lucru la publicație";
    case "acceptat":
      return "Acceptat — se publică";
    case "publicat":
    case "finalizat":
      return "Publicat";
    default:
      return "Ne ocupăm noi — te anunțăm";
  }
}

const INCHISE = ["refuzat", "expirat", "anulat"];

/**
 * Pagina clientului pentru publicatiile partenere comandate (29.09.2026):
 * unde a ajuns fiecare articol si chatul cu fiecare publicatie. Link semnat,
 * trimis pe email — fara cont, ca la /articol/[token].
 */
export default async function ComandaMea({ params }: { params: { token: string } }) {
  const t = verificaToken(params.token, "client");
  if (!t) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-brand-navy">Link expirat</h1>
        <p className="mt-3 text-slate-600">
          Scrie-ne la{" "}
          <a href={`mailto:${SITE.email}`} className="text-brand-red underline">
            {SITE.email}
          </a>{" "}
          și îți trimitem unul nou.
        </p>
      </div>
    );
  }

  const [[cmd], plasari] = await Promise.all([
    db
      .select({ title: orderSubmissions.title })
      .from(orderSubmissions)
      .where(eq(orderSubmissions.id, t.id))
      .limit(1),
    plasarileComenzii(t.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Publicații partenere</p>
      <h1 className="mt-1 font-serif text-2xl font-bold text-brand-navy sm:text-3xl">{cmd?.title || "Comanda ta"}</h1>
      <p className="mt-2 text-sm text-slate-600">
        Aici vezi unde a ajuns articolul pe fiecare publicație și poți scrie fiecăreia, dacă ai o întrebare
        sau o modificare. Primești email la fiecare răspuns.
      </p>

      {plasari.length === 0 && (
        <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Articolul e la noi, în verificare. Îl trimitem publicațiilor în cel mai scurt timp.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {plasari.map((pl) => (
          <section key={pl.id} id={pl.id} className="scroll-mt-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-lg font-bold text-brand-navy">{pl.nume}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {stareClient(pl.status)}
              </span>
            </div>
            {pl.publishedUrl ? (
              <p className="mb-3 text-sm">
                Publicat:{" "}
                <a href={pl.publishedUrl} target="_blank" rel="noreferrer" className="break-all text-brand-red underline">
                  {pl.publishedUrl}
                </a>
              </p>
            ) : (
              !INCHISE.includes(pl.status) && (
                <p className="mb-3 text-xs text-slate-500">
                  Termen de publicare:{" "}
                  {new Date(pl.deadlinePublicare).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" })}
                </p>
              )
            )}
            {INCHISE.includes(pl.status) ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Publicația nu a putut prelua articolul. Îl mutăm pe altă publicație sau îți returnăm banii
                pentru ea — îți scriem pe email. Întrebări:{" "}
                <a href={`mailto:${SITE.email}`} className="text-brand-red underline">
                  {SITE.email}
                </a>
                .
              </p>
            ) : (
              <ChatPlasare
                t={params.token}
                p={pl.id}
                eu="client"
                nume={{ client: "Tu", partener: pl.nume, admin: SITE.name }}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
