import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Lipseste RESEND_API_KEY" }, { status: 500 });
  }

  // Fetch emailuri din Resend — listam ultimele 100
  let allEmails: ResendEmailSummary[] = [];
  try {
    const res = await fetch("https://api.resend.com/emails?limit=100", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: `Resend API error: ${err}` }, { status: 500 });
    }
    const data = await res.json();
    allEmails = data.data || [];
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Fetch failed: ${String(err)}` }, { status: 500 });
  }

  const matching = allEmails.filter((e) => e.subject?.includes("[FB Lead]"));

  if (matching.length === 0) {
    return NextResponse.json({ ok: true, found: 0, imported: 0, message: "Nu s-au gasit emailuri [FB Lead] in Resend." });
  }

  const imported: string[] = [];
  const errors: string[] = [];

  for (const email of matching) {
    try {
      // Ia detalii complete pentru reply_to
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
        const filtered = matches.filter((e) => !e.toLowerCase().includes("mediaexpress") && !e.toLowerCase().includes("resend"));
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
  });
}
