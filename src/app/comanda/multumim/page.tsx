import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";
import { signOrderToken } from "@/lib/order-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mulțumim — plată primită",
  robots: { index: false, follow: false },
};

type Outcome =
  | { kind: "article"; url: string }
  | { kind: "subscription"; email: string | null }
  | { kind: "generic" };

/**
 * Dupa plata, clientul nu trebuie sa astepte sa-l sunam:
 *  - plata unica -> direct la formularul de trimis articolul si pozele
 *  - abonament  -> spre cont, unde isi creeaza articolul lunar
 */
async function resolveOutcome(sessionId: string): Promise<Outcome> {
  const stripe = getStripe();
  if (!stripe) return { kind: "generic" };

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return { kind: "generic" };

    const email = session.customer_details?.email || session.customer_email || null;

    if (session.mode === "payment") {
      const packageId = session.metadata?.packageId;
      if (!email || !packageId) return { kind: "generic" };
      return {
        kind: "article",
        url: `/articol/${signOrderToken({ sessionId: session.id, email, packageId })}`,
      };
    }

    if (session.mode === "subscription") {
      return { kind: "subscription", email };
    }

    return { kind: "generic" };
  } catch (err) {
    console.error("[multumim] nu am putut citi sesiunea Stripe:", err);
    return { kind: "generic" };
  }
}

export default async function MultumimPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  let outcome: Outcome = { kind: "generic" };
  if (searchParams.session_id) {
    outcome = await resolveOutcome(searchParams.session_id);
    if (outcome.kind === "article") redirect(outcome.url);
  }

  if (outcome.kind === "subscription") {
    return (
      <section className="bg-white">
        <div className="container py-24 text-center">
          <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <RefreshCw className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="h1 mt-6">Abonamentul e activ! 🎉</h1>
          <p className="lead mt-4 mx-auto max-w-xl text-slate-600">
            De acum ai câte un articol publicat pe cele 50 de ziare în fiecare
            lună. Totul se întâmplă din contul tău: acolo îți scrii articolul
            (sau îl generezi cu AI), încarci pozele și urmărești publicările.
          </p>
          <div className="mx-auto mt-6 max-w-md rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Intră în cont cu emailul folosit la plată
            {outcome.email ? (
              <> (<strong>{outcome.email}</strong>)</>
            ) : null}{" "}
            — primești un link de acces, fără parolă.
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="default" size="lg" asChild>
              <Link href="/cont">Intră în cont →</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">Contact</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white">
      <div className="container py-24 text-center">
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="h1 mt-6">Mulțumim — plata a fost primită!</h1>
        <p className="lead mt-4 mx-auto max-w-xl text-slate-600">
          Confirmarea a fost trimisă pe email-ul tău. Un membru al echipei te va
          contacta în maximum 2 ore (în timpul programului) cu detaliile de
          publicare.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="default" size="lg" asChild>
            <Link href="/">Înapoi acasă</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
