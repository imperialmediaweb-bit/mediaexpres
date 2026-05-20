import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { verifyProspectToken } from "@/lib/prospect-token";
import OrderForm from "./OrderForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finalizează comanda — MediaExpres",
  robots: { index: false, follow: false },
};

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = verifyProspectToken(token);
  if (!decoded) notFound();

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, decoded.prospectId))
    .limit(1);
  if (!prospect) notFound();

  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-12 text-center">
          <p className="eyebrow text-brand-gold">Pasul final</p>
          <h1 className="h1 mt-2 text-white">
            Comandă pentru {prospect.companyName}
          </h1>
          <p className="lead mt-3 max-w-2xl mx-auto text-white/85">
            Completează datele firmei pentru factură + tematica articolului.
            Primești raportul cu linkurile + factura fiscală în 12 ore de la
            publicare.
          </p>
        </div>
      </section>
      <section className="section bg-slate-50">
        <div className="container max-w-3xl">
          <OrderForm token={token} prospectCompany={prospect.companyName} />
        </div>
      </section>
    </>
  );
}
