import type { Metadata } from "next";
import Link from "next/link";
import { XCircle, Landmark, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Plată anulată",
  robots: { index: false, follow: false },
};

/**
 * Pagina pe care ajunge cine apasa „inapoi" in Stripe.
 *
 * Nu e un om care s-a razgandit — de cele mai multe ori e o firma care nu
 * plateste cu cardul personal un serviciu B2B si vrea ordin de plata cu
 * factura. Varianta veche ii spunea „vezi pachete" si il trimitea la
 * pagina cu preturile intregi (1.500 lei), fara nicio vorba despre OP:
 * pierdea exact clientul care voia sa plateasca, doar altfel.
 *
 * Pachetul vine in URL (?pachet=) din cancel_url-ul sesiunii Stripe, ca
 * drumul prin OP sa fie pentru ACELASI pachet, la acelasi pret.
 */
export default function AnulatPage({
  searchParams,
}: {
  searchParams: { pachet?: string; abonament?: string };
}) {
  const pkg = searchParams.pachet ? findPackageById(searchParams.pachet) : null;
  const abonament = searchParams.abonament === "1";
  const promo = pkg?.id.startsWith("promo-") ?? false;
  const inapoi = promo ? "/oferta-500#oferta" : "/pachete";
  const waText = encodeURIComponent(
    pkg
      ? `Bună ziua! Am vrut să comand ${pkg.name} (${pkg.price} lei), dar nu plătesc cu cardul. Cum pot plăti prin transfer bancar?`
      : "Bună ziua! Am vrut să comand un articol, dar nu plătesc cu cardul. Cum pot plăti altfel?",
  );

  return (
    <section className="bg-white">
      <div className="container py-24 text-center">
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <XCircle className="h-10 w-10 text-slate-500" />
        </div>
        <h1 className="h1 mt-6">Plata cu cardul a fost anulată</h1>
        <p className="lead mx-auto mt-4 max-w-xl text-slate-600">
          Nu ți-a fost debitată nicio sumă.
          {pkg && !abonament ? (
            <>
              {" "}
              Dacă nu plătești cu cardul, poți comanda{" "}
              <strong>prin ordin de plată</strong>: trimiți comanda, primești factura
              fiscală pe email și plătești pe baza ei, ca între firme.
            </>
          ) : (
            <> Poți reveni oricând la ofertă sau ne scrii și rezolvăm împreună.</>
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {pkg && !abonament && (
            <Button variant="default" size="lg" asChild>
              <Link href={`/comanda/transfer?pachet=${encodeURIComponent(pkg.id)}`}>
                <Landmark className="mr-2 h-5 w-5" />
                Comandă prin ordin de plată — {pkg.price.toLocaleString("ro")} lei
              </Link>
            </Button>
          )}
          <Button variant={pkg && !abonament ? "outline" : "default"} size="lg" asChild>
            <a href={`https://wa.me/${SITE.whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              Scrie-ne pe WhatsApp
            </a>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href={inapoi}>
              <ArrowLeft className="mr-2 h-5 w-5" />
              Înapoi la ofertă
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
