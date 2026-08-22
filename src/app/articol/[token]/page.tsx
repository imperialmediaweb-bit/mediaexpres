import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { verifyOrderToken } from "@/lib/order-token";
import { findPackageById } from "@/data/packages";
import { ArticleForm } from "./ArticleForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trimite articolul",
  robots: { index: false, follow: false },
};

export default function ArticolPage({ params }: { params: { token: string } }) {
  const order = verifyOrderToken(params.token);
  if (!order) redirect("/contact");

  const pkg = findPackageById(order.packageId);
  const isCasino = order.packageId.includes("cazino");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5F0] to-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <h1 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
            Plata a fost confirmată
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {pkg ? `${pkg.name} — ${pkg.price.toLocaleString("ro")} RON` : "Comandă confirmată"}. Mai
            e un singur pas: trimite-ne articolul și pozele.
          </p>
        </div>

        <div className="mb-8 text-center">
          <h2 className="font-serif text-xl font-bold text-brand-navy">
            Nu ai articol scris? Îl scriem noi.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Ne dai site-ul firmei și câteva idei — citim site-ul și redactăm un
            advertorial optimizat SEO. Îl poți edita înainte să-l trimiți.
          </p>
        </div>

        <ArticleForm
          token={params.token}
          email={order.email}
          isCasino={isCasino}
          newspapers={pkg?.newspapers ?? 50}
        />

        <p className="mt-8 text-center text-xs text-slate-500">
          Linkul acesta e personal și valabil 90 de zile. Dacă întâmpini
          probleme, scrie-ne la contact@mediaexpress.ro.
        </p>
      </div>
    </div>
  );
}
