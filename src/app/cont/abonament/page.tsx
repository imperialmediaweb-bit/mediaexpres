import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserSubscriptions } from "@/lib/entitlements";
import { SUBSCRIPTION_PLANS } from "@/data/packages";
import { Button } from "@/components/ui/button";
import { BillingPortalButton } from "@/components/cont/BillingPortalButton";
import { Repeat, CheckCircle2, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Abonamentul meu",
  robots: { index: false, follow: false },
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AbonamentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const subs = await getUserSubscriptions(session.user.id);
  const active =
    subs.find((s) => s.status === "active" || s.status === "trialing") || null;

  return (
    <section className="container py-12">
      <div className="max-w-4xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Abonamentul meu</h1>
        <p className="lead mt-3 text-slate-600">
          Vezi statusul abonamentului, cate articole mai ai in luna curenta si
          gestioneaza plata din portalul Stripe.
        </p>

        {active ? (
          <ActiveSubCard sub={active} />
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <Repeat className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 font-serif text-xl font-semibold text-brand-navy">
              Nu ai niciun abonament activ
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Abonamentele includ 1-8 articole distribuite lunar pe 50 de ziare,
              cu raport PDF si prioritate la publicare.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="accent" asChild>
                <Link href="/pachete#abonamente">Vezi abonamentele</Link>
              </Button>
            </div>
          </div>
        )}

        {subs.length > 0 && (
          <div className="mt-10">
            <h2 className="h2">Istoric abonamente</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Categorie</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Perioada curenta</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => {
                    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === s.planId);
                    return (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-brand-navy">
                          {plan?.name || s.planId}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600">{s.category}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          pana la {formatDate(s.currentPeriodEnd)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveSubCard({ sub }: { sub: { id: string; planId: string; category: string; status: string; articlesIncludedPerMonth: number; articlesRemaining: number; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean } }) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId);
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-brand-red/20 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-brand-red">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Activ</span>
        </div>
        <h2 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
          {plan?.name || sub.planId} — {sub.category === "casino" ? "Cazino" : "Standard"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{plan?.description}</p>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Articole incluse / luna</dt>
            <dd className="font-semibold">{sub.articlesIncludedPerMonth}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Articole ramase in luna</dt>
            <dd className="font-bold text-brand-red">{sub.articlesRemaining}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Urmatoarea facturare</dt>
            <dd className="font-semibold">
              {new Date(sub.currentPeriodEnd).toLocaleDateString("ro-RO")}
            </dd>
          </div>
          {sub.cancelAtPeriodEnd && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-900">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs">Abonamentul va fi anulat la sfarsitul perioadei curente.</p>
            </div>
          )}
        </dl>

        <div className="mt-6">
          <BillingPortalButton variant="default">Gestioneaza plata / anulare</BillingPortalButton>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-serif text-lg font-bold text-brand-navy">Ce poti face acum</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
            <span>Trimite pana la {sub.articlesRemaining} articol{sub.articlesRemaining === 1 ? "" : "e"} luna aceasta</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
            <span>Urca pana la 3 poze pentru fiecare articol</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
            <span>Genereaza textul articolului cu AI daca nu ai timp sa il scrii</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
            <span>Descarca lista completa de ziare in PDF</span>
          </li>
        </ul>
        <div className="mt-6 flex gap-2">
          <Button asChild variant="accent"><Link href="/cont/articole/nou">Trimite un articol</Link></Button>
          <Button asChild variant="outline"><Link href="/cont/lista">Descarca lista</Link></Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Activ", cls: "bg-green-100 text-green-800" },
    trialing: { label: "Trial", cls: "bg-blue-100 text-blue-800" },
    past_due: { label: "Intarziat", cls: "bg-amber-100 text-amber-800" },
    canceled: { label: "Anulat", cls: "bg-slate-100 text-slate-700" },
    incomplete: { label: "Incomplet", cls: "bg-slate-100 text-slate-700" },
    unpaid: { label: "Neplatit", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
