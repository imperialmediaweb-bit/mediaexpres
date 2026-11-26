import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { gasesteComanda } from "@/lib/comanda-ref";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { analyzeProof } from "@/lib/analiza-dovada";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { trimitePushAdmin } from "@/lib/admin-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 26.11.2026 (owner: „sa urce dovada tot in aceeasi fereastra"): pe pagina
 * comenzii (/comanda/plata/<ref>), dupa plata prin OP, clientul urca dovada.
 * Se pune pe comanda, se citeste automat (suma, IBAN) si ne vine pe email + push.
 * Referinta comenzii e secretul (UUID), ca la pagina insasi.
 */
const hits = new Map<string, number[]>();
function limitat(ip: string) {
  const now = Date.now();
  const a = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  a.push(now);
  hits.set(ip, a);
  return a.length > 10;
}

const schema = z.object({
  ref: z.string().min(8).max(120),
  url: z.string().url().max(600).refine((u) => /^https:\/\/res\.cloudinary\.com\//.test(u), "adresă nepermisă"),
  name: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (limitat(ip)) return NextResponse.json({ ok: false, error: "Prea multe încercări. Trimiteți dovada pe WhatsApp." }, { status: 429 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  const row = await gasesteComanda(p.data.ref);
  if (!row) return NextResponse.json({ ok: false, error: "Nu găsim comanda. Trimiteți dovada pe WhatsApp." }, { status: 404 });
  const pkg = findPackageById(row.packageId);
  const pret = pkg ? (row.isCasino && pkg.id === "promo-50" ? 1000 : pkg.price) : 500;
  const analiza = await analyzeProof(p.data.url, pret);
  await db
    .update(orderSubmissions)
    .set({ paymentProof: JSON.stringify({ url: p.data.url, name: p.data.name || "dovada", analiza }) })
    .where(eq(orderSubmissions.id, row.id));
  const semn = analiza.potrivire === "da" ? "✅" : analiza.potrivire === "partial" ? "⚠️" : analiza.potrivire === "nu" ? "❌" : "❔";
  const admin = `${SITE.url}/admin/materiale/${row.id}`;
  await sendEmail({
    to: ADMIN_EMAIL,
    replyTo: row.email,
    subject: `${semn} Dovadă de plată urcată pe pagina comenzii — ${row.companyName || row.email} (${pret} lei)`,
    html: wrapEmail(
      "Dovadă de plată primită",
      `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
        ${kv("Potrivire", analiza.potrivire === "da" ? "DA — suma și beneficiarul corespund" : analiza.potrivire === "partial" ? "PARȚIAL — verifică" : analiza.potrivire === "nu" ? "NU pare o dovadă de plată" : "necitită automat")}
        ${kv("Sumă pe dovadă", analiza.suma || "—")}
        ${kv("Sumă așteptată", `${pret} lei`)}
        ${kv("Beneficiar", analiza.beneficiar || "—")}
        ${kv("Plătitor", analiza.platitor || "—")}
        ${kv("Observații", analiza.observatii)}
        ${kv("Firmă", row.companyName)}
        ${kv("Email", row.email)}
        ${kv("Telefon", row.contactPhone)}
      </table>
      <p><a href="${esc(p.data.url)}">Deschide dovada</a> · <a href="${admin}">Deschide comanda în admin</a></p>`,
    ),
  }).catch((e: unknown) => console.error("[comanda/dovada] email:", e));
  await trimitePushAdmin(`${semn} Dovadă de plată`, `${row.companyName || row.email} · ${pret} lei`, `/admin/materiale/${row.id}`).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
