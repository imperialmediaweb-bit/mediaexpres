import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { semneazaToken } from "@/lib/plasare-token";
import { termenePlasare, ZILE_PUBLICARE, ZILE_REFUZ, LUNI_ONLINE } from "@/lib/plasari";
import { trimitePlasari } from "@/lib/trimite-plasari";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  publisherIds: z.array(z.string().min(1)).min(1).max(20),
  title: z.string().min(5).max(300),
  body: z.string().min(100).max(30000),
  images: z.array(z.object({ url: z.string().url().max(500) })).max(3).default([]),
  featuredIndex: z.number().int().min(0).max(2).default(0),
  linkNotes: z.string().max(1000).optional(),
  orderSubmissionId: z.string().max(80).optional(),
  clientLabel: z.string().max(200).optional(),
});

/**
 * Atribuie un articol uneia sau mai multor publicatii partenere.
 *
 * Materialul se COPIAZA pe fiecare plasare, nu se leaga prin join de comanda:
 * pe comanda stau numele firmei, telefonul si CUI-ul clientului, iar pagina
 * partenerului nu are voie sa ajunga niciodata la ele. Ce nu e copiat nu poate
 * scapa printr-o randare gresita.
 *
 * Preturile se ingheata aici. Daca publicatia urca de nivel peste trei luni,
 * plasarile de azi raman cu banii promisi azi.
 */
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

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
      { status: 400 },
    );
  }
  const d = parsed.data;

  const r = await trimitePlasari({
    publisherIds: d.publisherIds,
    title: d.title,
    body: d.body,
    images: d.images,
    featuredIndex: d.featuredIndex,
    linkNotes: d.linkNotes,
    orderSubmissionId: d.orderSubmissionId,
    clientLabel: d.clientLabel,
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, plasari: r.plasari, totalNoua: r.totalNoua, totalLor: r.totalLor });
}

/** Lista plasarilor, pentru admin. `?comanda=` filtreaza pe o comanda. */
export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  await ensurePlacementTables();
  const comanda = req.nextUrl.searchParams.get("comanda");
  const randuri = await db
    .select()
    .from(placements)
    .where(comanda ? eq(placements.orderSubmissionId, comanda) : undefined)
    .orderBy(desc(placements.sentAt))
    .limit(200);
  return NextResponse.json({ ok: true, plasari: randuri });
}
