import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Mulțumim — plată primită",
  robots: { index: false, follow: false },
};

export default function MultumimPage() {
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
