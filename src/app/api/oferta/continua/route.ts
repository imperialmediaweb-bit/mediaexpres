import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendEmail, wrapEmail, bankTransferEmailBox, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

/**
 * Puntea intre telefon si birou.
 *
 * Tiparul real al clientului B2B: vede reclama pe telefon, se convinge, dar
 * plata prin OP o face contabilitatea, de pe calculatorul firmei. Intre cele
 * doua momente, drumul se pierdea — omul "renunta" desi voia sa cumpere.
 *
 * Cand apasa "Ordin de plata" cu emailul completat, ii trimitem pe loc tot
 * ce-i trebuie ca sa termine de oriunde: pretul, datele bancare si linkul
 * care il duce exact unde a ramas, cu emailul precompletat. Renuntarea de pe
 * telefon primeste un drum inapoi in inbox.
 */

const schema = z.object({
  email: z.string().email().max(200),
  packageId: z.string().min(1).max(64),
});

// Anti-abuz, in memorie: acelasi email nu primeste emailul asta de doua ori
// pe zi, iar un IP nu poate declansa un val. Se goleste la redeploy — suficient
// pentru un endpoint care doar trimite un email util.
const sentTo = new Map<string, number>();
const perIp = new Map<string, number[]>();
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const pkg = findPackageById(parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: "Pachet inexistent" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (perIp.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  perIp.set(ip, recent);
  if (recent.length > 10) {
    return NextResponse.json({ ok: false, error: "Prea multe cereri" }, { status: 429 });
  }
  const last = sentTo.get(email);
  if (last && now - last < DAY_MS) {
    // Deja trimis azi — raspundem ok ca butonul sa nu arate vreo eroare.
    return NextResponse.json({ ok: true, deja: true });
  }
  sentTo.set(email, now);

  // Lead-ul se salveaza ca la /api/checkout: cine a ajuns pana aici e cel mai
  // fierbinte contact posibil, chiar daca nu termina azi.
  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!existing) await db.insert(users).values({ email });
  } catch (err) {
    console.error("[oferta/continua] lead nesalvat (emailul pleaca oricum):", err);
  }

  const linkContinuare = `${SITE.url}/comanda/transfer?pachet=${encodeURIComponent(
    pkg.id,
  )}&email=${encodeURIComponent(email)}`;

  const result = await sendEmail({
    to: email,
    subject: `Comanda ta e pregătită — ${pkg.price} lei, finalizezi când vrei`,
    html: wrapEmail(
      "Totul e pregătit — continui când îți convine",
      `
      <p>Salut,</p>
      <p>Ai început comanda pentru <strong>${pkg.name}</strong> — articolul tău publicat în
      cele 50 de ziare din rețea, cu raport complet și factură fiscală, pentru
      <strong>${pkg.price} lei</strong>.</p>
      <p style="margin:24px 0;text-align:center;">
        <a href="${linkContinuare}" style="display:inline-block;background:#c1121f;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Continuă comanda de unde ai rămas →</a>
      </p>
      <p style="color:#64748b;font-size:13px;text-align:center;">Linkul deschide formularul cu emailul deja completat — 2 minute și ai terminat. Nu trebuie să fi plătit ca să comanzi: îți emitem factura și plătești pe baza ei.</p>
      ${bankTransferEmailBox(`${pkg.price} lei`, `${pkg.name}`)}
      <p>Ai o întrebare înainte? Răspunde la acest email sau scrie-ne pe WhatsApp la
      <strong>${SITE.phone}</strong> — răspundem repede.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
    replyTo: ADMIN_EMAIL,
  });

  if (!result.ok) {
    console.error("[oferta/continua] emailul nu a plecat:", result.error);
  }
  return NextResponse.json({ ok: true });
}
