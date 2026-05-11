import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { Plus, Mail, Sparkles, Zap } from "lucide-react";
import { AddProspectForm } from "./AddProspectForm";
import { ImportPRAgenciesButton } from "./ImportPRAgenciesButton";
import { BatchSendButton } from "./BatchSendButton";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "new", label: "Noi" },
  { key: "contacted", label: "Contactați" },
  { key: "replied", label: "Au răspuns" },
  { key: "interested", label: "Interesați" },
  { key: "converted", label: "Convertiți" },
  { key: "declined", label: "Refuzați" },
  { key: "all", label: "Toți" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-800",
  replied: "bg-amber-100 text-amber-800",
  interested: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-700",
  bounced: "bg-orange-100 text-orange-800",
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO");
}

export default async function ProspectiPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/prospecti");

  const filter = searchParams?.status || "new";

  const baseQuery = db.select().from(prospects);
  const rows = await (filter === "all"
    ? baseQuery.orderBy(desc(prospects.createdAt))
    : baseQuery.where(eq(prospects.status, filter)).orderBy(desc(prospects.createdAt)));

  const [{ value: newCount }] = await db
    .select({ value: count() })
    .from(prospects)
    .where(eq(prospects.status, "new"));

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-navy">Prospecți B2B</h1>
        <p className="mt-2 text-sm text-slate-600">
          Listă de firme potențial-clienți. Adaugi manual, AI generează email
          personalizat, îl trimiți cu un click prin Resend.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = t.key === filter;
              return (
                <Link
                  key={t.key}
                  href={`/admin/prospecti?status=${t.key}`}
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

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Firmă</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Emailuri</th>
                  <th className="px-4 py-3">Adăugat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Niciun prospect.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-navy">{p.companyName}</p>
                        <p className="text-xs text-slate-500">
                          {p.industry || "—"} {p.city ? `• ${p.city}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{p.contactName || "—"}</p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.new}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.emailsSent}
                        {p.lastEmailAt && (
                          <p className="text-xs text-slate-400">ultim: {formatDate(p.lastEmailAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/prospecti/${p.id}`} className="text-xs font-medium text-brand-red hover:underline">
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

        <aside>
          <div className="sticky top-4 space-y-4">
            <div className="rounded-xl border-2 border-brand-red bg-gradient-to-br from-brand-red/5 to-brand-gold/5 p-5">
              <h2 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-red" />
                Auto-pilot
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                AI generează + Resend trimite + follow-up automat la 5 zile.
                Un singur click.
              </p>
              <div className="mt-3">
                <BatchSendButton availableForBatch={newCount} />
              </div>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
              <h2 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Import rapid
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                39 agenții PR din România (verificate manual mai 2026), gata
                pentru reseller program — un click și sunt în listă.
              </p>
              <div className="mt-3">
                <ImportPRAgenciesButton />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <Plus className="h-4 w-4 text-brand-red" />
                Adaugă prospect manual
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Companie + email = minim. Restul ajută AI-ul să personalizeze.
              </p>
              <div className="mt-4">
                <AddProspectForm />
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900">
              <p className="font-semibold flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Fluxuri disponibile
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>
                  <strong>Auto-pilot:</strong> AI scrie + trimite + follow-up
                  pentru N prospecți, fără click manual
                </li>
                <li>
                  <strong>Manual:</strong> click pe prospect → revizuiești
                  textul → trimiți unul-câte-unul
                </li>
              </ol>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
