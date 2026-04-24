import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { PartnerActions } from "./PartnerActions";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO");
}

export default async function AdminPartnerDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = getSession();
  if (!session) redirect(`/admin/login?from=/admin/parteneri/${params.id}`);

  const [p] = await db
    .select()
    .from(publishers)
    .where(eq(publishers.id, params.id))
    .limit(1);
  if (!p) notFound();

  return (
    <div>
      <Link
        href="/admin/parteneri"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red"
      >
        <ArrowLeft className="h-4 w-4" /> Inapoi la parteneri
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-bold text-brand-navy">
        {p.siteName}
      </h1>
      <p className="mt-1 text-sm">
        <a href={p.siteUrl} target="_blank" rel="noreferrer" className="text-brand-red hover:underline">
          {p.siteUrl}
        </a>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Detalii site">
            <Row label="Judet" value={p.county} />
            <Row label="Regiune" value={p.region} />
            <Row label="Facebook" value={p.facebookUrl} link />
            <Row label="Trafic lunar" value={p.monthlyTraffic ? `${p.monthlyTraffic.toLocaleString("ro-RO")} vizite/lună` : null} />
            <Row label="Articole / lună acceptă" value={p.articlesPerMonth ? String(p.articlesPerMonth) : null} />
          </Card>
          <Card title="Contact">
            <Row label="Nume" value={p.contactName} />
            <Row label="Email" value={p.contactEmail} mono />
            <Row label="Telefon" value={p.contactPhone} />
          </Card>
          <Card title="Plată (pentru decontare articole)">
            <Row label="IBAN" value={p.payoutIban} mono />
            <Row label="Companie" value={p.payoutCompany} />
          </Card>
          {p.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-brand-navy">Observații</h3>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}
          <div className="rounded-md bg-slate-50 p-4 text-xs text-slate-500">
            Aplicat: {formatDate(p.createdAt)} •{" "}
            {p.decidedAt ? `Decis: ${formatDate(p.decidedAt)}` : "Nedecis"}
            {p.rejectionReason && <p className="mt-2">Motiv respingere: {p.rejectionReason}</p>}
          </div>
        </div>

        <aside>
          <PartnerActions publisherId={p.id} currentStatus={p.status} />
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-navy">{title}</h2>
      <dl className="mt-4 space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>
        {value ? (
          link ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-brand-red hover:underline break-all">
              {value}
            </a>
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
