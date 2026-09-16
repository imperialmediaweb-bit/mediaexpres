import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserOrders } from "@/lib/entitlements";
import { findPackageById } from "@/data/packages";
import { Button } from "@/components/ui/button";
import { campaniaPentruComanda, type CampanieRetea } from "@/lib/retea";

export const metadata = {
  title: "Comenzile mele",
  robots: { index: false, follow: false },
};

/**
 * 16.09.2026 — pana azi, clientul care platise si astepta publicarea nu vedea
 * NIMIC aici: data, pachetul, suma, statusul. Cu ritmul de doua saptamani,
 * asta inseamna doua saptamani in care nu are nicio dovada ca se intampla
 * ceva — exact momentul in care suna suparat.
 *
 * Articolele se publica in alta aplicatie (Reteaua Expres), iar legatura
 * exista deja si e folosita in admin: `campaniaPentruComanda`. O folosim si
 * aici, ca omul sa vada „12 din 50 publicate" si sa aiba linkul paginii
 * publice, care se completeaza singura.
 *
 * Se citeste o data pe minut, nu la fiecare reincarcare: altfel 50 de clienti
 * care isi deschid contul lovesc reteaua in acelasi timp.
 */
export const revalidate = 60;

function formatRON(cents: number) {
  return (cents / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
  });
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ComenziPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const orders = await getUserOrders(session.user.id);

  // Starea din retea, doar pentru comenzile platite. Daca reteaua nu raspunde
  // sau cheia lipseste, ramane null si randul arata exact ca inainte — nu
  // inventam cifre si nu cade pagina.
  const platite = orders.filter((o) => o.status === "paid");
  const stari = new Map<string, CampanieRetea>();
  await Promise.all(
    platite.map(async (o) => {
      try {
        const r = await campaniaPentruComanda(o.stripeSessionId, o.email);
        if (r.stare === "gasita") stari.set(o.id, r.campanie);
      } catch {
        /* pagina clientului nu cade pentru ca reteaua a intarziat */
      }
    }),
  );

  return (
    <section className="container py-12">
      <div className="max-w-5xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Comenzile mele</h1>
        <p className="lead mt-3 text-slate-600">
          Istoricul comenzilor tale. Pentru comenzile în așteptare, datele de plată prin transfer bancar au fost trimise pe email. Articolul se publică după confirmarea plății.
        </p>

        {orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-600">Nu ai inca nicio comanda. Completeaza formularul de comanda ca sa incepi.</p>
            <div className="mt-6">
              <Button variant="accent" asChild>
                <Link href="/pachete">Vezi pachetele</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Pachet</th>
                  <th className="px-4 py-3 font-semibold">Articol</th>
                  <th className="px-4 py-3 font-semibold">Suma</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Publicare</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const pkg = findPackageById(o.packageId);
                  return (
                    <tr key={o.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(o.paidAt || o.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-brand-navy">
                        {pkg?.name || o.packageId}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.articleTitle || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatRON(o.amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Publicare campanie={stari.get(o.id)} status={o.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Cate publicatii au iesit pana acum si linkul paginii publice.
 *
 * Nu aratam nimic din interiorul campaniei — ce ziare, la ce pret, ce stare
 * interna. Doar „X din Y" si linkul pe care oricum il poate primi pe email.
 */
function Publicare({ campanie, status }: { campanie?: CampanieRetea; status: string }) {
  if (status !== "paid") return <span className="text-slate-400">—</span>;
  if (!campanie) {
    return (
      <span className="text-xs text-slate-500">
        În pregătire. Îți trimitem raportul pe email.
      </span>
    );
  }
  return (
    <div className="text-xs">
      <p className="font-semibold text-brand-navy">
        {campanie.articoleLive} din {campanie.articole || 50} publicate
      </p>
      {campanie.raportUrl && (
        <a
          href={campanie.raportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-block font-medium text-brand-red hover:underline"
        >
          Vezi publicările →
        </a>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Platit", cls: "bg-green-100 text-green-800" },
    pending: { label: "In asteptare", cls: "bg-amber-100 text-amber-800" },
    pending_payment: { label: "Asteapta plata", cls: "bg-blue-100 text-blue-800" },
    refunded: { label: "Rambursat", cls: "bg-slate-100 text-slate-700" },
    canceled: { label: "Anulat", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
