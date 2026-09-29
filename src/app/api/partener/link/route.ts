import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { semneazaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, escapeHtml as esc } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email().max(200) });

/**
 * Intrarea in contul partenerului: scrie emailul, primeste linkul.
 *
 * 29.09.2026 — fara parola, acelasi tipar ca la plasari (plasare-token.ts,
 * scope „panou", 400 de zile). Raspunsul e ACELASI oricare ar fi emailul:
 * pagina nu are voie sa spuna cine e partener si cine nu.
 *
 * Plafon in memorie: 5 cereri pe ora de pe acelasi IP, ca formularul sa nu
 * devina o masina de trimis emailuri catre adresele altora.
 */
const incercari = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "necunoscut";
  const acum = Date.now();
  const recente = (incercari.get(ip) || []).filter((t) => acum - t < 60 * 60 * 1000);
  if (recente.length >= 5) {
    return NextResponse.json(
      { ok: false, error: "Prea multe încercări. Încearcă din nou peste o oră." },
      { status: 429 },
    );
  }
  incercari.set(ip, [...recente, acum]);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Adresă de email invalidă." }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  await ensureOrderColumns();
  const gasite = await db
    .select()
    .from(publishers)
    .where(and(sql`lower(${publishers.contactEmail}) = ${email}`, inArray(publishers.status, ["approved", "suspended"])));

  // Un email poate avea mai multe publicatii: primeste cate un link pentru fiecare.
  if (gasite.length > 0) {
    const randuri = gasite
      .map((p) => {
        const link = `${SITE.url}/cont-partener/${semneazaToken({ scope: "panou", id: p.id, v: p.tokenVersion ?? 0 })}`;
        return `<p style="margin:14px 0;"><a href="${link}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Intră în contul ${esc(p.siteName)}</a></p>`;
      })
      .join("");
    await sendEmail({
      to: email,
      subject: `Contul tău de partener — ${SITE.name}`,
      html: wrapEmail(
        "Contul tău de partener",
        `<p>Salut,</p>
         <p>Aici vezi articolele primite de la noi, cât ai de încasat și cererile de plată.</p>
         ${randuri}
         <p style="color:#64748b;font-size:13px;">Linkul e personal și e valabil un an. Nu-l trimite mai departe. Dacă nu tu ai cerut emailul, îl poți ignora.</p>`,
      ),
    }).catch((e) => console.error("[partener/link] email:", e));
  }

  return NextResponse.json({ ok: true });
}
