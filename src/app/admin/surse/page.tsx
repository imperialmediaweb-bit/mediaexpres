import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sourceLabel } from "@/lib/sursa";
import { ensureSursaSchema } from "@/lib/sursa-db";

export const metadata: Metadata = {
  title: "Admin • De unde vin clienții",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Row {
  source: string | null;
  reached: number;
  started: number;
  orders: number;
  paid: number;
  revenue: number;
}

/**
 * Tot drumul, pe fiecare canal: cine a ajuns la ofertă, cine a început o
 * comandă, cine a dus-o până la capăt și cât s-a încasat.
 *
 * Comenzile singure nu pot deosebi un canal care nu trimite pe nimeni de unul
 * care trimite mulți oameni care apoi pleacă. Amândouă arată zero vânzări, și
 * numai unul merită reparat în loc să fie tăiat.
 */
export default async function SursePage() {
  if (!getSession()) redirect("/admin/login?from=/admin/surse");

  await ensureSursaSchema();

  const result = await db.execute(sql`
    WITH vizite AS (
      SELECT source,
             COUNT(DISTINCT visitor_id) FILTER (WHERE path LIKE '/oferta%' OR path LIKE '/pachete%') AS reached,
             COUNT(DISTINCT visitor_id) FILTER (WHERE path LIKE '/comanda%') AS started
        FROM "visit"
       GROUP BY source
    ),
    vanzari AS (
      SELECT source,
             COUNT(*)::int AS orders,
             COUNT(*) FILTER (WHERE status = 'paid')::int AS paid,
             COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::int AS revenue
        FROM "order"
       GROUP BY source
    )
    SELECT COALESCE(v.source, s.source) AS source,
           COALESCE(v.reached, 0)::int  AS reached,
           COALESCE(v.started, 0)::int  AS started,
           COALESCE(s.orders, 0)::int   AS orders,
           COALESCE(s.paid, 0)::int     AS paid,
           COALESCE(s.revenue, 0)::int  AS revenue
      FROM vizite v
      FULL OUTER JOIN vanzari s ON s.source IS NOT DISTINCT FROM v.source
     ORDER BY 6 DESC, 5 DESC, 2 DESC
  `);

  const rows = (result as unknown as { rows?: Row[] }).rows ?? (result as unknown as Row[]);
  const t = rows.reduce(
    (a, r) => ({
      reached: a.reached + Number(r.reached),
      started: a.started + Number(r.started),
      orders: a.orders + Number(r.orders),
      paid: a.paid + Number(r.paid),
      revenue: a.revenue + Number(r.revenue),
    }),
    { reached: 0, started: 0, orders: 0, paid: 0, revenue: 0 }
  );

  const pct = (part: number, whole: number) =>
    whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
  const lei = (bani: number) => `${(bani / 100).toFixed(2)} lei`;

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-brand-navy">De unde vin clienții</h1>
      <p className="mt-2 text-slate-600">
        Reținut la prima pagină deschisă și păstrat 90 de zile, ca o reclamă care l-a adus pe om
        înapoi peste o săptămână să-și primească totuși meritul.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-xl bg-white p-6 text-slate-600">Încă nu s-a înregistrat nimic.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3 text-right">A văzut oferta</th>
                <th className="px-4 py-3 text-right">A început comanda</th>
                <th className="px-4 py-3 text-right">A comandat</th>
                <th className="px-4 py-3 text-right">A plătit</th>
                <th className="px-4 py-3 text-right">Încasat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.source ?? "none"}-${i}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {r.source ? sourceLabel(r.source) : "Neurmărit"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.reached || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {r.started || "—"}
                    {r.reached > 0 && r.started > 0 && (
                      <span className="ml-1 text-xs text-slate-400">{pct(r.started, r.reached)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.orders || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-brand-navy">{r.paid || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                    {r.revenue ? lei(r.revenue) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-brand-navy">Toate canalele</td>
                <td className="px-4 py-3 text-right text-slate-600">{t.reached}</td>
                <td className="px-4 py-3 text-right text-slate-600">{t.started}</td>
                <td className="px-4 py-3 text-right text-slate-600">{t.orders}</td>
                <td className="px-4 py-3 text-right font-medium text-brand-navy">{t.paid}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-navy">{lei(t.revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-4 space-y-1 text-sm text-slate-500">
        <p>
          <strong>A văzut oferta</strong> și <strong>A început comanda</strong> numără oameni, o
          dată pe zi fiecare — un refresh nu e al doilea vizitator, și nu se păstrează nimic care
          să identifice pe cineva.
        </p>
        <p>
          <strong>Neurmărit</strong> e o comandă dinainte să existe asta, sau un browser care
          blochează cookie-urile. <strong>Direct</strong> înseamnă fără pagină de proveniență:
          scris în bară, salvat la favorite, sau un link dintr-un mesaj sau email.
        </p>
      </div>
    </div>
  );
}
