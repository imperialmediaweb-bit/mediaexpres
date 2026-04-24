import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, subscriptions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getEntitlements } from "@/lib/entitlements";

export const runtime = "nodejs";

const articleSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().max(20000).optional().or(z.literal("")),
  existingUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  aiGenerated: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
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
  const parsed = articleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const ent = await getEntitlements(session.user.id);
  if (!ent.hasPaid) {
    return NextResponse.json(
      { ok: false, error: "Nu ai nicio plata activa. Alege un pachet sau un abonament." },
      { status: 403 }
    );
  }

  if (ent.hasActiveSubscription && ent.activeSubscription) {
    if (ent.activeSubscription.articlesRemaining <= 0) {
      return NextResponse.json(
        { ok: false, error: "Ai folosit toate articolele incluse in abonament pentru luna aceasta." },
        { status: 403 }
      );
    }
    const updated = await db
      .update(subscriptions)
      .set({
        articlesRemaining: sql`${subscriptions.articlesRemaining} - 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.id, ent.activeSubscription.id),
          sql`${subscriptions.articlesRemaining} > 0`
        )
      )
      .returning({ id: subscriptions.id });

    if (updated.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nu mai ai articole disponibile. Reincearca saptamana viitoare." },
        { status: 403 }
      );
    }
  }

  const id = crypto.randomUUID();
  await db.insert(articles).values({
    id,
    userId: session.user.id,
    subscriptionId: ent.activeSubscription?.id || null,
    title: data.title,
    body: data.body || null,
    existingUrl: data.existingUrl || null,
    notes: data.notes || null,
    aiGenerated: !!data.aiGenerated,
    status: "draft",
  });

  return NextResponse.json({ ok: true, id });
}
