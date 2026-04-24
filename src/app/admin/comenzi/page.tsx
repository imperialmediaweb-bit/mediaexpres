import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}
function formatRON(cents: number) {
  return (cents / 100).toLocaleString("ro-RO", { style: "currency", currency: "RON" });
}

export default async function AdminComenziPage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/comenzi");

  const rows = await db
    .select({
      id: orders.id,
      amount: orders.amount,
      packageId: orders.packageId,
      status: orders.status,
      email: orders.email,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      stripeSessionId: orders.stripeSessionId,
      userId: orders.userId,
      userName: users.name,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

  const totalCents = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Comenzi</h1>
      <p className="mt-2 text-sm text-slate-600">
        Toate plățile efectuate cu cardul prin Stripe. Folosește pentru
        reconciliere cu StartCo (e-Factura).
      </p>
      <div className="mt-4 rounded-md bg-brand-ivory p-4 text-sm">
        <strong>Total încasat (plăți reușite):</strong> {formatRON(totalCents)} din{" "}
        {rows.filter((r) => r.status === "paid").length} plăți.
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Pachet</th>
              <th className="px-4 py-3">Sumă</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stripe</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Nicio comandă.
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {formatDate(o.paidAt || o.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {o.userId ? (
                      <Link href={`/admin/clienti/${o.userId}`} className="text-brand-red hover:underline">
                        {o.userName || o.email}
                      </Link>
                    ) : (
                      o.email
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{o.packageId}</td>
                  <td className="px-4 py-3 font-semibold">{formatRON(o.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      o.status === "paid" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"
                    }`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[180px]">
                    {o.stripeSessionId || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
