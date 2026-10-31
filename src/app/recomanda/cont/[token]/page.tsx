import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { afiliatDupaToken, comenziAfiliat, COMISION_LEI } from "@/lib/afiliati";
import { SITE } from "@/data/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contul de partener — MediaExpres", robots: { index: false } };

/** Contul partenerului: linkul, clickurile, comenzile aduse si comisionul. */
export default async function ContPartener({ params }: { params: { token: string } }) {
  const a = await afiliatDupaToken(params.token).catch(() => null);
  if (!a) notFound();
  const comenzi = await comenziAfiliat(a.cod).catch(() => []);
  const platite = comenzi.filter((c) => c.platita).length;
  const link = `${SITE.url}/p/${a.cod}`;
  const lunaAsta = new Date().toLocaleDateString("ro-RO", { month: "long", timeZone: "Europe/Bucharest" });
  const inLunaAsta = comenzi.filter((c) => {
    const d = new Date(c.data);
    const acum = new Date();
    return c.platita && d.getMonth() === acum.getMonth() && d.getFullYear() === acum.getFullYear();
  }).length;

  const carduri = [
    { e: "Clickuri pe link", v: String(a.clickuri) },
    { e: "Comenzi aduse", v: String(comenzi.length) },
    { e: "Comenzi plătite", v: String(platite) },
    { e: `Comision în ${lunaAsta}`, v: `${inLunaAsta * COMISION_LEI} lei` },
  ];

  return (
    <section className="bg-slate-50">
      <div className="container max-w-4xl py-12">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Cont de partener</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-brand-navy">{a.nume}</h1>
        <p className="text-sm text-slate-600">{a.firma}</p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-brand-navy">Linkul dumneavoastră</p>
          <p className="mt-2 break-all rounded-lg bg-slate-100 px-3 py-3 font-mono text-sm font-semibold text-brand-navy">
            {link}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Clientul care intră prin link rămâne al dumneavoastră 90 de zile, chiar dacă revine pe site mai târziu.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {carduri.map((c) => (
            <div key={c.e} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{c.e}</p>
              <p className="mt-1 text-2xl font-bold text-brand-navy">{c.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="font-semibold text-brand-navy">Comenzi aduse</p>
          {comenzi.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Încă nicio comandă. Prima apare aici imediat ce este plasată.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-2">Data</th>
                  <th>Pachet</th>
                  <th>Stare</th>
                  <th className="text-right">Comision</th>
                </tr>
              </thead>
              <tbody>
                {comenzi.map((c, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-2">
                      {new Date(c.data).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" })}
                    </td>
                    <td>{c.pachet}</td>
                    <td>{c.platita ? "✅ plătită" : "⏳ așteaptă plata"}</td>
                    <td className="text-right font-semibold">{c.platita ? `${COMISION_LEI} lei` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 text-sm text-slate-700">
          <p className="font-semibold text-brand-navy">Plata comisionului</p>
          <p className="mt-1">
            La începutul fiecărei luni ne trimiteți factura pentru comenzile plătite luna trecută, pe{" "}
            <a className="font-semibold underline" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
            . Plătim prin transfer bancar în contul {a.iban}.
          </p>
        </div>
      </div>
    </section>
  );
}
