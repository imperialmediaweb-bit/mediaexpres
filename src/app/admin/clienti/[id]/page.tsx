import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, orders, subscriptions, articles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRON(cents: number) {
  return (cents / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
  });
}

export default async function AdminClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = getSession();
  if (!session) redirect(`/admin/login?from=/admin/clienti/${params.id}`);

  const [u] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
  if (!u) notFound();

  const [userOrders, userSubs, userArticles] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, params.id)).orderBy(desc(orders.createdAt)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, params.id)).orderBy(desc(subscriptions.createdAt)),
    db.select().from(articles).where(eq(articles.userId, params.id)).orderBy(desc(articles.createdAt)),
  ]);

  return (
    <div>
      <Link
        href="/admin/clienti"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red"
      >
        <ArrowLeft className="h-4 w-4" /> Inapoi la clienti
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-bold text-brand-navy">
        {u.name || u.email}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{u.email}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Contact">
          <Row label="Nume" value={u.name} />
          <Row label="Email" value={u.email} mono />
          <Row label="Telefon" value={u.phone} />
          <Row label="Cont creat" value={formatDate(u.createdAt)} />
        </Card>
        <Card title="Firmă (factură)">
          <Row label="Companie" value={u.companyName} />
          <Row label="CUI" value={u.companyCui} mono />
          <Row label="Reg. com." value={u.companyRegNo} mono />
          <Row label="Adresă" value={u.companyAddress} />
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-brand-navy">
          Abonamente ({userSubs.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Categorie</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Ramase</th>
                <th className="px-4 py-2">Urmatoarea fact.</th>
              </tr>
            </thead>
            <tbody>
              {userSubs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">Niciun abonament.</td></tr>
              ) : (
                userSubs.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium capitalize">{s.planId}</td>
                    <td className="px-4 py-2 capitalize">{s.category}</td>
                    <td className="px-4 py-2">{s.status}</td>
                    <td className="px-4 py-2 font-semibold">{s.articlesRemaining}/{s.articlesIncludedPerMonth}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(s.currentPeriodEnd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-brand-navy">
          Comenzi ({userOrders.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Pachet</th>
                <th className="px-4 py-2">Sumă</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {userOrders.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500">Nicio comandă.</td></tr>
              ) : (
                userOrders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-600">{formatDate(o.paidAt || o.createdAt)}</td>
                    <td className="px-4 py-2 font-medium">{o.packageId}</td>
                    <td className="px-4 py-2 font-bold">{formatRON(o.amount)}</td>
                    <td className="px-4 py-2">{o.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-brand-navy">
          Articole ({userArticles.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Titlu</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {userArticles.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500">Niciun articol.</td></tr>
              ) : (
                userArticles.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{a.title}</td>
                    <td className="px-4 py-2">{a.status}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/admin/articole/${a.id}`} className="text-xs text-brand-red hover:underline">
                        Deschide →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
