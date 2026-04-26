import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, orders, subscriptions, articles, publishers } from "@/db/schema";
import { count, eq, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatRON(cents: number) {
  return (cents / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
  });
}

export default async function AdminHome() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin");

  const [[u], [o], [s], [a], [p], paidSum, pendingArticles, pendingPublishers] =
    await Promise.all([
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(orders).where(eq(orders.status, "paid")),
      db
        .select({ n: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active")),
      db.select({ n: count() }).from(articles),
      db
        .select({ n: count() })
        .from(publishers)
        .where(eq(publishers.status, "pending")),
      db
        .select({ total: sql<number>`COALESCE(SUM(${orders.amount}), 0)` })
        .from(orders)
        .where(eq(orders.status, "paid")),
      db
        .select({ n: count() })
        .from(articles)
        .where(eq(articles.status, "submitted")),
      db
        .select({ n: count() })
        .from(publishers)
        .where(eq(publishers.status, "pending")),
    ]);

  const totalCents = Number(paidSum[0]?.total || 0);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Privire generală peste afacere. Click pe un card pentru detalii.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat href="/admin/comenzi" label="Total încasat (plăți)" value={formatRON(totalCents)} tone="gold" />
        <Stat href="/admin/clienti" label="Clienți (users)" value={u.n} />
        <Stat href="/admin/abonamente" label="Abonamente active" value={s.n} />
        <Stat href="/admin/comenzi" label="Comenzi plătite" value={o.n} />
        <Stat href="/admin/articole" label="Articole (total)" value={a.n} />
        <Stat
          href="/admin/articole?status=submitted"
          label="Articole de aprobat"
          value={pendingArticles[0]?.n || 0}
          tone={pendingArticles[0]?.n ? "red" : undefined}
        />
        <Stat
          href="/admin/parteneri"
          label="Aplicații ziare noi"
          value={pendingPublishers[0]?.n || 0}
          tone={pendingPublishers[0]?.n ? "red" : undefined}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <RecentArticles />
        <RecentOrders />
      </div>
    </div>
  );
}

function Stat({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: string | number;
  tone?: "gold" | "red";
}) {
  const toneCls =
    tone === "gold"
      ? "border-brand-gold/40 bg-brand-gold/5"
      : tone === "red"
      ? "border-brand-red/30 bg-brand-red/5"
      : "border-slate-200";
  return (
    <Link
      href={href}
      className={`block rounded-xl border bg-white p-5 transition hover:shadow-md ${toneCls}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">{value}</p>
    </Link>
  );
}

async function RecentArticles() {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      createdAt: articles.createdAt,
      userEmail: users.email,
    })
    .from(articles)
    .leftJoin(users, eq(articles.userId, users.id))
    .orderBy(desc(articles.createdAt))
    .limit(5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Articole recente
        </h2>
        <Link
          href="/admin/articole"
          className="text-xs text-brand-red hover:underline"
        >
          Toate →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Niciun articol înca.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
            >
              <Link
                href={`/admin/articole/${a.id}`}
                className="flex-1 min-w-0 text-sm text-brand-navy hover:text-brand-red"
              >
                <p className="truncate font-medium">{a.title}</p>
                <p className="text-xs text-slate-500">{a.userEmail || "—"}</p>
              </Link>
              <StatusBadge kind="article" status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function RecentOrders() {
  const rows = await db
    .select({
      id: orders.id,
      amount: orders.amount,
      packageId: orders.packageId,
      createdAt: orders.createdAt,
      status: orders.status,
      email: orders.email,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Plăți recente
        </h2>
        <Link
          href="/admin/comenzi"
          className="text-xs text-brand-red hover:underline"
        >
          Toate →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nicio plată înca.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-navy">
                  {o.packageId}
                </p>
                <p className="text-xs text-slate-500">{o.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-navy">
                  {formatRON(o.amount)}
                </p>
                <StatusBadge kind="order" status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({
  kind,
  status,
}: {
  kind: "article" | "order";
  status: string;
}) {
  const articleMap: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
    submitted: { label: "De aprobat", cls: "bg-amber-100 text-amber-800" },
    published: { label: "Publicat", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Respins", cls: "bg-red-100 text-red-700" },
  };
  const orderMap: Record<string, { label: string; cls: string }> = {
    paid: { label: "Platit", cls: "bg-green-100 text-green-800" },
    pending: { label: "În așteptare", cls: "bg-amber-100 text-amber-800" },
    refunded: { label: "Rambursat", cls: "bg-slate-100 text-slate-700" },
    canceled: { label: "Anulat", cls: "bg-red-100 text-red-700" },
  };
  const s = (kind === "article" ? articleMap : orderMap)[status] || {
    label: status,
    cls: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
