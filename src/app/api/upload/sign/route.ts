import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, uploads } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { signUploadParams, getCloudinaryConfig } from "@/lib/cloudinary";

export const runtime = "nodejs";

const signSchema = z.object({
  articleId: z.string().min(1),
});

const MAX_PER_ARTICLE = 3;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  const cfg = getCloudinaryConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "Cloudinary nu este configurat" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }
  const { articleId } = parsed.data;

  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, session.user.id)))
    .limit(1);
  if (!article) {
    return NextResponse.json({ ok: false, error: "Articol inexistent" }, { status: 404 });
  }

  const existing = await db
    .select({ id: uploads.id })
    .from(uploads)
    .where(eq(uploads.articleId, articleId));
  if (existing.length >= MAX_PER_ARTICLE) {
    return NextResponse.json(
      { ok: false, error: `Limita maxima: ${MAX_PER_ARTICLE} poze per articol` },
      { status: 400 }
    );
  }

  const folder = `${cfg.uploadFolder}/u_${session.user.id}/a_${articleId}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = signUploadParams({ timestamp, folder });
  if (!signed) {
    return NextResponse.json({ ok: false, error: "Cloudinary nu este configurat" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp,
    folder,
    signature: signed.signature,
  });
}
