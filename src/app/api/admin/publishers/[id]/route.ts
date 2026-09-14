import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, wrapEmail, escapeHtml as esc } from "@/lib/email";
import { SITE } from "@/data/site";
import { NIVELURI, nivelDupaId, pretClient } from "@/lib/niveluri-publicatii";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { ZILE_PUBLICARE, ZILE_REFUZ, LUNI_ONLINE } from "@/lib/plasari";

export const runtime = "nodejs";

/**
 * 14.09.2026 — pana azi exista doar aproba/respinge, o singura data, dupa
 * care publicatia nu mai putea fi atinsa din interfata. Dar tocmai lucrurile
 * comerciale se schimba in timp: publicatia creste pe Facebook si urca de
 * nivel, sau incalca regula celor 12 luni si trebuie scoasa din atribuire
 * FARA sa-i stergem istoricul de plata. De aici actiunile noi.
 */
const patchSchema = z.object({
  action: z.enum(["approve", "reject", "set_tier", "suspend", "reactivate", "reset_token"]),
  reason: z.string().max(1000).optional(),
  /** set_tier: nivelul ales si, optional, un tarif diferit de cel standard. */
  tier: z.enum(["bronz", "argint", "aur", "platina"]).optional(),
  pricePerArticle: z.number().int().min(0).max(5000).optional(),
  dofollowLinks: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }

  const [p] = await db
    .select()
    .from(publishers)
    .where(eq(publishers.id, params.id))
    .limit(1);
  if (!p) {
    return NextResponse.json({ ok: false, error: "Aplicație inexistentă" }, { status: 404 });
  }

  const now = new Date();
  await ensureOrderColumns();
  const act = parsed.data.action;

  // Partea comerciala: nivel, tarif, dofollow. Se poate schimba oricand, si
  // dupa aprobare — altfel un partener aprobat ramane pe veci fara pret, deci
  // nu i se poate atribui nicio plasare.
  if (act === "set_tier") {
    const nivel = nivelDupaId(parsed.data.tier || null) || NIVELURI[0];
    await db
      .update(publishers)
      .set({
        tier: nivel.id,
        pricePerArticle: parsed.data.pricePerArticle ?? nivel.plata,
        ...(parsed.data.dofollowLinks === undefined ? {} : { dofollowLinks: parsed.data.dofollowLinks }),
      })
      .where(eq(publishers.id, params.id));
    return NextResponse.json({ ok: true });
  }

  // Suspendarea NU sterge nimic: plasarile publicate raman, banii datorati
  // raman de platit. Doar nu mai primeste articole noi.
  if (act === "suspend" || act === "reactivate") {
    await db
      .update(publishers)
      .set({
        status: act === "suspend" ? "suspended" : "approved",
        rejectionReason: act === "suspend" ? parsed.data.reason || null : null,
      })
      .where(eq(publishers.id, params.id));
    return NextResponse.json({ ok: true });
  }

  // Un link scurs se taie crescand versiunea; toate linkurile trimise pana
  // acum publicatiei devin invalide, fara tabel de sesiuni.
  if (act === "reset_token") {
    await db
      .update(publishers)
      .set({ tokenVersion: (p.tokenVersion ?? 0) + 1 })
      .where(eq(publishers.id, params.id));
    return NextResponse.json({ ok: true });
  }

  await db
    .update(publishers)
    .set({
      status: parsed.data.action === "approve" ? "approved" : "rejected",
      rejectionReason:
        parsed.data.action === "reject" ? parsed.data.reason || null : null,
      decidedAt: now,
    })
    .where(eq(publishers.id, params.id));

  if (parsed.data.action === "approve") {
    const html = wrapEmail(
      "Bine ai venit în rețeaua MediaExpres",
      `
      <p>Salut ${esc(p.contactName.split(" ")[0] || "")},</p>
      <p>Aplicația ta pentru <strong>${esc(p.siteName)}</strong> a fost aprobată.</p>
      ${
        p.pricePerArticle
          ? `<p>Îți plătim <strong>${p.pricePerArticle} lei pentru fiecare articol publicat</strong>.</p>`
          : "<p>Îți comunicăm tariful pe articol în cel mai scurt timp.</p>"
      }
      <p>Cum funcționează, pe scurt:</p>
      <ol>
        <li>Îți trimitem pe email articolul, gata scris, cu un link.</li>
        <li>Îl poți refuza în ${ZILE_REFUZ} zile lucrătoare, fără să explici de ce.</li>
        <li>Dacă îl accepți, îl publici în ${ZILE_PUBLICARE} zile lucrătoare și lipești adresa articolului în aceeași pagină.</li>
        <li>Articolul rămâne online ${LUNI_ONLINE} luni, cu linkurile neatinse.</li>
      </ol>
      <p>Decontarea se face când ajungi la 500 de lei sau la sfârșitul trimestrului, ce vine primul: îți trimitem situația articolelor, emiți factura pe ea, plătim în 10 zile lucrătoare.</p>
      <p>Nu ai nevoie de cont și de parolă — fiecare articol vine cu propriul link.</p>
      <p>Pentru orice întrebare, răspunde direct la acest email.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa ${SITE.name}</strong></p>
    `
    );
    await sendEmail({
      to: p.contactEmail,
      subject: `Aplicație aprobată — ${p.siteName}`,
      html,
    });
  } else {
    const html = wrapEmail(
      `Aplicație ${p.siteName}`,
      `
      <p>Salut ${p.contactName.split(" ")[0] || ""},</p>
      <p>Îți mulțumim pentru interesul față de rețeaua MediaExpres. Din păcate, momentan nu putem accepta aplicația pentru <strong>${p.siteName}</strong>.</p>
      ${parsed.data.reason ? `<p><strong>Motiv:</strong> ${parsed.data.reason.replace(/</g, "&lt;")}</p>` : ""}
      <p>Poți reveni cu o aplicație actualizată peste 3-6 luni.</p>
    `
    );
    await sendEmail({
      to: p.contactEmail,
      subject: `Aplicație — ${p.siteName}`,
      html,
    });
  }

  return NextResponse.json({ ok: true });
}
