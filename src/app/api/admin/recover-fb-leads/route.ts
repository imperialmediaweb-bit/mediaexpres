import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ResendEmailSummary {
  id: string;
  subject: string;
  to: string[];
  from: string;
  created_at: string;
}

interface ResendEmailFull {
  id: string;
  subject: string;
  reply_to: string | string[] | null;
  html: string | null;
}

interface ResendListResponse {
  data: ResendEmailSummary[];
  // Resend uses cursor-based pagination; response field is "next" (not "next_cursor")
  next?: string;
}

async function fetchAllEmails(apiKey: string): Promise<ResendEmailSummary[]> {
  const all: ResendEmailSummary[] = [];
  let cursor: string | undefined;
  let pages = 0;
  const MAX_PAGES = 20; // max 2000 emailuri (20 × 100)

  while (pages < MAX_PAGES) {
    const url = cursor
      ? `https://api.resend.com/emails?limit=100&cursor=${encodeURIComponent(cursor)}`
      : "https://api.resend.com/emails?limit=100";

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend API error (page ${pages + 1}): ${err}`);
    }

    const data: ResendListResponse = await res.json();
    const batch = Array.isArray(data.data) ? data.data : [];
    all.push(...batch);
    pages++;

    // Dacă primim mai puțin de 100 sau nu există cursor de continuare, am ajuns la capăt
    if (batch.length < 100 || !data.next) break;
    cursor = data.next;
  }

  return all;
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Lipseste RESEND_API_KEY" }, { status: 500 });
  }

  let allEmails: ResendEmailSummary[] = [];
  try {
    allEmails = await fetchAllEmails(apiKey);
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Fetch failed: ${String(err)}` }, { status: 500 });
  }

  const matching = allEmails.filter((e) => e.subject?.includes("[FB Lead]"));

  // Primele 8 subiecte scanate — ajută la debug dacă [FB Lead] nu e găsit
  const sampleSubjects = allEmails.slice(0, 8).map((e) => e.subject || "(fără subiect)");

  if (matching.length === 0) {
    return NextResponse.json({
      ok: true,
      found: 0,
      imported: 0,
      importedList: [],
      errors: [],
      scanned: allEmails.length,
      sampleSubjects,
    });
  }

  const imported: string[] = [];
  const errors: string[] = [];

  for (const email of matching) {
    try {
      const fullRes = await fetch(`https://api.resend.com/emails/${email.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!fullRes.ok) {
        errors.push(`${email.subject}: raspuns Resend ${fullRes.status}`);
        continue;
      }
      const full: ResendEmailFull = await fullRes.json();

      // Extrage nume + telefon din subiect: "[FB Lead] Nume — Telefon"
      const match = email.subject.match(/\[FB Lead\]\s+(.+?)\s+[—\-–]\s+(.+)/);
      if (!match) {
        errors.push(`Subiect nerecunoscut: ${email.subject}`);
        continue;
      }
      const name = match[1].trim();
      const phone = match[2].trim();

      // Email din reply_to
      let leadEmail = "";
      if (full.reply_to) {
        leadEmail = Array.isArray(full.reply_to) ? (full.reply_to[0] ?? "") : full.reply_to;
        leadEmail = leadEmail.trim();
      }

      // Fallback: extrage email din HTML body
      if (!leadEmail && full.html) {
        const matches = full.html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
        const filtered = matches.filter(
          (e) =>
            !e.toLowerCase().includes("mediaexpress") &&
            !e.toLowerCase().includes("resend")
        );
        leadEmail = filtered[0] ?? "";
      }

      if (!leadEmail) {
        errors.push(`${name}: email negasit`);
        continue;
      }

      const existing = await db.select().from(users).where(eq(users.email, leadEmail)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({ email: leadEmail, name, phone });
        imported.push(`${name} (${leadEmail})`);
      } else {
        imported.push(`${name} (${leadEmail}) — deja exista, ignorat`);
      }
    } catch (err) {
      errors.push(`Eroare: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    found: matching.length,
    imported: imported.length,
    importedList: imported,
    errors,
    scanned: allEmails.length,
    sampleSubjects,
  });
}
