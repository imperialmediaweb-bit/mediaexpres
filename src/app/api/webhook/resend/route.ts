import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { isSuppressed } from "@/data/suppression-list";
import { ADMIN_EMAIL, sendEmail, wrapEmail, kv } from "@/lib/email";

export const runtime = "nodejs";

// Resend folosește Svix pentru livrarea webhook-urilor.
// Semnătura: HMAC-SHA256 pe "{svix-id}.{svix-timestamp}.{body}" cu secretul decodat din "whsec_..."
function verifySignature(body: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;

  const msgId = headers.get("svix-id") ?? "";
  const msgTimestamp = headers.get("svix-timestamp") ?? "";
  const msgSignature = headers.get("svix-signature") ?? "";

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Reject requests older than 5 minutes (replay protection)
  const ts = parseInt(msgTimestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // Decode the base64 secret (strip the "whsec_" prefix)
  const rawSecret = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "base64");

  const signed = `${msgId}.${msgTimestamp}.${body}`;
  const computed = createHmac("sha256", rawSecret).update(signed).digest("base64");
  const computedBuf = Buffer.from(computed);

  // svix-signature can be "v1,{base64} v1,{base64}" — check each
  for (const part of msgSignature.split(" ")) {
    const [, sig] = part.split(",");
    if (!sig) continue;
    try {
      const sigBuf = Buffer.from(sig, "base64");
      if (sigBuf.length === computedBuf.length && timingSafeEqual(sigBuf, computedBuf)) {
        return true;
      }
    } catch {
      // invalid base64, skip
    }
  }
  return false;
}

function extractProspectId(tags?: Array<{ name: string; value: string }>): string | null {
  if (!tags) return null;
  return tags.find((t) => t.name === "prospect_id")?.value ?? null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    type: string;
    data: {
      email_id?: string;
      to?: string[];
      tags?: Array<{ name: string; value: string }>;
      bounce?: { message?: string };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prospectId = extractProspectId(event.data?.tags);

  switch (event.type) {
    case "email.opened": {
      if (!prospectId) break;
      await db
        .update(prospects)
        .set({
          openCount: sql`COALESCE(open_count, 0) + 1`,
          status: sql`CASE WHEN status IN ('new', 'contacted') THEN 'opened' ELSE status END`,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, prospectId));
      break;
    }

    case "email.clicked": {
      if (!prospectId) break;
      await db
        .update(prospects)
        .set({
          clickCount: sql`COALESCE(click_count, 0) + 1`,
          clickedCta: true,
          status: sql`CASE WHEN status NOT IN ('converted', 'replied', 'interested') THEN 'interested' ELSE status END`,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, prospectId));
      break;
    }

    case "email.bounced": {
      if (!prospectId) break;
      await db
        .update(prospects)
        .set({ status: "bounced", updatedAt: new Date() })
        .where(eq(prospects.id, prospectId));
      break;
    }

    case "email.complained": {
      // Spam complaint — marchăm ca declined + adăugăm în suppression runtime
      if (!prospectId) break;
      const [prospect] = await db
        .select({ email: prospects.email })
        .from(prospects)
        .where(eq(prospects.id, prospectId))
        .limit(1);
      if (prospect) {
        isSuppressed(prospect.email); // just access; suppression-list is static for now
      }
      await db
        .update(prospects)
        .set({ status: "declined", updatedAt: new Date() })
        .where(eq(prospects.id, prospectId));
      break;
    }

    case "inbound.email": {
      // Răspuns email de la prospect — detectăm STOP sau interes
      const fromEmails: string[] = (event.data as unknown as { from?: string[] })?.from ?? [];
      const body: string = (event.data as unknown as { text?: string })?.text ?? "";
      const bodyLower = body.toLowerCase();

      const isStop = /\bstop\b|unsubscribe|dezabonare|nu mai vreau/i.test(bodyLower);
      const isInterested = /\bda\b|interesat|trimite|vreau|cum functioneaza|oferta/i.test(bodyLower);

      // Găsim prospectul după adresa de email a expeditorului
      let targetProspect: { id: string; companyName: string } | undefined;
      for (const emailAddr of fromEmails) {
        const [found] = await db
          .select({ id: prospects.id, companyName: prospects.companyName })
          .from(prospects)
          .where(eq(prospects.email, emailAddr))
          .limit(1);
        if (found) {
          targetProspect = found;
          break;
        }
      }

      if (!targetProspect) break;

      if (isStop) {
        await db
          .update(prospects)
          .set({ status: "declined", updatedAt: new Date() })
          .where(eq(prospects.id, targetProspect.id));
      } else if (isInterested) {
        await db
          .update(prospects)
          .set({ status: "replied", updatedAt: new Date() })
          .where(eq(prospects.id, targetProspect.id));

        // Notificare admin
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `🔥 Răspuns interesat: ${targetProspect.companyName}`,
          html: wrapEmail(
            `Prospect interesat: ${targetProspect.companyName}`,
            `<table style="width:100%;border-collapse:collapse;">
              ${kv("Firmă", targetProspect.companyName)}
              ${kv("Răspuns", body.slice(0, 500))}
              ${kv("Link admin", `https://mediaexpress.ro/admin/prospecti/${targetProspect.id}`)}
            </table>`
          ),
        });
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
