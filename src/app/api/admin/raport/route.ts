import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publicationReports, users } from "@/db/schema";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

/**
 * Trimite clientului raportul de publicare: lista de linkuri in corpul
 * emailului + fisierul Excel al adminului atasat (optional).
 * Form-data pentru ca vine cu fisier; protejat de sesiunea de admin.
 */
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Formular invalid" }, { status: 400 });
  }

  const email = String(form.get("email") || "").trim();
  const clientName = String(form.get("clientName") || "").trim();
  const articleTitle = String(form.get("articleTitle") || "").trim();
  const linksRaw = String(form.get("links") || "");
  const file = form.get("file");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Emailul clientului nu e valid" }, { status: 400 });
  }

  const links = linksRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\/\S+$/i.test(l));

  const hasFile = file instanceof File && file.size > 0;

  if (links.length === 0 && !hasFile) {
    return NextResponse.json(
      { ok: false, error: "Pune linkurile (unul pe linie) sau atașează fișierul Excel" },
      { status: 400 },
    );
  }

  let attachments: { filename: string; content: string }[] | undefined;
  if (hasFile) {
    const f = file as File;
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "Fișierul depășește 10MB" }, { status: 400 });
    }
    if (f.type && !XLSX_TYPES.includes(f.type)) {
      return NextResponse.json(
        { ok: false, error: "Atașează un fișier Excel (.xlsx) sau CSV" },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await f.arrayBuffer());
    attachments = [
      {
        filename: f.name || "raport-publicare.xlsx",
        content: buf.toString("base64"),
      },
    ];
  }

  // Raportul se salveaza si in DB, ca sa apara permanent in contul clientului
  // (/cont/rapoarte). Emailul ramane canalul principal; contul e arhiva lui.
  try {
    await db.insert(publicationReports).values({
      email: email.toLowerCase(),
      clientName: clientName || null,
      articleTitle: articleTitle || null,
      links: JSON.stringify(links),
    });
    // Clientul fara cont primeste unul implicit (login cu magic link pe email).
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (!existing) {
      await db.insert(users).values({ email: email.toLowerCase(), name: clientName || null });
    }
  } catch (err) {
    console.error("[raport] nu am putut salva raportul in DB (email pleaca oricum):", err);
  }

  const firstName = clientName.split(/\s+/)[0] || "";
  const linksHtml = links.length
    ? `<ol style="padding-left:20px;margin:16px 0;">${links
        .map(
          (l) =>
            `<li style="margin:6px 0;"><a href="${l}" style="color:#0B1F3A;">${l.replace(/^https?:\/\//, "")}</a></li>`,
        )
        .join("")}</ol>`
    : "";

  const result = await sendEmail({
    to: email,
    subject: articleTitle
      ? `Raport publicare — „${articleTitle}"`
      : "Raport publicare — articolul tău e live",
    html: wrapEmail(
      "Articolul tău e publicat 🎉",
      `
      <p>Salut${firstName ? " " + firstName : ""},</p>
      <p>${
        articleTitle
          ? `Articolul <strong>„${articleTitle}"</strong> este acum live`
          : "Articolul tău este acum live"
      } în <strong>${links.length || 50} de publicații</strong> din rețeaua MediaExpres.</p>
      ${links.length ? `<p>Linkurile, ca să le verifici pe fiecare:</p>${linksHtml}` : ""}
      ${hasFile ? '<p>Găsești lista completă și în fișierul atașat.</p>' : ""}
      <p style="margin-top:16px;color:#64748b;font-size:13px;">Articolele rămân online permanent, iar backlinkurile rămân active.</p>
      <p style="color:#64748b;font-size:13px;">Raportul rămâne salvat și în contul tău: intră pe <a href="${SITE.url}/cont/rapoarte" style="color:#c1121f;">mediaexpress.ro/cont</a> cu acest email (fără parolă — primești link de conectare).</p>
      <p style="margin-top:24px;">Mulțumim pentru încredere!<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
    replyTo: ADMIN_EMAIL,
    attachments,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Trimiterea a eșuat — verifică configurarea Resend" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, linksCount: links.length, attached: hasFile });
}
