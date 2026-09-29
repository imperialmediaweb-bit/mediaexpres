import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partnerPayouts, placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { semneazaToken, verificaToken } from "@/lib/plasare-token";
import { etichetaStare } from "@/lib/plasari";
import { eBlocant, ETICHETE_LINK, type StareLink } from "@/lib/paza-linkuri";
import {
  PRAG_RETRAGERE,
  ZILE_PLATA,
  calculeazaSold,
  catMaiAi,
  etichetaCerere,
  poateCerePlata,
} from "@/lib/decont";
import { SITE } from "@/data/site";
import { CererePlata } from "./CererePlata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contul de partener", robots: { index: false, follow: false } };

function data(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Portofelul publicatiei partenere.
 *
 * 29.09.2026 — dupa modelul RokaSEO: partenerul vede singur ce are de incasat
 * si cere plata cand ajunge la prag, fara sa ne scrie. Totul se citeste din
 * baza la fiecare deschidere; linkul poarta doar id-ul si versiunea.
 */
export default async function PanouPartener({ params }: { params: { token: string } }) {
  const t = verificaToken(params.token, "panou");
  if (!t) return <Mesaj titlu="Link expirat" />;

  await ensureOrderColumns();
  await ensurePlacementTables();
  const [pub] = await db.select().from(publishers).where(eq(publishers.id, t.id)).limit(1);
  if (!pub || (pub.tokenVersion ?? 0) !== t.v || pub.status !== "approved") {
    return <Mesaj titlu="Link invalid" />;
  }

  const plasari = await db
    .select()
    .from(placements)
    .where(eq(placements.publisherId, pub.id))
    .orderBy(desc(placements.sentAt));
  const cereri = await db
    .select()
    .from(partnerPayouts)
    .where(eq(partnerPayouts.publisherId, pub.id))
    .orderBy(desc(partnerPayouts.requestedAt));

  const platite = new Set(cereri.filter((c) => c.status === "platit").map((c) => c.id));
  const sold = calculeazaSold(plasari, platite);
  const deschisa = cereri.find((c) => c.status === "cerut");
  const incasatTotal = cereri.filter((c) => c.status === "platit").reduce((s, c) => s + c.amount, 0);
  const poate = poateCerePlata(sold, !!deschisa);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Cont de partener</p>
      <h1 className="mt-1 font-serif text-3xl font-bold text-brand-navy">{pub.siteName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Tariful tău: <strong className="text-brand-navy">{pub.pricePerArticle ?? "—"} lei</strong> pe articol publicat
      </p>

      {/* Portofelul */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Cifra eticheta="De încasat" valoare={sold.deIncasat} accent />
        <Cifra eticheta="În plată" valoare={sold.inPlata} />
        <Cifra eticheta="Încasat până acum" valoare={incasatTotal} />
      </section>
      {sold.blocat > 0 && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {sold.blocat} lei sunt opriți: la verificarea automată, un articol publicat nu mai are pagina, linkul
          către client sau e marcat nofollow/noindex. Deschide articolul din lista de mai jos, repară-l, iar
          suma revine singură în sold la următoarea verificare.
        </p>
      )}
      {sold.inLucru > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Încă {sold.inLucru} lei din articole acceptate, care intră în sold după ce le publici.
        </p>
      )}

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        {deschisa ? (
          <p className="text-sm text-slate-700">
            ⏳ Ai o cerere de plată de <strong>{deschisa.amount} lei</strong>, trimisă pe {data(deschisa.requestedAt)}.
            Plătim în {ZILE_PLATA} zile lucrătoare de la primirea facturii.
          </p>
        ) : poate ? (
          <CererePlata
            token={params.token}
            suma={sold.deIncasat}
            ibanSalvat={pub.payoutIban || ""}
            firmaSalvata={pub.payoutCompany || ""}
          />
        ) : (
          <p className="text-sm text-slate-700">
            Poți cere plata de la <strong>{PRAG_RETRAGERE} de lei</strong>. Mai ai{" "}
            <strong>{catMaiAi(sold.deIncasat)} lei</strong> până acolo. Nu-ți cerem contul bancar până atunci.
          </p>
        )}
      </section>

      {/* Articolele */}
      <section className="mt-8">
        <h2 className="font-serif text-xl font-bold text-brand-navy">Articolele tale</h2>
        {plasari.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Încă nu ai primit niciun articol. Când îți trimitem unul, apare aici și pe email.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {plasari.map((pl) => (
              <li key={pl.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/plasare/${semneazaToken({ scope: "plasare", id: pl.id, v: pl.tokenVersion ?? 0 })}`}
                    className="font-medium text-brand-navy hover:text-brand-red"
                  >
                    {pl.articleTitle}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Trimis {data(pl.sentAt)} · {etichetaStare(pl.status)}
                    {pl.publishedUrl && (
                      <>
                        {" · "}
                        <a href={pl.publishedUrl} target="_blank" rel="noreferrer" className="underline">
                          vezi articolul
                        </a>
                      </>
                    )}
                  </p>
                  {eBlocant(pl.linkStatus) && (
                    <p className="mt-0.5 text-xs font-semibold text-red-700">
                      ⚠ {ETICHETE_LINK[pl.linkStatus as StareLink]} — plata e oprită până la reparare
                    </p>
                  )}
                </div>
                {/* Refuzate, expirate, anulate: nu se platesc, deci nu arata suma. */}
                <span className={`font-semibold ${["refuzat", "expirat", "anulat"].includes(pl.status) ? "text-slate-400" : "text-brand-navy"}`}>
                  {["refuzat", "expirat", "anulat"].includes(pl.status) ? "—" : `${pl.pricePartner} lei`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Istoricul platilor */}
      {cereri.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-xl font-bold text-brand-navy">Cereri de plată</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {cereri.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 p-4 text-sm">
                <span>
                  {data(c.requestedAt)} · {c.placementsCount} {c.placementsCount === 1 ? "articol" : "articole"}
                  <span className="block text-xs text-slate-500">
                    {etichetaCerere(c.status)}
                    {c.paidAt ? ` pe ${data(c.paidAt)}` : ""}
                  </span>
                </span>
                <span className="font-semibold text-brand-navy">{c.amount} lei</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        Banii intră în sold când articolul e publicat și ai lipit adresa lui în pagina articolului. Ceri
        plata de la {PRAG_RETRAGERE} de lei, emiți factura pe {SITE.legal.companyName} (CUI {SITE.legal.cui})
        și plătim în {ZILE_PLATA} zile lucrătoare. Întrebări: <a href={`mailto:${SITE.email}`} className="underline">{SITE.email}</a>.
      </p>
    </main>
  );
}

function Cifra({ eticheta, valoare, accent }: { eticheta: string; valoare: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-brand-red/30 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{eticheta}</p>
      <p className={`mt-1 font-serif text-2xl font-bold ${accent ? "text-brand-red" : "text-brand-navy"}`}>{valoare} lei</p>
    </div>
  );
}

function Mesaj({ titlu }: { titlu: string }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-14">
      <h1 className="font-serif text-2xl font-bold text-brand-navy">{titlu}</h1>
      <p className="mt-3 text-slate-600">
        Cere un link nou de pe{" "}
        <Link href="/cont-partener" className="text-brand-red underline">pagina de intrare</Link>.
      </p>
    </main>
  );
}
