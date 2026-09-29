import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions, placements, publishers } from "@/db/schema";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { etichetaStare } from "@/lib/plasari";
import { ChatPlasare } from "@/components/ChatPlasare";
import { SITE } from "@/data/site";
import { eBlocant, ETICHETE_LINK, type StareLink } from "@/lib/paza-linkuri";
import { VerificaLink } from "./VerificaLink";
import { RezolvaPlasare } from "./RezolvaPlasare";
import { NEWSPAPERS } from "@/data/newspapers";

export const dynamic = "force-dynamic";

/**
 * O plasare, cu discutia client–partener. Adminul vede TOT, inclusiv
 * mesajele oprite de filtrul de contact (cu rosu), si poate scrie in fir.
 */
export default async function AdminPlasare({ params }: { params: { id: string } }) {
  if (!getSession()) redirect(`/admin/login?from=/admin/plasari/${params.id}`);
  await ensurePlacementTables();

  const [pl] = await db.select().from(placements).where(eq(placements.id, params.id)).limit(1);
  if (!pl) notFound();
  const [[pub], [cmd]] = await Promise.all([
    db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1),
    pl.orderSubmissionId
      ? db.select().from(orderSubmissions).where(eq(orderSubmissions.id, pl.orderSubmissionId)).limit(1)
      : Promise.resolve([] as (typeof orderSubmissions.$inferSelect)[]),
  ]);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/plasari" className="text-sm text-slate-500 hover:underline">
        ← Plasări
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-bold text-brand-navy">{pl.articleTitle}</h1>

      <dl className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2">
        <Camp e="Publicație">
          {pub ? (
            <Link href={`/admin/parteneri/${pub.id}`} className="text-brand-red underline">
              {pub.siteName}
            </Link>
          ) : (
            "—"
          )}
        </Camp>
        <Camp e="Client">{cmd?.email || pl.clientLabel || "—"}</Camp>
        <Camp e="Stare">{etichetaStare(pl.status)}</Camp>
        <Camp e="Plătim / încasăm">
          {pl.pricePartner} / {pl.priceClient} lei
        </Camp>
        <Camp e="Publicat">
          {pl.publishedUrl ? (
            <a href={pl.publishedUrl} target="_blank" rel="noreferrer" className="break-all text-brand-red underline">
              {pl.publishedUrl}
            </a>
          ) : (
            "—"
          )}
        </Camp>
        <Camp e="Paza linkului">
          {pl.linkCheckedAt ? (
            <span className={eBlocant(pl.linkStatus) ? "text-red-700" : ""}>
              {ETICHETE_LINK[pl.linkStatus as StareLink] || pl.linkStatus} · {new Date(pl.linkCheckedAt).toLocaleDateString("ro-RO")}
              {pl.linkDetail && !pl.linkDetail.startsWith("respins:") && (
                <span className="block text-xs font-normal text-slate-500">{pl.linkDetail}</span>
              )}
            </span>
          ) : (
            "neverificat încă"
          )}
          {pl.publishedUrl && (
            <span className="block">
              <VerificaLink id={pl.id} />
            </span>
          )}
        </Camp>
      </dl>

      {["expirat", "refuzat", "anulat"].includes(pl.status) && !pl.replacedById && (
        <RezolvaPlasare
          id={pl.id}
          suma={pl.priceClient}
          parteneri={(
            await db.select().from(publishers).where(and(eq(publishers.status, "approved"), ne(publishers.id, pl.publisherId)))
          )
            .filter((x) => x.pricePerArticle && (x.kind || "presa") === (pub?.kind || "presa"))
            .map((x) => ({ id: x.id, nume: x.siteName, tarif: x.pricePerArticle as number }))}
          ziare={NEWSPAPERS.map((n) => n.name)}
        />
      )}
      {pl.replacedById && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {pl.replacedById === "ramburs" ? (
            <>Rezolvat: banii înapoi ({pl.priceClient} lei).</>
          ) : pl.replacedById.startsWith("retea|") ? (
            <>
              Rezolvat în rețeaua noastră: {pl.replacedById.split("|")[1]} —{" "}
              <a href={pl.replacedById.split("|").slice(2).join("|")} className="text-brand-red underline" target="_blank" rel="noreferrer">
                articolul
              </a>
            </>
          ) : (
            <>
              Mutat pe altă publicație:{" "}
              <Link href={`/admin/plasari/${pl.replacedById}`} className="text-brand-red underline">
                vezi plasarea nouă
              </Link>
            </>
          )}
        </p>
      )}
      {pl.replacesId && (
        <p className="mt-3 text-xs text-slate-500">
          Înlocuiește{" "}
          <Link href={`/admin/plasari/${pl.replacesId}`} className="underline">
            plasarea căzută
          </Link>
          .{pl.refundRequestedAt && " Clientul a cerut banii înapoi — fă returnarea din Stripe."}
        </p>
      )}

      <h2 className="mb-2 mt-8 font-serif text-lg font-bold text-brand-navy">Discuția client–publicație</h2>
      <p className="mb-3 text-xs text-slate-500">
        Mesajele cu roșu au fost oprite de filtru (telefon, email, site, WhatsApp) și NU au ajuns la
        celălalt. Ce scrii tu aici văd amândoi, ca „{SITE.name}”.
      </p>
      <ChatPlasare p={pl.id} eu="admin" nume={{ client: "Clientul", partener: pub?.siteName || "Publicația", admin: "Tu" }} />
    </div>
  );
}

function Camp({ e, children }: { e: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500">{e}</dt>
      <dd className="mt-0.5 font-medium text-brand-navy">{children}</dd>
    </div>
  );
}
