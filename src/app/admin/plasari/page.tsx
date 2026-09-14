import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { etichetaStare } from "@/lib/plasari";
import { ADAOS_PLASARE } from "@/lib/niveluri-publicatii";
import { NewPlacementForm } from "./NewPlacementForm";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
}

export default async function AdminPlasari() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/plasari");

  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);

  const [randuri, parteneri] = await Promise.all([
    db.select().from(placements).orderBy(desc(placements.sentAt)).limit(100),
    db.select().from(publishers).where(eq(publishers.status, "approved")).orderBy(publishers.siteName),
  ]);

  const dupaId = new Map(parteneri.map((p) => [p.id, p]));
  // Publicatiile fara tarif nu pot primi plasari — se vede de aici, ca sa nu
  // descoperi asta abia cand apesi butonul.
  const faraTarif = parteneri.filter((p) => !p.pricePerArticle);
  const gata = parteneri.filter((p) => p.pricePerArticle);

  const publicate = randuri.filter((r) => r.status === "publicat" || r.status === "finalizat");
  const deIncasat = publicate.reduce((s, r) => s + r.priceClient, 0);
  const dePlatit = publicate.reduce((s, r) => s + r.pricePartner, 0);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Plasări pe publicații partenere</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Publicații independente, pe care nu le deținem. Clientul plătește doar la noi, noi plătim
        publicația, iar cele două părți nu se cunosc. Pe fiecare plasare ne rămân{" "}
        <strong>{ADAOS_PLASARE} lei</strong>.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Caseta eticheta="Plasări publicate" valoare={String(publicate.length)} />
        <Caseta eticheta="Încasat din ele" valoare={`${deIncasat.toLocaleString("ro-RO")} lei`} />
        <Caseta eticheta="De plătit publicațiilor" valoare={`${dePlatit.toLocaleString("ro-RO")} lei`} />
      </div>

      {faraTarif.length > 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Fără tarif, deci nu pot primi articole:{" "}
          {faraTarif.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <Link href={`/admin/parteneri/${p.id}`} className="underline">
                {p.siteName}
              </Link>
            </span>
          ))}
          . Pune-le nivelul în pagina publicației.
        </p>
      )}

      <div className="mt-6">
        {gata.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Nicio publicație parteneră cu tarif încă. Aprobă una din{" "}
            <Link href="/admin/parteneri" className="text-brand-red underline">
              Parteneri
            </Link>{" "}
            și pune-i nivelul.
          </p>
        ) : (
          <NewPlacementForm
            parteneri={gata.map((p) => ({
              id: p.id,
              nume: p.siteName,
              judet: p.county,
              tier: p.tier,
              tarif: p.pricePerArticle as number,
              dofollow: p.dofollowLinks,
            }))}
          />
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Trimis</th>
              <th className="px-4 py-3">Publicație</th>
              <th className="px-4 py-3">Articol</th>
              <th className="px-4 py-3">Stare</th>
              <th className="px-4 py-3">Plătim</th>
              <th className="px-4 py-3">Încasăm</th>
              <th className="px-4 py-3">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {randuri.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nicio plasare încă.
                </td>
              </tr>
            )}
            {randuri.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-slate-500">{fmt(r.sentAt)}</td>
                <td className="px-4 py-3 font-medium text-brand-navy">
                  {dupaId.get(r.publisherId)?.siteName || "—"}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-700">{r.articleTitle}</td>
                <td className="px-4 py-3 text-xs">{etichetaStare(r.status)}</td>
                <td className="px-4 py-3">{r.pricePartner} lei</td>
                <td className="px-4 py-3">{r.priceClient} lei</td>
                <td className="px-4 py-3">
                  {r.publishedUrl ? (
                    <a href={r.publishedUrl} target="_blank" rel="noreferrer" className="text-brand-red underline">
                      deschide
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Caseta({ eticheta, valoare }: { eticheta: string; valoare: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{eticheta}</p>
      <p className="mt-1 font-serif text-2xl font-bold text-brand-navy">{valoare}</p>
    </div>
  );
}
