import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, FileText, Mail } from "lucide-react";
import { verifyProspectToken } from "@/lib/prospect-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comandă primită — MediaExpres",
  robots: { index: false, follow: false },
};

export default async function MultumescPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = verifyProspectToken(token);
  if (!decoded) notFound();

  return (
    <section className="bg-brand-navy text-white">
      <div className="container py-20 text-center max-w-2xl">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand-gold" />
        <h1 className="h1 mt-6 text-white">Comandă primită — mulțumim!</h1>
        <p className="lead mt-4 text-white/85">
          Am preluat comanda și pornim publicarea. Iată ce urmează:
        </p>

        <ol className="mt-10 space-y-5 text-left">
          <Step
            icon={Mail}
            title="Confirmare pe email"
            desc="Ți-am trimis confirmarea comenzii pe adresa de factură pe care ai completat-o."
          />
          <Step
            icon={Clock}
            title="Publicare în 12 ore"
            desc="AI redactează articolul pe baza tematicii tale, apoi îl distribuim pe 50 ziare și 50 pagini Facebook."
          />
          <Step
            icon={FileText}
            title="Raport + factură"
            desc="Primești pe email raportul PDF cu toate linkurile către articolele publicate + factura fiscală emisă cu CUI-ul firmei tale. Plătești după."
          />
        </ol>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 py-3 text-sm text-white hover:bg-white/10"
          >
            Înapoi la mediaexpress.ro
          </Link>
        </div>
      </div>
    </section>
  );
}

function Step({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-4 rounded-xl bg-white/5 p-5 border border-white/10">
      <Icon className="h-6 w-6 shrink-0 text-brand-gold mt-1" />
      <div>
        <h3 className="font-serif text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-white/75 mt-1">{desc}</p>
      </div>
    </li>
  );
}
