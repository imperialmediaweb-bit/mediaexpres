import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Semnalul de alarma cand unui client ii esueaza incarcarea unei poze.
 *
 * Fara asta, o incarcare refuzata de Cloudinary ramanea intre client si
 * browserul lui: un mesaj in engleza, aparut o clipa, pe care noi nu-l vedeam
 * niciodata. Asa au trecut trei clienti la rand fara sa reuseasca sa adauge
 * poze, iar noi am aflat de la ei, tarziu.
 *
 * Ruta nu incearca sa repare nimic — doar ne spune, imediat, ca s-a rupt ceva.
 */

const schema = z.object({
  message: z.string().max(500),
  fileName: z.string().max(300).optional(),
  fileSize: z.number().int().nonnegative().max(1_000_000_000).optional(),
  fileType: z.string().max(100).optional(),
  where: z.string().max(80),
});

// Un client blocat poate incerca de cateva ori la rand; ne trebuie primul
// semnal, nu douazeci de emailuri identice.
const WINDOW_MS = 600_000;
const MAX_PER_WINDOW = 3;
const seen = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (seen.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  seen.set(ip, recent);
  if (seen.size > 2000) {
    for (const [k, v] of seen) if (v.every((t) => now - t >= WINDOW_MS)) seen.delete(k);
  }
  // Raspundem mereu ok: e o baliza, nu o operatie de care depinde clientul.
  if (recent.length > MAX_PER_WINDOW) return NextResponse.json({ ok: true });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });
  const d = parsed.data;

  console.error("[upload-error]", d.where, d.message, d.fileName, d.fileSize);

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: "⚠️ Un client nu a putut încărca o poză",
    html: wrapEmail(
      "Încărcare de poză eșuată",
      `
      <p>Un client a încercat să adauge o poză și nu a reușit. Mesajul de mai jos e exact ce a văzut el pe ecran.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${kv("Unde", esc(d.where))}
        ${kv("Mesaj", esc(d.message))}
        ${kv("Fișier", esc(d.fileName || "—"))}
        ${kv("Mărime", d.fileSize ? `${(d.fileSize / 1024 / 1024).toFixed(2)} MB` : "—")}
        ${kv("Tip", esc(d.fileType || "—"))}
      </table>
      <p>Rulează diagnosticul ca să vezi dacă e o problemă generală de configurare: <a href="/api/admin/diagnostic-upload">/api/admin/diagnostic-upload</a> (trebuie să fii logat în admin).</p>
      `,
    ),
  }).catch((e) => console.error("[upload-error] alerta nu a plecat:", e));

  return NextResponse.json({ ok: true });
}
