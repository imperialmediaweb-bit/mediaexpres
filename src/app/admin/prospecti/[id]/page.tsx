import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Mail } from "lucide-react";
import { ProspectActions } from "./ProspectActions";

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
              <Row label="Oraș" value={p.city} />
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
        </div>

        <aside>
          <ProspectActions prospectId={p.id} currentStatus={p.status} email={p.email} />
        </aside>
      </div>
    </div>
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
