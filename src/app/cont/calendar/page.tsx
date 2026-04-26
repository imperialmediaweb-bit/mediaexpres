import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntitlements } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { CalendarClient } from "./CalendarClient";
import { Lock, Calendar } from "lucide-react";

export const metadata = {
  title: "Calendar editorial AI",
  robots: { index: false, follow: false },
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const ent = await getEntitlements(session.user.id);

  if (!ent.hasPaid) {
    return (
      <section className="container py-12">
        <div className="max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
            Calendarul editorial e disponibil după prima plată
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            După ce achiziționezi un pachet sau un abonament, AI-ul îți planifică 12
            teme de comunicate de presă pentru un an, adaptate industriei tale.
          </p>
          <div className="mt-6">
            <Button variant="accent" asChild>
              <Link href="/pachete">Vezi pachetele</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-12">
      <div className="max-w-5xl">
        <div className="flex items-center gap-2 text-brand-red">
          <Calendar className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Calendar editorial cu AI
          </span>
        </div>
        <h1 className="h1 mt-2">Planifică 12 luni de PR în 30 de secunde</h1>
        <p className="lead mt-3 text-slate-600">
          AI-ul construiește un calendar anual de teme de comunicate de presă,
          ținând cont de sezonalitate, industria ta și momentele cheie din
          afacere. Click pe orice lună ca să trimiți articolul respectiv.
        </p>

        <div className="mt-10">
          <CalendarClient />
        </div>
      </div>
    </section>
  );
}
