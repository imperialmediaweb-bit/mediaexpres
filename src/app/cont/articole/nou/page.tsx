import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntitlements } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { ArticleEditor } from "@/components/cont/ArticleEditor";
import { Lock, Sparkles } from "lucide-react";

export const metadata = {
  title: "Articol nou",
  robots: { index: false, follow: false },
};

export default async function ArticolNouPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const ent = await getEntitlements(session.user.id);

  if (!ent.hasPaid) {
    return (
      <section className="container py-12">
        <div className="max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
            Nu poti trimite articole inca
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Alege un pachet sau un abonament. Dupa prima plata, poti trimite
            articolul, urca pana la 3 poze si il putem genera si cu AI daca vrei.
          </p>
          <div className="mt-6">
            <Button variant="accent" asChild>
              <Link href="/pachete">Vezi pachetele</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (ent.hasActiveSubscription && ent.articlesRemaining <= 0) {
    return (
      <section className="container py-12">
        <div className="max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-brand-navy">
            Nu mai ai articole luna aceasta
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            Ai folosit toate cele {ent.activeSubscription?.articlesIncludedPerMonth} articole
            incluse in abonament. Se reseteaza la reinnoirea automata din{" "}
            {new Date(ent.activeSubscription!.currentPeriodEnd).toLocaleDateString("ro-RO")}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="accent" asChild>
              <Link href="/cont/abonament">Upgrade abonament</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pachete">Cumpara un pachet extra</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const category: "standard" | "casino" =
    ent.activeSubscription?.category === "casino" ? "casino" : "standard";

  return (
    <section className="container py-12">
      <div className="max-w-3xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Trimite un articol nou</h1>
        <p className="lead mt-3 text-slate-600">
          Completeaza datele articolului, atat textul cat si pozele. Poti folosi si{" "}
          <Sparkles className="inline h-4 w-4 text-purple-600" /> AI ca sa il generam
          pentru tine dupa cateva indicatii.
        </p>

        {ent.hasActiveSubscription && (
          <p className="mt-3 text-sm text-brand-red font-semibold">
            Articole ramase in luna: {ent.articlesRemaining} /{" "}
            {ent.activeSubscription?.articlesIncludedPerMonth}
          </p>
        )}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <ArticleEditor canGenerate={true} defaultCategory={category} />
        </div>
      </div>
    </section>
  );
}
