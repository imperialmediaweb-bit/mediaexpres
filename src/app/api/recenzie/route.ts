import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { ensureReviewsTable } from "@/lib/ensure-columns";
import { verifyReviewToken } from "@/lib/review-token";
import { sendEmail, wrapEmail, ADMIN_EMAIL, escapeHtml } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

// Recenzia venita din pagina /recenzie/[token], deschisa din emailul cu
// raportul. Emailul NU vine din formular: il scoatem din token, ca sa nu poata
// cineva lasa recenzii in numele altui client.
const schema = z.object({
  token: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(10, "Scrieți vă rog cel puțin un rând.").max(2000),
  displayName: z.string().min(2, "Scrieți numele sau firma care să apară.").max(120),
  siteUrl: z.string().max(200).optional().or(z.literal("")),
  consentPublic: z.boolean(),
  // Honeypot. NU il validam cu `max(0)`: asa zod ar raspunde „String must
  // contain at most 0 character(s)", adica exact confirmarea de care are nevoie
  // un bot ca sa afle care camp l-a dat de gol. Il primim oricum si raspundem
  // „ok" mai jos, fara sa salvam nimic.
  website: z.string().max(200).optional(),
});

// 8, nu 3: numaram si incercarile respinse de validare, iar un om care
// greseste de doua ori formularul si apoi il trimite corect n-are voie sa
// ramana blocat tocmai cand voia sa ne laude.
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Prea multe încercări. Încercați peste un minut." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Botul completeaza campul ascuns; ii raspundem „ok" ca sa nu invete nimic.
  if (d.website) return NextResponse.json({ ok: true });

  const client = verifyReviewToken(d.token);
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Link expirat sau invalid. Răspundeți la emailul cu raportul." },
      { status: 400 },
    );
  }

  try {
    await ensureReviewsTable();
    await db.insert(reviews).values({
      email: client.email,
      displayName: d.displayName.trim(),
      rating: d.rating,
      quote: d.quote.trim(),
      siteUrl: d.siteUrl?.trim() || null,
      consentPublic: d.consentPublic,
      source: "form",
    });
  } catch (err) {
    // Recenzia e prea valoroasa ca s-o pierdem daca pica baza de date: mai jos
    // pleaca oricum emailul catre proprietar, cu tot textul.
    console.error("[recenzie] NU am putut salva in DB (continui pe email):", err);
  }

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Recenzie nouă — ${d.displayName.trim()} (${d.rating}/5)`,
    replyTo: client.email,
    html: wrapEmail(
      "Recenzie nouă",
      `<p><strong>${escapeHtml(d.displayName.trim())}</strong> — ${d.rating}/5</p>
       <blockquote style="margin:12px 0;padding:12px 16px;background:#f8f5f0;border-left:3px solid #c8102e;">
         ${escapeHtml(d.quote.trim()).replace(/\n/g, "<br>")}
       </blockquote>
       <p style="font-size:14px;color:#64748b;">Email: ${escapeHtml(client.email)}${
         d.siteUrl?.trim() ? ` · Site: ${escapeHtml(d.siteUrl.trim())}` : ""
       }</p>
       <p style="font-size:14px;color:${d.consentPublic ? "#166534" : "#b91c1c"};">
         ${
           d.consentPublic
             ? "A bifat că o putem folosi public pe site."
             : "NU a dat acordul pentru publicare — nu o pune pe site."
         }
       </p>
       <p style="font-size:14px;color:#64748b;">O vezi și în admin, la ${SITE.url}/admin/recenzii</p>`,
    ),
  });

  return NextResponse.json({ ok: true });
}
