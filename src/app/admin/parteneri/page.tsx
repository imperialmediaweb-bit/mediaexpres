import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "pending", label: "In asteptare" },
  { key: "approved", label: "Aprobati" },
  { key: "rejected", label: "Respinsi" },
  { key: "all", label: "Toate" },
];

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium" });
}

export default async function AdminPartneriPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/parteneri");

  const filter = searchParams?.status || "pending";

  const baseQuery = db.select().from(publishers);
  const rows = await (filter === "all"
    ? baseQuery.orderBy(desc(publishers.createdAt))
    : baseQuery.where(eq(publishers.status, filter)).orderBy(desc(publishers.createdAt)));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">
        Aplicații ziare (parteneri)
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Ziarele care vor să intre în rețeaua MediaExpres. Aprobarea/respingerea
        trimite email automat candidatului.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === filter;
          return (
            <Link
              key={t.key}
              href={`/admin/parteneri?status=${t.key}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                active
                  ? "bg-brand-navy text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-brand-red hover:text-brand-red"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Judet</th>
              <th className="px-4 py-3">Trafic</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aplicat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nicio aplicație.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{p.siteName}</p>
                    <a href={p.siteUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-red hover:underline break-all">
                      {p.siteUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <p>{p.contactName}</p>
                    <p className="text-xs text-slate-500">{p.contactEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.county || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.monthlyTraffic ? `${p.monthlyTraffic.toLocaleString("ro-RO")}/lună` : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/parteneri/${p.id}`} className="text-xs font-medium text-brand-red hover:underline">
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
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "In asteptare", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Aprobat", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Respins", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
