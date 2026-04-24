import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Plată anulată",
  robots: { index: false, follow: false },
};

export default function AnulatPage() {
  return (
    <section className="bg-white">
      <div className="container py-24 text-center">
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <XCircle className="h-10 w-10 text-slate-500" />
        </div>
        <h1 className="h1 mt-6">Plata a fost anulată</h1>
        <p className="lead mt-4 mx-auto max-w-xl text-slate-600">
          Nu ți-a fost debitată nicio sumă. Poți reveni oricând la pachete sau
          ne poți scrie pe email pentru o ofertă personalizată.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="default" size="lg" asChild>
            <Link href="/pachete">Vezi pachete</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">Scrie-ne</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
