import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email";
import { buildListEmail, LIST_EMAIL_SUBJECT } from "@/lib/list-email";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(200),
  name: z.string().max(150).optional(),
});

/**
 * Trimite manual, dintr-un click in admin, emailul cu lista completa a
 * retelei — ACELASI sablon ca cel automat de la /api/request-list. Folosit
 * pentru lead-urile care au primit varianta veche (fara lista) sau care o cer
 * pe alt canal. Doar emailul cu lista — fara drip, ca sa nu dublam follow-upurile.
 */
export async function POST(req: NextRequest) {
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 },
    );
  }

  const firstName = (parsed.data.name || "").trim().split(/\s+/)[0] || "antreprenor";
  const result = await sendEmail({
    to: parsed.data.email,
    subject: LIST_EMAIL_SUBJECT,
    html: buildListEmail(firstName),
    replyTo: ADMIN_EMAIL,
  });

  if (!result.ok) {
    // Resend raspunde in engleza, cu texte de genul "Internal server error".
    // Afisat ca atare in admin nu spune nimic despre ce e de facut, asa ca
    // pastram detaliul in log si aratam un mesaj care indica cauza probabila.
    console.error("[send-list] Resend a refuzat trimiterea:", result.error);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Emailul nu a plecat. Verifică RESEND_API_KEY și FROM_EMAIL în Railway, " +
          "apoi încearcă din nou. Detaliul complet e în logurile serverului.",
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
