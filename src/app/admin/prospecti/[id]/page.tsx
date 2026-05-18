import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects, prospectOrders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Mail, ShoppingBag } from "lucide-react";
import { ProspectActions } from "./ProspectActions";
import { CopySmartBillButton } from "./CopySmartBillButton";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO");
}

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) redirect(`/admin/login?from=/admin/prospecti/${params.id}`);

  const [p] = await db.select().from(prospects).where(eq(prospects.id, params.id)).limit(1);
  if (!p) notFound();

  const orders = await db
    .select()
    .from(prospectOrders)
    .where(eq(prospectOrders.prospectId, p.id))
    .orderBy(desc(prospectOrders.createdAt));

  return (
    <div>
      <Link href="/admin/prospecti" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red">
        <ArrowLeft className="h-4 w-4" /> Inapoi la prospecti
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-bold text-brand-navy">{p.companyName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {p.contactName ? `${p.contactName} • ` : ""}{p.email}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="font-serif text-lg font-bold text-brand-navy mb-3">Detalii firmă</h2>
            <dl className="space-y-2">
              <Row label="Industrie" value={p.industry} />
              <Row label="Oraş" value={p.city} />
              <Row label="Site" value={p.website} link />
              <Row label="Telefon" value={p.phone} />
              <Row label="Status" value={p.status} mono />
              <Row label="Adăugat" value={formatDate(p.createdAt)} />
              <Row label="Emailuri trimise" value={String(p.emailsSent || 0)} />
              <Row label="Ultim email" value={formatDate(p.lastEmailAt)} />
            </dl>
          </div>

          {p.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-brand-navy">Note</h3>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}

          {p.lastEmailSubject && p.lastEmailBody && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-brand-navy flex items-center gap-2">
                <Mail className="h-4 w-4" /> Ultimul email trimis
              </h3>
              <p className="mt-2 text-sm font-semibold text-brand-navy">{p.lastEmailSubject}</p>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-600 font-sans">{p.lastEmailBody}</pre>
            </div>
          )}

          {orders.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50/40 p-5">
              <h3 className="font-semibold text-brand-navy flex items-center gap-2 mb-4">
                <ShoppingBag className="h-4 w-4 text-green-700" />
                Comenzi ({orders.length})
              </h3>
              <div className="space-y-4">
                {orders.map((o) => {
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
                    <div key={o.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="font-semibold text-brand-navy">{o.buyerCompanyName}</span>
                          <span className="ml-2 text-xs text-slate-500">#{o.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <OrderStatusBadge status={o.status} />
                          <span className="text-xs text-slate-400">{formatDate(o.createdAt)}</span>
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <dt className="text-slate-500">Pachet</dt><dd className="font-medium">{o.packageId}</dd>
                        <dt className="text-slate-500">CUI</dt><dd>{o.buyerCui}</dd>
                        <dt className="text-slate-500">Adresă</dt><dd>{o.buyerAddress}</dd>
                        <dt className="text-slate-500">Email factură</dt><dd>{o.buyerEmail}</dd>
                        {o.buyerPhone && (<><dt className="text-slate-500">Telefon</dt><dd>{o.buyerPhone}</dd></>)}
                        {o.buyerRegCom && (<><dt className="text-slate-500">Reg. Com.</dt><dd>{o.buyerRegCom}</dd></>)}
                      </dl>
                      {o.articleTopic && (
                        <div className="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-500">Tematică: </span>{o.articleTopic}
                        </div>
                      )}
                      {o.photoLinks && (
                        <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-500">Poze: </span>
                          <span className="whitespace-pre-wrap break-all">{o.photoLinks}</span>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-50 p-2 rounded">
                        <span className="truncate">{smartbill}</span>
                        <CopySmartBillButton text={smartbill} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside>
          <ProspectActions prospectId={p.id} currentStatus={p.status} email={p.email} />
        </aside>
      </div>
    </div>
  );
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  articles_published: "bg-blue-100 text-blue-800",
  invoiced: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function Row({ label, value, mono, link }: { label: string; value: string | null | undefined; mono?: boolean; link?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>
        {value ? (
          link ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-brand-red hover:underline break-all">{value}</a>
          ) : (
            value
          )
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </dd>
    </div>
  );
}
