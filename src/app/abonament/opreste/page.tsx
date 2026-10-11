import type { Metadata } from "next";
import { getStripe } from "@/lib/stripe";
import { verificaOprire, dataRo, sumaAbonament } from "@/lib/abonament-reamintire";
import { SITE } from "@/data/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Oprire abonament | MediaExpres", robots: { index: false, follow: false } };

export default async function OpresteAbonament({ searchParams }: { searchParams: { t?: string; stare?: string } }) {
  const token = searchParams.t || "";
  const ok = verificaOprire(token);
  let detalii: { suma: string; data: string; oprit: boolean } | null = null;
  if (ok) {
    const stripe = getStripe();
    const sub = stripe ? await stripe.subscriptions.retrieve(ok.subId).catch(() => null) : null;
    if (sub) detalii = { suma: sumaAbonament(sub), data: dataRo(sub.current_period_end * 1000), oprit: sub.cancel_at_period_end || sub.status === "canceled" };
  }
  const stare = searchParams.stare;

  return (
    <section className="section">
      <div className="container max-w-xl">
        <h1 className="h2">Abonamentul tău MediaExpres</h1>
        {!ok || !detalii ? (
          <p className="mt-4 text-slate-700">
            Linkul nu mai e valabil. Scrie-ne pe WhatsApp la {SITE.phone} sau la {SITE.email} și oprim noi abonamentul.
          </p>
        ) : detalii.oprit || stare === "oprit" ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <p className="font-semibold">Abonamentul e oprit.</p>
            <p className="mt-2">Nu se mai face nicio plată. Până pe {detalii.data} rămâi cu tot ce ai plătit deja.</p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-slate-700">
              Abonamentul de <strong>{detalii.suma} pe lună</strong> se reînnoiește pe <strong>{detalii.data}</strong>.
            </p>
            <p className="mt-3 text-slate-700">
              <strong>Vrei să continui?</strong> Nu trebuie să faci nimic, poți închide pagina.
            </p>
            <p className="mt-3 text-slate-700">
              <strong>Vrei să-l oprești?</strong> Apasă butonul. Nu se mai face nicio plată, iar până pe {detalii.data} rămâi cu tot ce ai plătit.
            </p>
            {stare === "eroare" && <p className="mt-3 text-red-700">Nu am reușit acum. Încearcă din nou sau scrie-ne pe WhatsApp la {SITE.phone}.</p>}
            <form method="post" action="/api/abonament/opreste" className="mt-6">
              <input type="hidden" name="t" value={token} />
              <button type="submit" className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white">
                Opresc abonamentul
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
