import { redirect } from "next/navigation";
import { verifyProspectToken } from "@/lib/prospect-token";
import { verifyFbLeadToken } from "@/lib/fb-lead-token";
import { NEWSPAPERS } from "@/data/newspapers";
import { OfertaSelector } from "./OfertaSelector";
import { ProspectOfertaPage } from "./ProspectOfertaPage";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OfertaPage({ params }: Props) {
  const { token } = await params;

  // Try prospect token first (outreach email flow)
  const prospectDecoded = verifyProspectToken(token);
  if (prospectDecoded) {
    const [prospect] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, prospectDecoded.prospectId))
      .limit(1);

    if (prospect) {
      // Track view (fire-and-forget)
      db.update(prospects)
        .set({
          viewCount: (prospect.viewCount ?? 0) + 1,
          firstViewedAt: prospect.firstViewedAt ?? new Date(),
          lastViewedAt: new Date(),
          status: prospect.status === "new" || prospect.status === "contacted" ? "opened" : prospect.status,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, prospect.id))
        .catch(() => {});

      return <ProspectOfertaPage token={token} prospect={prospect} />;
    }
  }

  // Fall back to FB lead token (Facebook Ads flow)
  const lead = verifyFbLeadToken(token);
  if (!lead) redirect("/");

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
          token={token}
          firstName={firstName}
          newspapers={NEWSPAPERS}
        />
      </div>
    </div>
  );
}
