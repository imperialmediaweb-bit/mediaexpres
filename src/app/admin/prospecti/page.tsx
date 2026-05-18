import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq, count, sql, and, not, inArray } from "drizzle-orm";
import { Plus, Mail, Sparkles, Zap, Upload, Flame } from "lucide-react";
import { AddProspectForm } from "./AddProspectForm";
import { ImportPRAgenciesButton } from "./ImportPRAgenciesButton";
import { ImportCsvButton } from "./ImportCsvButton";
import { BatchSendButton } from "./BatchSendButton";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "new", label: "Noi" },
  { key: "contacted", label: "Contactați" },
  { key: "opened", label: "Deschis email" },
  { key: "replied", label: "Au răspuns" },
  { key: "interested", label: "Interesați" },
  { key: "converted", label: "Convertiți" },
  { key: "declined", label: "Refuzați" },
  { key: "hot", label: "🔥 Hot leads" },
  { key: "all", label: "Toți" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-800",
  opened: "bg-cyan-100 text-cyan-800",
  replied: "bg-amber-100 text-amber-800",
  interested: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-700",
  bounced: "bg-orange-100 text-orange-800",
};

function calcScore(p: { openCount: number | null; clickCount: number | null; viewCount: number | null; status: string }): number {
  return (
    (p.openCount ?? 0) * 5 +
    (p.clickCount ?? 0) * 10 +
    (p.viewCount ?? 0) * 3 +
    (p.status === "replied" ? 30 : 0) +
    (p.status === "interested" ? 15 : 0)
  );
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO");
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return <span className="text-xs text-slate-300">—</span>;
  const color =
    score >= 30
      ? "bg-red-100 text-red-700 font-bold"
      : score >= 15
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${color}`}>
      {score}
    </span>
  );
}

export default async function ProspectiPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/prospecti");

  const resolvedParams = await searchParams;
  const filter = resolvedParams?.status || "new";

  type ProspectRow = typeof prospects.$inferSelect & { score: number };

  const EXCLUDED_STATUSES = ["declined", "bounced", "converted"];

  let rawRows: (typeof prospects.$inferSelect)[];

  if (filter === "hot") {
    rawRows = await db
      .select()
      .from(prospects)
      .where(not(inArray(prospects.status, EXCLUDED_STATUSES)));
  } else if (filter === "all") {
    rawRows = await db.select().from(prospects);
  } else {
    rawRows = await db.select().from(prospects).where(eq(prospects.status, filter));
  }

  const rows: ProspectRow[] = rawRows
    .map((p) => ({ ...p, score: calcScore(p) }))
    .sort((a, b) => b.score - a.score);

  const [{ value: newCount }] = await db
    .select({ value: count() })
    .from(prospects)
    .where(eq(prospects.status, "new"));

  const [{ value: hotCount }] = await db
    .select({ value: count() })
    .from(prospects)
    .where(
      and(
        not(inArray(prospects.status, EXCLUDED_STATUSES)),
        sql`(COALESCE(open_count, 0) + COALESCE(click_count, 0) + COALESCE(view_count, 0)) > 0`
      )
    );

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-navy">Prospecți B2B</h1>
          <p className="mt-2 text-sm text-slate-600">
            Listă de firme potențial-clienți. Adaugi manual, AI generează email
            personalizat, îl trimiți cu un click prin Resend.
          </p>
        </div>
        <Link
          href="/admin/prospecti/comenzi"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-red hover:text-brand-red"
        >
          Comenzi prospecți →
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = t.key === filter;
              const isHot = t.key === "hot";
              return (
                <Link
                  key={t.key}
                  href={`/admin/prospecti?status=${t.key}`}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                    active
                      ? isHot
                        ? "bg-red-600 text-white"
                        : "bg-brand-navy text-white"
                      : isHot
                      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-brand-red hover:text-brand-red"
                  }`}
                >
                  {t.label}
                  {isHot && hotCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs w-4 h-4">
                      {hotCount}
                    </span>
                  )}
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
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Vizualizări</th>
                  <th className="px-4 py-3">Emailuri</th>
                  <th className="px-4 py-3">Adăugat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      Niciun prospect.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
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
                      <td className="px-4 py-3">
                        <ScoreBadge score={p.score ?? 0} />
                        {(p.openCount ?? 0) > 0 || (p.clickCount ?? 0) > 0 ? (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {(p.openCount ?? 0) > 0 && `${p.openCount} open`}
                            {(p.openCount ?? 0) > 0 && (p.clickCount ?? 0) > 0 && " · "}
                            {(p.clickCount ?? 0) > 0 && `${p.clickCount} click`}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {(p.viewCount ?? 0) > 0 ? (
                          <>
                            <span className="font-medium">{p.viewCount}</span>
                            {p.lastViewedAt && (
                              <p className="text-xs text-slate-400">ultim: {formatDate(p.lastViewedAt)}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
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

            {hotCount > 0 && (
              <Link
                href="/admin/prospecti?status=hot"
                className="block rounded-xl border-2 border-red-300 bg-red-50 p-4 hover:bg-red-100 transition"
              >
                <p className="font-semibold text-red-700 flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  {hotCount} lead{hotCount !== 1 ? "uri" : ""} cald{hotCount !== 1 ? "e" : ""}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Au deschis email sau au vizualizat oferta — acționează acum.
                </p>
              </Link>
            )}

            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
              <h2 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Import rapid
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                38 agenții PR din România (verificate manual mai 2026), gata
                pentru reseller program — un click şi sunt în listă.
              </p>
              <div className="mt-3">
                <ImportPRAgenciesButton />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-600" />
                Import CSV bulk
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Lipeşti 50-500 prospecți dintr-un CSV (Google Maps export,
                Pagini Aurii, LinkedIn etc.). Auto-dedupe + filtru suppression.
              </p>
              <div className="mt-3">
                <ImportCsvButton />
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
                  <strong>Manual:</strong> click pe prospect → revizuieşti
                  textul → trimiți unul-câte-unul
                </li>
              </ol>
              <p className="mt-2 text-blue-700">
                <strong>Score:</strong> opens×5 + clicks×10 + views×3 + replies×30. Leadurile calde apar primele.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
