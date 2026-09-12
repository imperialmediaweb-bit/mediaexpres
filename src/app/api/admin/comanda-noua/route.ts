import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { orderSubmissions, users } from "@/db/schema";
import { findPackageById } from "@/data/packages";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { parseazaSursa, serializeazaSursa } from "@/lib/sursa";
import { RITM_IDS } from "@/lib/ritm";

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
  fbBoostPaper: z.string().max(120).optional(),
  /** Incasata deja? Atunci publicarea e libera imediat. */
  paid: z.boolean().default(false),
  facebookOptIn: z.boolean().default(true),
  uniquePerSite: z.boolean().default(true),
  /** Cate articole a cumparat — creeaza cate o comanda pentru fiecare. */
  count: z.number().int().min(1).max(10).default(1),
  /**
   * De unde a venit clientul, cand stim (a scris pe WhatsApp „Am vazut oferta
   * pe Facebook”): „facebook|paid|”, „google|cpc|”, „whatsapp|direct|”.
   * Formatul din lib/sursa.ts; lipsa = „manual”.
   */
  source: z.string().max(80).optional(),
  /** Ritmul de publicare cerut de client pe WhatsApp: rapid / zile3 / sapt2. */
  ritm: z.enum(RITM_IDS).default("rapid"),
});

export async function POST(req: NextRequest) {
  // 12.09.2026 — comenzile de pe WhatsApp le poate introduce si asistentul,
  // din afara adminului, cu aceeasi cheie ca extensia (X-Api-Key). Cookie-ul
  // de admin ramane calea pentru formularul din admin.
  const session = getSession();
  if (!session && verifyExtensionKey(req)) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  let raw: unknown;
  try {
    await ensureOrderColumns();
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
  const sursaData = parseazaSursa(d.source);
  const sursaComenzii = sursaData ? serializeazaSursa(sursaData) : "manual";

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
          source: sursaComenzii,
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
          ritm: d.ritm,
          isCasino: pkg.category === "casino",
          paymentMethod: "op",
          fbBoostPaper: d.fbBoostPaper?.trim() || null,
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
