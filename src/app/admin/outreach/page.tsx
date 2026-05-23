import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { OutreachClient } from "./OutreachClient";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const session = getSession();
  if (!session) redirect("/admin/login");

  const items = await db
    .select({
      id: prospects.id,
      contactName: prospects.contactName,
      contactTitle: prospects.contactTitle,
      companyName: prospects.companyName,
      city: prospects.city,
      linkedinUrl: prospects.linkedinUrl,
      lastEmailBody: prospects.lastEmailBody,
    })
    .from(prospects)
    .where(and(eq(prospects.source, "linkedin"), eq(prospects.status, "new")))
    .orderBy(desc(prospects.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-bold text-brand-navy">
          Outreach LinkedIn — batch
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Prospecți capturați cu extensia, status <code>new</code>. Apeși
          „Generează mesaje pentru toți”, apoi pentru fiecare: copiezi, deschizi
          profilul LinkedIn, dai Connect → Add note → lipești → Send, te întorci
          și marchezi „Trimis”.
        </p>
      </header>
      <OutreachClient initialProspects={items} />
    </div>
  );
}
