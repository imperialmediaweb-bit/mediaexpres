import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { articles, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TABS: Array<{ key: string; label: string }> = [
  { key: "submitted", label: "De aprobat" },
  { key: "published", label: "Publicate" },
  { key: "draft", label: "Draft" },
  { key: "rejected", label: "Respinse" },
  { key: "all", label: "Toate" },
];

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminArticolePage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/articole");

  const filter = searchParams?.status || "submitted";

  const baseQuery = db
    .select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      aiGenerated: articles.aiGenerated,
      createdAt: articles.createdAt,
      submittedAt: articles.submittedAt,
      existingUrl: articles.existingUrl,
      userEmail: users.email,
      userName: users.name,
    })
    .from(articles)
    .leftJoin(users, eq(articles.userId, users.id));

  const rows = await (filter === "all"
    ? baseQuery.orderBy(desc(articles.createdAt))
    : baseQuery.where(eq(articles.status, filter)).orderBy(desc(articles.createdAt)));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Articole</h1>
      <p className="mt-2 text-sm text-slate-600">
        Inbox articole trimise de clienți. Click pe Deschide ca să aprobi,
        respingi și să pui URL-urile publicate.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === filter;
          return (
            <Link
              key={t.key}
              href={`/admin/articole?status=${t.key}`}
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
              <th className="px-4 py-3">Titlu</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trimis</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Niciun articol.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/articole/${a.id}`}
                      className="font-medium text-brand-navy hover:text-brand-red"
                    >
                      {a.title}
                    </Link>
                    {a.aiGenerated && (
                      <span className="ml-2 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        AI
                      </span>
                    )}
                    {a.existingUrl && (
                      <p className="text-xs text-slate-400 truncate max-w-md">
                        URL existent: {a.existingUrl}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{a.userName || "—"}</p>
                    <p className="text-xs text-slate-400">{a.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDate(a.submittedAt || a.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/articole/${a.id}`}
                      className="text-xs font-medium text-brand-red hover:underline"
                    >
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
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
    submitted: { label: "De aprobat", cls: "bg-amber-100 text-amber-800" },
    published: { label: "Publicat", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Respins", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
