import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserOrders } from "@/lib/entitlements";
import { findPackageById } from "@/data/packages";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Comenzile mele",
  robots: { index: false, follow: false },
};

function formatRON(cents: number) {
  return (cents / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
  });
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ComenziPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const orders = await getUserOrders(session.user.id);

  return (
    <section className="container py-12">
      <div className="max-w-5xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Comenzile mele</h1>
        <p className="lead mt-3 text-slate-600">
          Istoricul platilor efectuate cu cardul pe MediaExpres. Factura este trimisa
          separat pe email in maximum 24 ore dupa plata.
        </p>

        {orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-600">Nu ai inca nicio comanda.</p>
            <div className="mt-6">
              <Button variant="accent" asChild>
                <Link href="/pachete">Vezi pachetele</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Pachet</th>
                  <th className="px-4 py-3 font-semibold">Suma</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const pkg = findPackageById(o.packageId);
                  return (
                    <tr key={o.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(o.paidAt || o.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-brand-navy">
                        {pkg?.name || o.packageId}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatRON(o.amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Platit", cls: "bg-green-100 text-green-800" },
    pending: { label: "In asteptare", cls: "bg-amber-100 text-amber-800" },
    refunded: { label: "Rambursat", cls: "bg-slate-100 text-slate-700" },
    canceled: { label: "Anulat", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
