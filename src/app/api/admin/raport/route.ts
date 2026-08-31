import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publicationReports, users } from "@/db/schema";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { pingIndexNow } from "@/lib/indexnow";
import { buildReportPdf, buildReportXlsx } from "@/lib/report-files";
import { submitToGoogle } from "@/lib/google-indexing";

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
  const invoice = form.get("invoice");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Emailul clientului nu e valid" }, { status: 400 });
  }

  // Accepta doua formate in aceeasi caseta:
  //   1. doar linkuri, unul pe rand
  //   2. titlu pe un rand, linkul pe randul urmator (cum le da campania)
  // Titlul e pastrat: cand fiecare publicatie are alt titlu, raportul devine
  // dovada vizibila ca articolele sunt unice, nu copii.
  const rawLines = linksRaw.split(/\r?\n/).map((l) => l.trim());
  const entries: { url: string; title?: string }[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!/^https?:\/\/\S+$/i.test(line)) continue;
    const prev = rawLines[i - 1] || "";
    const title =
      prev && !/^https?:\/\//i.test(prev) && prev.length <= 300 ? prev : undefined;
    entries.push(title ? { url: line, title } : { url: line });
  }
  const links = entries.map((e) => e.url);

  const hasFile = file instanceof File && file.size > 0;
  const hasInvoice = invoice instanceof File && invoice.size > 0;

  if (links.length === 0 && !hasFile) {
    return NextResponse.json(
      { ok: false, error: "Pune linkurile (unul pe linie) sau atașează fișierul Excel" },
      { status: 400 },
    );
  }

  const attachments: { filename: string; content: string }[] = [];

  // Factura, in acelasi email cu raportul. Pana acum raportul pleca de aici,
  // iar factura din alta pagina (sau din Gmail, de pe telefon) — doua drumuri
  // pentru o singura comanda. Clientul primeste acum tot ce ii datoram
  // intr-un singur mesaj: dovada publicarii si documentul contabil.
  if (hasInvoice) {
    const f = invoice as File;
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "Factura depășește 10MB" }, { status: 400 });
    }
    if (f.type && f.type !== "application/pdf") {
      return NextResponse.json({ ok: false, error: "Factura trebuie să fie PDF" }, { status: 400 });
    }
    const buf = Buffer.from(await f.arrayBuffer());
    attachments.push({
      filename: f.name || "factura.pdf",
      content: buf.toString("base64"),
    });
  }

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
    attachments.push({
      filename: f.name || "raport-publicare.xlsx",
      content: buf.toString("base64"),
    });
  }

  // Raportul in PDF si Excel se genereaza SINGUR din linkuri — nimeni nu mai
  // are de construit fisiere de mana pentru fiecare comanda. Acelasi generator
  // ca la descarcarea din contul clientului, deci arata identic peste tot.
  if (entries.length > 0) {
    try {
      const args = {
        entries,
        clientName: clientName || null,
        articleTitle: articleTitle || null,
        date: new Date(),
        siteName: SITE.name,
        siteUrl: SITE.url,
      };
      attachments.push(
        {
          filename: "raport-publicare.pdf",
          content: buildReportPdf(args).toString("base64"),
        },
        {
          filename: "raport-publicare.xlsx",
          content: buildReportXlsx(args).toString("base64"),
        },
      );
    } catch (err) {
      // Emailul cu linkurile in corp e obligatia; fisierele sunt ambalajul.
      console.error("[raport] generarea fisierelor a esuat (emailul pleaca):", err);
    }
  }

  // Raportul se salveaza si in DB, ca sa apara permanent in contul clientului
  // (/cont/rapoarte). Emailul ramane canalul principal; contul e arhiva lui.
  try {
    await db.insert(publicationReports).values({
      email: email.toLowerCase(),
      clientName: clientName || null,
      articleTitle: articleTitle || null,
      // Salvam obiecte {url, title}. Rapoartele vechi au string[] simplu —
      // cititorii trateaza ambele forme.
      links: JSON.stringify(entries),
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

  // Articolele tocmai publicate sunt anuntate imediat la motoarele de cautare.
  // Fara asta, un articol nou astepta sa fie descoperit de crawler — zile sau
  // saptamani. Clientul plateste pentru backlinkuri care conteaza abia dupa
  // indexare, deci minutele astea sunt parte din produs, nu un moft.
  // Nu asteptam raspunsul si nu blocam nimic: indexarea e bonus, emailul e
  // obligatia.
  if (links.length > 0) {
    void Promise.all([
      pingIndexNow(links),
      submitToGoogle(links),
    ]).catch((err) => console.error("[raport] indexare esuata:", err));
  }

  const firstName = clientName.split(/\s+/)[0] || "";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const linksHtml = entries.length
    ? `<ol style="padding-left:20px;margin:16px 0;">${entries
        .map(
          (e) =>
            `<li style="margin:10px 0;">${
              e.title
                ? `<strong style="color:#111111;">${esc(e.title)}</strong><br/>`
                : ""
            }<a href="${esc(e.url)}" style="color:#c1121f;font-size:13px;">${esc(
              e.url.replace(/^https?:\/\//, ""),
            )}</a></li>`,
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
      ${entries.length || hasFile ? '<p>Găsești raportul complet și în fișierele atașate (PDF și Excel).</p>' : ""}
      ${hasInvoice ? '<p><strong>Factura fiscală</strong> este și ea atașată acestui email.</p>' : ""}
      <p style="margin-top:16px;color:#64748b;font-size:13px;">Articolele rămân online permanent, iar backlinkurile rămân active.</p>
      <p style="color:#64748b;font-size:13px;">Raportul rămâne salvat și în contul tău: intră pe <a href="${SITE.url}/cont/rapoarte" style="color:#c1121f;">mediaexpress.ro/cont</a> cu acest email (fără parolă — primești link de conectare).</p>
      ${/*
        Cererea de recenzie sta AICI, in emailul cu raportul, si nu intr-un
        mesaj separat de peste cateva zile: acum e momentul in care omul tocmai
        a deschis linkurile si a vazut ca totul e la locul lui. Peste trei zile
        entuziasmul e deja consumat, iar emailul pare cersit.
        Cerem un raspuns la email, nu o recenzie pe vreo platforma — asa nu-i
        dam nicio bataie de cap si primim un text pe care il putem folosi ca
        testimonial, cu acordul lui.
      */ ""}
      <div style="margin-top:24px;background:#f8f5f0;border-radius:10px;padding:16px;">
        <p style="margin:0 0 8px;font-weight:600;color:#111111;">Ne spui cum ți s-a părut?</p>
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
          Dacă ești mulțumit de rezultat, răspunde la acest email cu două-trei
          rânduri despre experiența ta. Ne ajută enorm — iar dacă ne dai voie,
          le publicăm pe site ca recomandare, cu numele firmei tale și link
          către ea.
        </p>
      </div>
      <p style="margin-top:24px;">Mulțumim pentru încredere!<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
    replyTo: ADMIN_EMAIL,
    attachments: attachments.length ? attachments : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Trimiterea a eșuat — verifică configurarea Resend" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, linksCount: links.length, attached: attachments.length, invoiceAttached: hasInvoice });
}
