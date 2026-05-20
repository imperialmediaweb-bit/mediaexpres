import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { sendEmail, ADMIN_EMAIL, wrapEmail, kv } from "@/lib/email";
import { isSuppressed } from "@/data/suppression-list";

export const runtime = "nodejs";

const schema = z.object({
  agencyName: z.string().min(2).max(150),
  cui: z.string().min(3).max(40),
  contactName: z.string().max(150).optional().or(z.literal("")),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  activeClients: z.string().max(100).optional().or(z.literal("")),
  monthlyVolume: z.string().max(100).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
        { status: 400 }
      );
    }
    const f = parsed.data;

    // Salveaza agentia ca prospect in /admin/prospecti (status 'interested' — a aplicat singura).
    try {
      const existing = await db
        .select({ id: prospects.id })
        .from(prospects)
        .where(eq(prospects.email, f.email))
        .limit(1);
      if (existing.length === 0 && !isSuppressed(f.email)) {
        await db.insert(prospects).values({
          companyName: f.agencyName,
          contactName: f.contactName || null,
          email: f.email,
          phone: f.phone || null,
          website: f.website || null,
          industry: "Agenție PR / Marketing",
          source: "parteneri",
          status: "interested",
          notes: `Aplicație reseller pe ${new Date().toLocaleDateString("ro-RO")}. CUI: ${f.cui}. Clienți activi: ${f.activeClients || "—"}. Volum lunar estimat: ${f.monthlyVolume || "—"}.${f.message ? ` Mesaj: ${f.message}` : ""}`,
        });
      }
    } catch (err) {
      console.error("[parteneri/apply] db error:", err);
    }

    // Notificare catre admin (contact@mediaexpress.ro)
    const adminBody = `
      <p>Aplicatie noua pentru cont reseller MediaExpres:</p>
      <table style="border-collapse:collapse;width:100%;margin-top:16px;">
        ${kv("Agentie", f.agencyName)}
        ${kv("CUI", f.cui)}
        ${kv("Contact", f.contactName)}
        ${kv("Email", f.email)}
        ${kv("Telefon", f.phone)}
        ${kv("Site", f.website)}
        ${kv("Clienti activi", f.activeClients)}
        ${kv("Volum lunar estimat", f.monthlyVolume)}
        ${kv("Mesaj", f.message)}
      </table>
      <p style="margin-top:20px;">Raspundeti aplicantului in 24h cu fie aprobare + credentiale cont, fie intrebari clarificatoare.</p>
    `;

    const adminResult = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Reseller] Aplicatie noua: ${f.agencyName}`,
      html: wrapEmail(`Aplicatie reseller: ${f.agencyName}`, adminBody),
      replyTo: f.email || undefined,
    });

    if (!adminResult.ok && !("dryRun" in adminResult)) {
      console.error("[parteneri/apply] admin email failed:", adminResult);
    }

    // Confirmare catre aplicant
    const userBody = `
      <p>Salut${f.contactName ? `, ${f.contactName}` : ""}!</p>
      <p>Am primit aplicatia ta pentru contul de partener reseller MediaExpres pentru <strong>${f.agencyName}</strong>.</p>
      <p>Iti raspundem in maxim 24h lucratoare pe acest email cu:</p>
      <ul>
        <li>fie aprobarea + credentialele pentru contul tau reseller (preturi -25% afisate)</li>
        <li>fie 1-2 intrebari clarificatoare daca avem nevoie de mai multe detalii</li>
      </ul>
      <p>Daca intre timp ai intrebari, scrie-ne la <a href="mailto:contact@mediaexpress.ro">contact@mediaexpress.ro</a>.</p>
      <p>Multumim,<br/>Echipa MediaExpres</p>
    `;

    await sendEmail({
      to: f.email,
      subject: "Aplicatia ta reseller MediaExpres a fost primita",
      html: wrapEmail("Aplicatie primita", userBody),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Eroare server";
    console.error("[parteneri/apply] crash:", e);
    return NextResponse.json(
      { ok: false, error: `Server: ${message}` },
      { status: 500 }
    );
  }
}
