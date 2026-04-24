import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, uploads } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.string().max(20000).optional().or(z.literal("")),
  existingUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  action: z.enum(["save", "submit"]).default("save"),
});

const uploadRegisterSchema = z.object({
  cloudinaryPublicId: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  bytes: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
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

  const [existing] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, params.id), eq(articles.userId, session.user.id)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Articol inexistent" }, { status: 404 });
  }

  const patch: Partial<typeof articles.$inferInsert> = {};
  if (d.title !== undefined) patch.title = d.title;
  if (d.body !== undefined) patch.body = d.body || null;
  if (d.existingUrl !== undefined) patch.existingUrl = d.existingUrl || null;
  if (d.notes !== undefined) patch.notes = d.notes || null;
  if (d.action === "submit" && existing.status === "draft") {
    patch.status = "submitted";
    patch.submittedAt = new Date();
  }

  if (Object.keys(patch).length > 0) {
    await db.update(articles).set(patch).where(eq(articles.id, params.id));
  }

  if (d.action === "submit" && existing.status === "draft") {
    const photos = await db
      .select()
      .from(uploads)
      .where(eq(uploads.articleId, params.id));

    const photosHtml = photos.length
      ? `<p><strong>${photos.length} poze atasate:</strong></p>
         <ul style="padding-left:20px;">${photos
           .map((p) => `<li><a href="${p.url}">${p.url}</a></li>`)
           .join("")}</ul>`
      : "<p>Fara poze atasate.</p>";

    const html = wrapEmail(
      "Articol trimis spre publicare",
      `
      <p>Un client a trimis un articol spre publicare.</p>
      <table style="width:100%;border-collapse:collapse;">
        ${kv("Client", session.user.email || "—")}
        ${kv("Titlu", d.title || existing.title)}
        ${kv("URL existent", d.existingUrl || existing.existingUrl || "—")}
        ${kv("AI generat", existing.aiGenerated ? "Da" : "Nu")}
      </table>
      <div style="margin-top:16px;padding:12px;background:#F8F5F0;border-radius:8px;">
        <strong>Text articol:</strong>
        <pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0;">${(d.body || existing.body || "—").replace(/</g, "&lt;")}</pre>
      </div>
      ${photosHtml}
      <p style="margin-top:16px;"><a href="${SITE.url}/admin/ziare">Panel admin</a></p>
    `
    );
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Articol] ${d.title || existing.title}`,
      html,
      replyTo: session.user.email || undefined,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = uploadRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }

  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, params.id), eq(articles.userId, session.user.id)))
    .limit(1);
  if (!article) {
    return NextResponse.json({ ok: false, error: "Articol inexistent" }, { status: 404 });
  }

  const existing = await db
    .select({ id: uploads.id })
    .from(uploads)
    .where(eq(uploads.articleId, params.id));
  if (existing.length >= 3) {
    return NextResponse.json({ ok: false, error: "Limita de 3 poze atinsa" }, { status: 400 });
  }

  const d = parsed.data;
  const id = crypto.randomUUID();
  await db.insert(uploads).values({
    id,
    articleId: params.id,
    userId: session.user.id,
    cloudinaryPublicId: d.cloudinaryPublicId,
    url: d.url,
    kind: "image",
    width: d.width ?? null,
    height: d.height ?? null,
    bytes: d.bytes ?? null,
  });
  return NextResponse.json({ ok: true, id });
}
