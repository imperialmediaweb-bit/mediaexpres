import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospectOrders, prospects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { CopySmartBillButton } from "../[id]/CopySmartBillButton";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  articles_published: "bg-blue-100 text-blue-800",
  invoiced: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO");
}

export default async function ProspectComenziPage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/prospecti/comenzi");

  const rows = await db
    .select({
      id: prospectOrders.id,
      prospectId: prospectOrders.prospectId,
      packageId: prospectOrders.packageId,
      buyerCompanyName: prospectOrders.buyerCompanyName,
      buyerCui: prospectOrders.buyerCui,
      buyerRegCom: prospectOrders.buyerRegCom,
      buyerAddress: prospectOrders.buyerAddress,
      buyerEmail: prospectOrders.buyerEmail,
      buyerPhone: prospectOrders.buyerPhone,
      articleTopic: prospectOrders.articleTopic,
      articleNotes: prospectOrders.articleNotes,
      photoLinks: prospectOrders.photoLinks,
      status: prospectOrders.status,
      createdAt: prospectOrders.createdAt,
      publishedAt: prospectOrders.publishedAt,
      invoicedAt: prospectOrders.invoicedAt,
      paidAt: prospectOrders.paidAt,
      prospectCompany: prospects.companyName,
    })
    .from(prospectOrders)
    .leftJoin(prospects, eq(prospectOrders.prospectId, prospects.id))
    .orderBy(desc(prospectOrders.createdAt));

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    published: rows.filter((r) => r.status === "articles_published").length,
    invoiced: rows.filter((r) => r.status === "invoiced").length,
    paid: rows.filter((r) => r.status === "paid").length,
  };

  return (
    <div>
      <Link href="/admin/prospecti" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red">
        <ArrowLeft className="h-4 w-4" /> Înapoila prospecți
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-bold text-brand-navy">Comenzi prospecți</h1>
      <p className="mt-1 text-sm text-slate-500">
        Comenzile primite prin pagina de ofertă personalizată. Factureziîn SmartBill, publică pe rețea.
      </p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {[
          { label: "De publicat", count: counts.pending, color: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "Publicate", count: counts.published, color: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "Facturate", count: counts.invoiced, color: "bg-purple-50 border-purple-200 text-purple-800" },
          { label: "Plătite", count: counts.paid, color: "bg-green-50 border-green-200 text-green-800" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Nicio comandă deocamdată.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((o) => {
            const smartbill = [
              o.buyerCompanyName,
              o.buyerCui,
              o.buyerRegCom || "—",
              o.buyerAddress,
              o.buyerEmail,
              o.buyerPhone || "—",
              o.packageId,
            ].join(" | ");

            return (
              <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-navy">{o.buyerCompanyName}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {o.status}
                      </span>
                    </div>
                    {o.prospectId && (
                      <Link href={`/admin/prospecti/${o.prospectId}`} className="mt-0.5 text-xs text-brand-red hover:underline">
                        Prospect: {o.prospectCompany || o.prospectId}
                      </Link>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-700">{o.packageId}</p>
                    <p className="text-xs text-slate-400">{formatDate(o.createdAt)}</p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm md:grid-cols-3">
                  <div><dt className="text-xs text-slate-500">CUI</dt><dd className="font-mono text-xs">{o.buyerCui}</dd></div>
                  <div><dt className="text-xs text-slate-500">Adresă</dt><dd className="text-xs">{o.buyerAddress}</dd></div>
                  <div><dt className="text-xs text-slate-500">Email factură</dt><dd className="text-xs">{o.buyerEmail}</dd></div>
                  {o.buyerPhone && (
                    <div><dt className="text-xs text-slate-500">Telefon</dt><dd className="text-xs">{o.buyerPhone}</dd></div>
                  )}
                  {o.buyerRegCom && (
                    <div><dt className="text-xs text-slate-500">Reg. Com.</dt><dd className="text-xs">{o.buyerRegCom}</dd></div>
                  )}
                </dl>

                {o.articleTopic && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Tematică articol:</p>
                    <p className="text-slate-700">{o.articleTopic}</p>
                  </div>
                )}

                {o.photoLinks && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs">
                    <p className="font-semibold text-slate-500 mb-1">Link-uri poze:</p>
                    <p className="whitespace-pre-wrap break-all text-slate-700">{o.photoLinks}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 rounded bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500 truncate">
                    {smartbill}
                  </div>
                  <CopySmartBillButton text={smartbill} />
                </div>

                <div className="mt-2 flex gap-2 text-xs text-slate-400">
                  {o.publishedAt && <span>Publicat: {formatDate(o.publishedAt)}</span>}
                  {o.invoicedAt && <span>· Facturat: {formatDate(o.invoicedAt)}</span>}
                  {o.paidAt && <span>· Plătit: {formatDate(o.paidAt)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
