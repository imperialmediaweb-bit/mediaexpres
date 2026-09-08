import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { verifyReviewToken } from "@/lib/review-token";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lăsați o părere",
  robots: { index: false, follow: false },
};

export default function RecenziePage({ params }: { params: { token: string } }) {
  const client = verifyReviewToken(params.token);
  if (!client) redirect("/contact");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5F0] to-white">
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-8 text-center">
          <Star className="mx-auto h-10 w-10 text-brand-gold" fill="currentColor" />
          <h1 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
            {client.clientName ? `${client.clientName}, cum vi s-a părut?` : "Cum vi s-a părut?"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Două-trei rânduri ne ajută mult. Nu durează un minut.
          </p>
        </div>

        <ReviewForm token={params.token} clientName={client.clientName} />

        <p className="mt-8 text-center text-xs text-slate-500">
          Linkul acesta e personal și valabil 90 de zile. Dacă preferați, puteți
          răspunde direct la emailul cu raportul.
        </p>
      </div>
    </div>
  );
}
