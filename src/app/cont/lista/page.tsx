import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntitlements } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Download, Lock, FileText } from "lucide-react";

export const metadata = {
  title: "Lista ziarelor",
  robots: { index: false, follow: false },
};

const LIST_PDF_PATH = "/files/lista-ziare.pdf";

export default async function ListaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const ent = await getEntitlements(session.user.id);

  return (
    <section className="container py-12">
      <div className="max-w-3xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Lista ziarelor din retea</h1>
        <p className="lead mt-3 text-slate-600">
          PDF complet cu toate cele ~50 de site-uri din rețea, inclusiv trafic
          estimativ, categorii si pagini de Facebook asociate.
        </p>

        {ent.hasPaid ? (
          <div className="mt-10 rounded-2xl border border-green-200 bg-white p-8">
            <div className="flex items-center gap-3 text-green-700">
              <FileText className="h-8 w-8" />
              <div>
                <p className="font-semibold">Acces activat</p>
                <p className="text-sm text-slate-600">
                  Ai platit pentru un pachet sau ai un abonament activ.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button variant="accent" size="lg" asChild>
                <a href={LIST_PDF_PATH} download>
                  <Download className="h-4 w-4" />
                  Descarca lista (PDF)
                </a>
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Lista se actualizeaza lunar. Te anuntam pe email cand apar ziare noi.
            </p>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 font-serif text-xl font-semibold text-brand-navy">
              Acces blocat
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Lista completa a ziarelor este disponibila doar dupa ce faci prima
              plata sau iti activezi un abonament. Asta ne protejeaza reteaua de
              concurenti care ar copia-o.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="accent" asChild>
                <Link href="/pachete">Vezi pachetele</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/oferta">Solicita lista partiala</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
