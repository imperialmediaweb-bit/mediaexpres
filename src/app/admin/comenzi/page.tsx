import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orders, users, orderSubmissions } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { etichetaSursa } from "@/lib/sursa";
import { findPackageById } from "@/data/packages";
import { ensureOrderColumns } from "@/lib/ensure-columns";

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
      source: orders.source,
      userId: orders.userId,
      userName: users.name,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

  const totalCents = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);

  // Cati bani a adus fiecare canal — raspunsul scurt la „merita reclama?".
  //
  // 13.09.2026 — pana azi socoteala era doar pe platile cu cardul si doar in
  // numar de comenzi. Comenzile luate pe WhatsApp sau prin transfer nu trec
  // prin `orders`, deci canalul care le-a adus lipsea cu totul; iar „2
  // comenzi" nu spune daca au fost de 500 sau de 2.500 de lei. Acum intra si
  // ele, cu suma din pachet (`order_submission` n-are coloana de suma), si
  // doar cele prin OP, ca sa nu se numere de doua ori cu Stripe.
  await ensureOrderColumns();
  const opRows = await db
    .select({ packageId: orderSubmissions.packageId, source: orderSubmissions.source })
    .from(orderSubmissions)
    .where(
      and(
        eq(orderSubmissions.paymentMethod, "op"),
        or(eq(orderSubmissions.status, "paid"), eq(orderSubmissions.status, "published")),
      ),
    );

  const peSursa = new Map<string, { n: number; cents: number }>();
  const adauga = (sursa: string | null, cents: number) => {
    const k = etichetaSursa(sursa);
    const cur = peSursa.get(k) || { n: 0, cents: 0 };
    peSursa.set(k, { n: cur.n + 1, cents: cur.cents + cents });
  };
  for (const r of rows) if (r.status === "paid") adauga(r.source, r.amount);
  for (const r of opRows) adauga(r.source, (findPackageById(r.packageId)?.price ?? 0) * 100);
  const sumarSurse = [...peSursa.entries()].sort((a, b) => b[1].cents - a[1].cents);
  const opCents = opRows.reduce((s, r) => s + (findPackageById(r.packageId)?.price ?? 0) * 100, 0);

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
        {opRows.length > 0 && (
          <p className="mt-1 text-slate-600">
            Plus <strong>{formatRON(opCents)}</strong> din {opRows.length}{" "}
            {opRows.length === 1 ? "comandă" : "comenzi"} prin transfer bancar sau luate pe
            WhatsApp (nu trec prin Stripe). Total:{" "}
            <strong>{formatRON(totalCents + opCents)}</strong>.
          </p>
        )}
        {sumarSurse.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <strong>De unde au venit banii:</strong>
            <ul className="mt-1 space-y-0.5 text-slate-600">
              {sumarSurse.map(([k, v]) => (
                <li key={k}>
                  {k}: <strong>{formatRON(v.cents)}</strong> din {v.n}{" "}
                  {v.n === 1 ? "comandă" : "comenzi"}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              &bdquo;Direct&rdquo; sau &bdquo;necunoscută&rdquo; înseamnă că nu am putut
              urmări canalul: link tastat, alt telefon, sau comandă adăugată fără canal
              ales. Nu înseamnă că nu a venit din reclamă.
            </p>
          </div>
        )}
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
              <th className="px-4 py-3">Sursă</th>
              <th className="px-4 py-3">Stripe</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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
                  <td className="px-4 py-3 text-xs text-slate-600">{etichetaSursa(o.source)}</td>
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
