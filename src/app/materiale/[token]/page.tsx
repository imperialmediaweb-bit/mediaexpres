import { redirect } from "next/navigation";
import { verifyFbLeadToken } from "@/lib/fb-lead-token";
import { IntakeForm } from "./IntakeForm";

export const dynamic = "force-dynamic";

interface Props {
  params: { token: string };
  searchParams: { pkg?: string; region?: string; county?: string };
}

export default async function MaterialePage({ params, searchParams }: Props) {
  const lead = verifyFbLeadToken(params.token);
  if (!lead) redirect("/oferta-fb");

  const firstName = lead.name.trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5F0] to-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold text-brand-navy">
            Hai să publicăm, {firstName}!
          </h1>
          <p className="mt-2 text-slate-600">
            Completează formularul — publicăm în 24h de la primire.
          </p>
        </div>
        <IntakeForm
          token={params.token}
          leadEmail={lead.email}
          initialPackage={searchParams.pkg}
          initialRegion={searchParams.region}
          initialCounty={searchParams.county}
        />
      </div>
    </div>
  );
}
