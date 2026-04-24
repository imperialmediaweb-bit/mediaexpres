import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { articles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, wrapEmail, kv } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "publish"]),
  publishedUrls: z.array(z.string().url()).max(100).optional(),
  rejectionReason: z.string().max(1000).optional(),
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
  const d = parsed.data;

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, params.id))
    .limit(1);
  if (!article) {
    return NextResponse.json({ ok: false, error: "Articol inexistent" }, { status: 404 });
  }

  const [clientUser] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, article.userId))
    .limit(1);

  const patch: Partial<typeof articles.$inferInsert> = {};
  if (d.action === "approve") {
    patch.status = "submitted";
  } else if (d.action === "reject") {
    patch.status = "rejected";
  } else if (d.action === "publish") {
    if (!d.publishedUrls || d.publishedUrls.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Adaugă cel puțin un URL de publicare" },
        { status: 400 }
      );
    }
    patch.status = "published";
    patch.publishedUrls = JSON.stringify(d.publishedUrls);
    patch.publishedAt = new Date();
  }

  await db.update(articles).set(patch).where(eq(articles.id, params.id));

  if (clientUser?.email) {
    const first = (clientUser.name || "").split(" ")[0] || "";
    if (d.action === "publish") {
      const html = wrapEmail(
        "Articolul tău a fost publicat",
        `
        <p>Salut${first ? " " + first : ""},</p>
        <p>Articolul <strong>${article.title}</strong> a fost publicat pe rețeaua MediaExpres.</p>
        <p><strong>Link-uri publicate:</strong></p>
        <ul>${(d.publishedUrls || [])
          .map((u) => `<li><a href="${u}">${u}</a></li>`)
          .join("")}</ul>
        <p style="margin-top:16px;"><a href="${SITE.url}/cont/articole/${article.id}" style="background:#E4002B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Vezi in cont</a></p>
      `
      );
      await sendEmail({
        to: clientUser.email,
        subject: `Articolul tău "${article.title}" a fost publicat`,
        html,
      });
    } else if (d.action === "reject") {
      const html = wrapEmail(
        "Articolul necesită modificări",
        `
        <p>Salut${first ? " " + first : ""},</p>
        <p>Articolul <strong>${article.title}</strong> nu poate fi publicat in forma curenta.</p>
        <table style="width:100%;border-collapse:collapse;">${kv(
          "Motiv",
          d.rejectionReason || "Contactează-ne pe email pentru detalii."
        )}</table>
        <p>Răspunde la acest email ca să trimiți o variantă ajustată.</p>
      `
      );
      await sendEmail({
        to: clientUser.email,
        subject: `Articol respins: ${article.title}`,
        html,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
