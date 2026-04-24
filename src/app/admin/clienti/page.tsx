import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, orders, subscriptions } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO");
}

export default async function AdminClientiPage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/clienti");

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      companyName: users.companyName,
      companyCui: users.companyCui,
      createdAt: users.createdAt,
      paidCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'paid' THEN 1 ELSE 0 END), 0)`.as(
        "paid_count"
      ),
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'paid' THEN ${orders.amount} ELSE 0 END), 0)`.as(
        "total_spent"
      ),
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  const activeSubs = await db
    .select({
      userId: subscriptions.userId,
      planId: subscriptions.planId,
      category: subscriptions.category,
      articlesRemaining: subscriptions.articlesRemaining,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  const subByUser = new Map(activeSubs.map((s) => [s.userId, s]));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Clienti</h1>
      <p className="mt-2 text-sm text-slate-600">
        Toți utilizatorii care au un cont sau au făcut o plată.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Firma</th>
              <th className="px-4 py-3">Plăți</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Abonament</th>
              <th className="px-4 py-3">Intrat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Niciun client.
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const sub = subByUser.get(u.id);
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-navy">
                        {u.name || "—"}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.companyName || <span className="text-slate-400">—</span>}
                      {u.companyCui && (
                        <p className="text-xs text-slate-400">{u.companyCui}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.paidCount}</td>
                    <td className="px-4 py-3 font-semibold">
                      {((Number(u.totalSpent) || 0) / 100).toLocaleString("ro-RO", {
                        style: "currency",
                        currency: "RON",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          {sub.planId} • {sub.articlesRemaining} rest
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clienti/${u.id}`}
                        className="text-xs font-medium text-brand-red hover:underline"
                      >
                        Deschide →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
