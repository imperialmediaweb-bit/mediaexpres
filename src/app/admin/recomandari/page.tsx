import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { situatieParteneri } from "@/lib/afiliati";
import { SITE } from "@/data/site";
import { TrimiteVoucher } from "./TrimiteVoucher";

export const dynamic = "force-dynamic";

/**
 * 13.11.2026 — programul de recomandari: toti partenerii, ce au adus si ce
 * li se datoreaza. Persoanele fizice primesc vouchere eMAG (cumparate de
 * proprietar pe eMAG, cu factura); codul se pune aici si pleaca pe email.
 */
export default async function AdminRecomandari() {
  if (!getSession()) redirect("/admin/login?from=/admin/recomandari");
  const lista = await situatieParteneri().catch(() => []);
  const deTrimis = lista.filter((p) => p.afiliat.tip === "persoana" && p.deTrimis > 0);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Parteneri (recomandări)</h1>
      <p className="mt-1 text-sm text-slate-600">
        {lista.length} parteneri · {lista.reduce((s, p) => s + p.clienti, 0)} clienți plătiți aduși ·{" "}
        {deTrimis.reduce((s, p) => s + p.deTrimis, 0)} lei în vouchere eMAG de trimis
      </p>

      {deTrimis.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Vouchere eMAG de trimis</p>
          <p className="text-sm text-amber-800">
            Cumpărați cardul cadou de pe eMAG (pe firmă, cu factură), puneți codul aici și apăsați „Trimite”. Partenerul îl
            primește pe email.
          </p>
          <div className="mt-3 space-y-3">
            {deTrimis.map((p) => (
              <div key={p.afiliat.id} className="rounded-lg bg-white p-3">
                <p className="text-sm">
                  <strong>{p.afiliat.nume}</strong> · {p.afiliat.email} · de primit: <strong>{p.deTrimis} lei</strong>
                </p>
                <TrimiteVoucher afiliatId={p.afiliat.id} suma={p.deTrimis} />
              </div>
            ))}
          </div>
        </div>
      )}

      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Partener</th>
            <th>Tip</th>
            <th>Link</th>
            <th className="text-right">Clickuri</th>
            <th className="text-right">Clienți plătiți</th>
            <th className="text-right">Câștigat</th>
            <th className="text-right">Dat</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.afiliat.id} className="border-t border-slate-200">
              <td className="py-2">
                <strong>{p.afiliat.nume}</strong>
                <br />
                <span className="text-slate-500">{p.afiliat.email} · {p.afiliat.telefon}</span>
              </td>
              <td>{p.afiliat.tip === "persoana" ? "Persoană fizică — vouchere eMAG" : `Firmă / PFA — ${p.afiliat.firma}`}</td>
              <td className="font-mono text-xs">{SITE.url.replace(/^https?:\/\//, "")}/p/{p.afiliat.cod}</td>
              <td className="text-right">{p.afiliat.clickuri}</td>
              <td className="text-right">{p.clienti}</td>
              <td className="text-right">{p.castigat} lei</td>
              <td className="text-right">{p.afiliat.tip === "persoana" ? `${p.trimis} lei` : "pe factură"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lista.length === 0 && <p className="mt-4 text-sm text-slate-500">Niciun partener înscris încă.</p>}
    </div>
  );
}
