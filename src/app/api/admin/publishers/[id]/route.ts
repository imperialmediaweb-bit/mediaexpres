import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, wrapEmail } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(1000).optional(),
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
      <p>Salut ${p.contactName.split(" ")[0] || ""},</p>
      <p>Aplicația ta pentru <strong>${p.siteName}</strong> a fost aprobată. Te vom contacta în curând cu pașii de integrare:</p>
      <ol>
        <li>Primele articole test (2-3) pentru a valida procesul de publicare.</li>
        <li>Stabilim tariful per articol și modalitatea de plată.</li>
        <li>Te adăugăm oficial în rețeaua de distribuție.</li>
      </ol>
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
