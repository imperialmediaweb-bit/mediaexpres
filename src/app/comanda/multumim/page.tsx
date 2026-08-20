import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";
import { signOrderToken } from "@/lib/order-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mulțumim — plată primită",
  robots: { index: false, follow: false },
};

/**
 * Dupa o plata one-time reusita, clientul nu trebuie sa astepte sa-l sunam:
 * il trimitem direct la formularul unde isi incarca articolul si pozele.
 * Abonamentele raman pe pagina de multumire clasica.
 */
async function articleUrlFor(sessionId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== "payment") return null;
    if (session.payment_status !== "paid") return null;

    const email = session.customer_details?.email || session.customer_email;
    const packageId = session.metadata?.packageId;
    if (!email || !packageId) return null;

    return `/articol/${signOrderToken({ sessionId: session.id, email, packageId })}`;
  } catch (err) {
    console.error("[multumim] nu am putut citi sesiunea Stripe:", err);
    return null;
  }
}

export default async function MultumimPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  if (searchParams.session_id) {
    const target = await articleUrlFor(searchParams.session_id);
    if (target) redirect(target);
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
