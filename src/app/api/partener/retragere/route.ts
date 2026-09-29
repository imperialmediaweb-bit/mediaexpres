import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { partnerPayouts, placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaToken } from "@/lib/plasare-token";
import { PRAG_RETRAGERE, STARI_PLATIBILE, ZILE_PLATA, ibanValid, normalizeazaIban } from "@/lib/decont";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(10).max(600),
  iban: z.string().min(15).max(40),
  accountHolder: z.string().min(2).max(200),
  cui: z.string().max(40).optional(),
  invoiceNumber: z.string().max(60).optional(),
});

/**
 * Cererea de plata a partenerului.
 *
 * 29.09.2026 — suma NU vine din browser. Totul se face intr-o tranzactie:
 *   1. refuz daca exista deja o cerere deschisa (409 — altfel ajung trei
 *      cereri pentru aceiasi bani);
 *   2. se creeaza cererea, apoi se REZERVA plasarile platibile ale publicatiei
 *      care nu sunt in nicio alta cerere (UPDATE ... WHERE statement_id IS
 *      NULL): doua apasari simultane nu pot lua aceeasi plasare de doua ori;
 *   3. suma = ce s-a rezervat efectiv; sub prag, tranzactia se anuleaza.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date incomplete." }, { status: 400 });
  }
  const d = parsed.data;

  const t = verificaToken(d.token, "panou");
  if (!t) return NextResponse.json({ ok: false, error: "Link expirat. Cere unul nou." }, { status: 403 });

  const iban = normalizeazaIban(d.iban);
  if (!ibanValid(iban)) {
    return NextResponse.json({ ok: false, error: "IBAN-ul nu e valid." }, { status: 400 });
  }

  await ensureOrderColumns();
  await ensurePlacementTables();
  const [pub] = await db.select().from(publishers).where(eq(publishers.id, t.id)).limit(1);
  if (!pub || (pub.tokenVersion ?? 0) !== t.v || pub.status !== "approved") {
    return NextResponse.json({ ok: false, error: "Link invalid." }, { status: 403 });
  }

  type Rezultat = { ok: true; id: string; suma: number; nr: number } | { ok: false; status: number; error: string };
  const rez: Rezultat = await db.transaction(async (tx): Promise<Rezultat> => {
    const [deschisa] = await tx
      .select({ id: partnerPayouts.id })
      .from(partnerPayouts)
      .where(and(eq(partnerPayouts.publisherId, pub.id), eq(partnerPayouts.status, "cerut")))
      .limit(1);
    if (deschisa) return { ok: false as const, status: 409, error: "Ai deja o cerere de plată în lucru." };

    const [cerere] = await tx
      .insert(partnerPayouts)
      .values({
        publisherId: pub.id,
        iban,
        accountHolder: d.accountHolder.trim(),
        company: d.accountHolder.trim(),
        cui: d.cui?.trim() || null,
        invoiceNumber: d.invoiceNumber?.trim() || null,
      })
      .returning({ id: partnerPayouts.id });

    const rezervate = await tx
      .update(placements)
      .set({ statementId: cerere.id })
      .where(
        and(
          eq(placements.publisherId, pub.id),
          isNull(placements.statementId),
          inArray(placements.status, [...STARI_PLATIBILE]),
        ),
      )
      .returning({ pret: placements.pricePartner });

    const suma = rezervate.reduce((s, r) => s + (r.pret || 0), 0);
    if (suma < PRAG_RETRAGERE) {
      // Aruncam ca tranzactia sa se anuleze cu totul: nicio plasare rezervata,
      // nicio cerere goala ramasa in baza.
      throw new SubPrag(suma);
    }
    await tx
      .update(partnerPayouts)
      .set({ amount: suma, placementsCount: rezervate.length })
      .where(eq(partnerPayouts.id, cerere.id));
    // IBAN-ul ramane pe cont, ca data viitoare sa nu-l mai scrie.
    await tx
      .update(publishers)
      .set({ payoutIban: iban, payoutCompany: d.accountHolder.trim() })
      .where(eq(publishers.id, pub.id));
    return { ok: true as const, id: cerere.id, suma, nr: rezervate.length };
  }).catch((e): Rezultat => {
    if (e instanceof SubPrag) {
      return { ok: false as const, status: 400, error: `Ai ${e.suma} lei de încasat; poți cere plata de la ${PRAG_RETRAGERE} de lei.` };
    }
    console.error("[partener/retragere]", e);
    return { ok: false as const, status: 500, error: "Nu am putut înregistra cererea. Încearcă din nou." };
  });

  if (!rez.ok) return NextResponse.json({ ok: false, error: rez.error }, { status: rez.status });

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `💸 Cerere de plată — ${pub.siteName}, ${rez.suma} lei`,
    html: wrapEmail(
      "Cerere de plată de la un partener",
      `<table style="width:100%;border-collapse:collapse;">
        ${kv("Publicație", esc(pub.siteName))}
        ${kv("Sumă", `${rez.suma} lei (${rez.nr} articole)`)}
        ${kv("IBAN", esc(iban))}
        ${kv("Titular", esc(d.accountHolder))}
        ${kv("CUI", esc(d.cui || "—"))}
        ${kv("Nr. factură", esc(d.invoiceNumber || "o trimite separat"))}
      </table>
      <p style="margin-top:16px;">Plătești, apoi apeși „Am plătit" în <a href="${SITE.url}/admin/parteneri">Admin → Parteneri</a>.</p>`,
    ),
  }).catch(() => {});

  await sendEmail({
    to: pub.contactEmail,
    subject: `Am primit cererea de plată — ${rez.suma} lei`,
    html: wrapEmail(
      "Cererea de plată a fost înregistrată",
      `<p>Salut,</p>
       <p>Am primit cererea ta de plată pentru <strong>${rez.suma} lei</strong> (${rez.nr} articole publicate pe ${esc(pub.siteName)}).</p>
       <p>${d.invoiceNumber ? "" : `Trimite-ne factura pe ${esc(SITE.legal.companyName)}, CUI ${esc(SITE.legal.cui)}, ca răspuns la acest email. `}Plătim în ${ZILE_PLATA} zile lucrătoare de la primirea facturii, în contul ${esc(iban)}.</p>`,
    ),
    replyTo: ADMIN_EMAIL,
  }).catch(() => {});

  return NextResponse.json({ ok: true, suma: rez.suma });
}

class SubPrag extends Error {
  constructor(public suma: number) {
    super("sub prag");
  }
}
