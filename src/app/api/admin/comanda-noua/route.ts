import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions, users } from "@/db/schema";
import { findPackageById } from "@/data/packages";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";

export const runtime = "nodejs";

/**
 * Comanda introdusa de noi, pentru cine a comandat pe WhatsApp sau la telefon.
 *
 * Pana acum singura cale era sa completam noi formularul public in locul
 * clientului: iesea o comanda „pending_payment" care declansa emailuri catre
 * el si o incercare de facturare automata — pentru o intelegere deja facuta,
 * uneori deja platita. Aici nu pleaca niciun email; comanda intra direct in
 * starea pe care i-o dam.
 */
const schema = z.object({
  packageId: z.string().min(1).max(64),
  email: z.string().email().max(200),
  contactPhone: z.string().max(40).optional(),
  companyName: z.string().min(2).max(200),
  companyCui: z.string().max(40).optional(),
  companyAddress: z.string().max(300).optional(),
  title: z.string().min(3).max(300),
  body: z.string().min(20).max(30000),
  siteUrl: z.string().max(300).optional(),
  /** Incasata deja? Atunci publicarea e libera imediat. */
  paid: z.boolean().default(false),
  facebookOptIn: z.boolean().default(true),
  uniquePerSite: z.boolean().default(true),
  /** Cate articole a cumparat — creeaza cate o comanda pentru fiecare. */
  count: z.number().int().min(1).max(10).default(1),
});

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const pkg = findPackageById(d.packageId);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: "Pachet inexistent" }, { status: 400 });
  }

  const email = d.email.trim().toLowerCase();
  const title = cleanTitle(d.title);
  const body = cleanArticleText(d.body);
  const ids: string[] = [];

  try {
    for (let i = 0; i < d.count; i++) {
      // Referinta spune din prima ca e o comanda introdusa manual — se vede
      // in admin si in factura, fara sa fie confundata cu una din formular.
      const reference = `man_${crypto.randomUUID()}`;
      const [row] = await db
        .insert(orderSubmissions)
        .values({
          stripeSessionId: reference,
          email,
          packageId: d.packageId,
          // La mai multe articole din aceeasi comanda, titlurile se numeroteaza
          // ca sa nu arate identic in lista de materiale.
          title: d.count > 1 ? `${title} (${i + 1}/${d.count})` : title,
          body,
          siteUrl: d.siteUrl?.trim() || null,
          contactPhone: d.contactPhone?.trim() || null,
          companyName: d.companyName.trim(),
          companyCui: d.companyCui?.trim() || null,
          companyAddress: d.companyAddress?.trim() || null,
          images: "[]",
          featuredIndex: 0,
          facebookOptIn: d.facebookOptIn,
          uniquePerSite: d.uniquePerSite,
          isCasino: pkg.category === "casino",
          paymentMethod: "op",
          status: d.paid ? "paid" : "pending_payment",
        })
        .returning({ id: orderSubmissions.id });
      ids.push(row.id);
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!existing) {
      await db.insert(users).values({
        email,
        name: d.companyName.trim(),
        phone: d.contactPhone?.trim() || null,
        companyName: d.companyName.trim(),
        companyCui: d.companyCui?.trim() || null,
        companyAddress: d.companyAddress?.trim() || null,
      });
    }
  } catch (err) {
    console.error("[admin/comanda-noua]", err);
    return NextResponse.json(
      { ok: false, error: "Nu am putut salva comanda." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ids, total: pkg.price * d.count });
}
