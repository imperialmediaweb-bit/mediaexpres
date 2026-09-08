import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminRecenziiPage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/recenzii");

  // Tabelul poate lipsi pana la primul /api/admin/fix-db — pagina nu are voie
  // sa cada din cauza asta, ca ar parea ca s-a stricat adminul.
  let rows: {
    id: string;
    email: string;
    displayName: string;
    rating: number;
    quote: string;
    siteUrl: string | null;
    consentPublic: boolean;
    source: string;
    createdAt: Date;
  }[] = [];
  let eroare = "";
  try {
    rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  } catch (e) {
    eroare = e instanceof Error ? e.message : String(e);
  }

  const cuAcord = rows.filter((r) => r.consentPublic).length;
  const media = rows.length
    ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
    : "—";

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Recenzii</h1>
      <p className="mt-2 text-sm text-slate-600">
        Părerile lăsate de clienți din emailul cu raportul. Nu apar nicăieri pe
        site — le pui tu, manual, și numai pe cele care au acordul de publicare.
      </p>

      {eroare ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Tabelul de recenzii nu există încă. Rulează o dată{" "}
          <code className="rounded bg-white px-1.5 py-0.5">POST /api/admin/fix-db</code> cu antetul{" "}
          <code className="rounded bg-white px-1.5 py-0.5">x-api-key</code>.
          <span className="mt-1 block text-xs text-amber-700">{eroare}</span>
        </div>
      ) : (
        <div className="mt-6 rounded-md bg-brand-ivory p-4 text-sm">
          <strong>{rows.length}</strong> recenzii · media <strong>{media}</strong> · cu acord de
          publicare: <strong>{cuAcord}</strong>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {rows.length === 0 && !eroare ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
            Nicio recenzie încă. Prima vine după primul raport trimis.
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${n <= r.rating ? "text-brand-gold" : "text-slate-200"}`}
                        fill={n <= r.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-brand-navy">{r.displayName}</span>
                  {r.consentPublic ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      POATE FI PUBLICATĂ
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                      FĂRĂ ACORD
                    </span>
                  )}
                  {r.source === "email" && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      DE PE EMAIL
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {r.quote}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                {r.email}
                {r.siteUrl ? ` · ${r.siteUrl}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
