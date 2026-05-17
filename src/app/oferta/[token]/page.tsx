import { redirect } from "next/navigation";
import { verifyFbLeadToken } from "@/lib/fb-lead-token";
import { NEWSPAPERS } from "@/data/newspapers";
import { OfertaSelector } from "./OfertaSelector";

export const dynamic = "force-dynamic";

interface Props {
  params: { token: string };
}

export default async function OfertaPage({ params }: Props) {
  const lead = verifyFbLeadToken(params.token);
  if (!lead) redirect("/oferta-fb");

  const firstName = lead.name.trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5F0] to-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-green-100 px-4 py-1 text-sm font-semibold text-green-700">
            Ofertă personalizată pentru {lead.name}
          </span>
          <h1 className="mt-4 font-serif text-3xl font-bold text-brand-navy md:text-4xl">
            Bună, {firstName}! Iată oferta pe{" "}
            <span className="text-brand-red">50 de ziare</span>
          </h1>
          <p className="mt-3 text-slate-600">
            Bifează pachetul + regiunea, vezi ziarele, apoi &bdquo;Public ACUM&rdquo; &mdash; publicăm în 24h.
          </p>
        </div>

        <OfertaSelector
          token={params.token}
          firstName={firstName}
          newspapers={NEWSPAPERS}
        />
      </div>
    </div>
  );
}
