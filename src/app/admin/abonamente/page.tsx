import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO");
}

export default async function AdminAbonamentePage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/abonamente");

  const rows = await db
    .select({
      id: subscriptions.id,
      planId: subscriptions.planId,
      category: subscriptions.category,
      status: subscriptions.status,
      articlesIncludedPerMonth: subscriptions.articlesIncludedPerMonth,
      articlesRemaining: subscriptions.articlesRemaining,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      createdAt: subscriptions.createdAt,
      userId: subscriptions.userId,
      userEmail: users.email,
      userName: users.name,
    })
    .from(subscriptions)
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Abonamente</h1>
      <p className="mt-2 text-sm text-slate-600">
        Toate abonamentele — active, în întârziere și anulate.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ramase</th>
              <th className="px-4 py-3">Urmat. fact.</th>
              <th className="px-4 py-3">Anulat?</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Niciun abonament.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    {s.userId ? (
                      <Link href={`/admin/clienti/${s.userId}`} className="text-brand-red hover:underline">
                        {s.userName || s.userEmail}
                      </Link>
                    ) : (
                      s.userEmail || "—"
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">{s.planId}</td>
                  <td className="px-4 py-3 capitalize">{s.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.status === "active"
                        ? "bg-green-100 text-green-800"
                        : s.status === "past_due"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {s.articlesRemaining}/{s.articlesIncludedPerMonth}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(s.currentPeriodEnd)}</td>
                  <td className="px-4 py-3 text-xs">{s.cancelAtPeriodEnd ? "Da" : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
