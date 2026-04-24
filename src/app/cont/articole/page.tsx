import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntitlements, getUserArticles } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { FileText, Lock, Plus } from "lucide-react";

export const metadata = {
  title: "Articolele mele",
  robots: { index: false, follow: false },
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ArticolePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const [ent, rows] = await Promise.all([
    getEntitlements(session.user.id),
    getUserArticles(session.user.id),
  ]);

  return (
    <section className="container py-12">
      <div className="max-w-5xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow">Cont</p>
            <h1 className="h1 mt-2">Articolele mele</h1>
            <p className="lead mt-3 text-slate-600">
              Draft-uri, articole trimise si cele publicate.{" "}
              {ent.hasActiveSubscription ? (
                <>
                  Ai <strong>{ent.articlesRemaining}</strong> articol
                  {ent.articlesRemaining === 1 ? "" : "e"} ramase in luna curenta.
                </>
              ) : ent.hasPaid ? (
                <>Poti urca detaliile pentru comanda facuta.</>
              ) : (
                <>Dupa prima plata, poti trimite articolele de aici.</>
              )}
            </p>
          </div>
          {ent.hasPaid && (
            <Button variant="accent" asChild>
              <Link href="/cont/articole/nou">
                <Plus className="h-4 w-4" /> Trimite articol nou
              </Link>
            </Button>
          )}
        </div>

        {!ent.hasPaid && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-slate-600">
              Ai nevoie de o plata activa ca sa trimiti articole. Alege un pachet
              sau un abonament.
            </p>
            <div className="mt-6">
              <Button variant="accent" asChild>
                <Link href="/pachete">Vezi pachetele</Link>
              </Button>
            </div>
          </div>
        )}

        {ent.hasPaid && rows.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-slate-600">Nu ai niciun articol inca. Incepe acum.</p>
            <div className="mt-6">
              <Button variant="accent" asChild>
                <Link href="/cont/articole/nou">
                  <Plus className="h-4 w-4" /> Trimite primul articol
                </Link>
              </Button>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Titlu</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-brand-navy">
                      {a.title}
                      {a.aiGenerated && (
                        <span className="ml-2 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                          AI
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/cont/articole/${a.id}`}
                        className="text-sm font-medium text-brand-red hover:underline"
                      >
                        Deschide
                      </Link>
                    </td>
                  </tr>
                ))}
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
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
    submitted: { label: "Trimis", cls: "bg-blue-100 text-blue-800" },
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
