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
import { pretCatreClient, termenePlasare, ZILE_PUBLICARE, ZILE_REFUZ, LUNI_ONLINE } from "@/lib/plasari";

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

  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);

  const alese = await db
    .select()
    .from(publishers)
    .where(inArray(publishers.id, d.publisherIds));

  const fara = alese.filter((p) => p.status !== "approved" || !p.pricePerArticle);
  if (fara.length) {
    // Gard: o plasare fara tarif ar insemna sa nu stim cat datoram, iar o
    // publicatie suspendata nu mai are voie sa primeasca articole.
    return NextResponse.json(
      {
        ok: false,
        error: `Nu au tarif sau nu sunt active: ${fara.map((p) => p.siteName).join(", ")}. Pune-le nivelul din pagina publicației.`,
      },
      { status: 409 },
    );
  }
  if (alese.length !== d.publisherIds.length) {
    return NextResponse.json({ ok: false, error: "O publicație nu există" }, { status: 404 });
  }

  const acum = new Date();
  const { deadlineRefuz, deadlinePublicare } = termenePlasare(acum);
  const create: { id: string; publicatie: string; email: string }[] = [];

  for (const p of alese) {
    const tarif = p.pricePerArticle as number;
    const [rand] = await db
      .insert(placements)
      .values({
        publisherId: p.id,
        orderSubmissionId: d.orderSubmissionId || null,
        clientLabel: d.clientLabel || null,
        articleTitle: d.title,
        articleBody: d.body,
        images: JSON.stringify(d.images),
        featuredIndex: Math.min(d.featuredIndex, Math.max(0, d.images.length - 1)),
        linkNotes: d.linkNotes?.trim() || null,
        tier: p.tier || null,
        pricePartner: tarif,
        priceClient: pretCatreClient(tarif),
        dofollowExpected: p.dofollowLinks !== false,
        sentAt: acum,
        deadlineRefuz,
        deadlinePublicare,
      })
      .returning({ id: placements.id });

    create.push({ id: rand.id, publicatie: p.siteName, email: p.contactEmail });

    // Emailul catre partener. Ce NU contine, niciodata: numele clientului,
    // contactul lui, pretul incasat de noi, ce pachet a cumparat.
    const link = `${SITE.url}/plasare/${semneazaToken({ scope: "plasare", id: rand.id, v: 0 })}`;
    const html = wrapEmail(
      "Un articol nou pentru publicarea ta",
      `
      <p>Salut,</p>
      <p>Ai un articol de publicat pe <strong>${esc(p.siteName)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${kv("Titlu", esc(d.title))}
        ${kv("Îți plătim", `${tarif} lei`)}
        ${kv("Refuz până la", deadlineRefuz.toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" }))}
        ${kv("Publicare până la", deadlinePublicare.toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" }))}
      </table>
      <p>Deschide articolul, citește-l și decide:</p>
      <p style="margin:20px 0;">
        <a href="${link}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Vezi articolul</a>
      </p>
      <p style="color:#64748b;font-size:13px;">
        Îl poți refuza în ${ZILE_REFUZ} zile lucrătoare, fără să explici de ce.
        Dacă îl publici, lipești adresa articolului în aceeași pagină; el rămâne
        online ${LUNI_ONLINE} luni, cu linkurile neatinse.
        Ai ${ZILE_PUBLICARE} zile lucrătoare pentru publicare.
      </p>
      `,
    );
    await sendEmail({ to: p.contactEmail, subject: `Articol de publicat — ${p.siteName}`, html, replyTo: ADMIN_EMAIL });
  }

  const totalNoua = alese.reduce((s, p) => s + pretCatreClient(p.pricePerArticle as number), 0);
  const totalLor = alese.reduce((s, p) => s + (p.pricePerArticle as number), 0);
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Plasări trimise — ${alese.length} ${alese.length === 1 ? "publicație" : "publicații"}`,
    html: wrapEmail(
      "Plasări trimise",
      `<p>${esc(d.title)}</p>
       <table style="width:100%;border-collapse:collapse;">
         ${kv("Publicații", alese.map((p) => esc(p.siteName)).join(", "))}
         ${kv("Încasăm", `${totalNoua} lei`)}
         ${kv("Plătim", `${totalLor} lei`)}
         ${kv("Marjă", `${totalNoua - totalLor} lei`)}
       </table>`,
    ),
  }).catch(() => {});

  return NextResponse.json({ ok: true, plasari: create, totalNoua, totalLor });
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
