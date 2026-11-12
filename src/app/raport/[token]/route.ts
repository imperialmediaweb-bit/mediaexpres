import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { idDinRaportToken } from "@/lib/raport-link";
import { RETEA_URL, campaniileDinRetea } from "@/lib/retea";
import { campaniaComenzii } from "@/lib/raport-retea";
import { SITE } from "@/data/site";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 12.11.2026 — raportul clientului pe mediaexpress.ro, de la comandă până la
 * final. Cât campania nu există încă în rețea: pașii comenzii, cu reîncărcare
 * singură. După ce există: același raport ca în rețea (ziarele, ora, linkurile,
 * postările de Facebook, captura promovării), citit de acolo la fiecare
 * deschidere și servit aici, pe domeniul nostru. PDF/Excel trec tot pe aici.
 */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function text(msg: string, status: number) {
  return new NextResponse(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" } });
}

async function proxy(netToken: string, tokenAici: string, qs: string): Promise<NextResponse | null> {
  const res = await fetch(`${RETEA_URL}/raport/${encodeURIComponent(netToken)}${qs ? `?${qs}` : ""}`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  const tip = res.headers.get("content-type") || "";
  if (!tip.includes("text/html")) {
    // Excel: trece neatins, cu numele fișierului.
    const h = new Headers({ "Content-Type": tip, "X-Robots-Tag": "noindex, nofollow" });
    const cd = res.headers.get("content-disposition");
    if (cd) h.set("Content-Disposition", cd);
    return new NextResponse(await res.arrayBuffer(), { headers: h });
  }
  // Adresele relative ale raportului (Excel) arată spre linkul nostru.
  const html = (await res.text()).split(`/raport/${netToken}`).join(`/raport/${tokenAici}`);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const id = idDinRaportToken(params.token);
  // Tokenul raportului din rețea (din e-mailul „campania e publicată"): același
  // raport, servit tot de aici.
  if (!id) {
    if (/^[A-Za-z0-9_-]{16,80}$/.test(params.token)) {
      const r = await proxy(params.token, params.token, req.nextUrl.searchParams.toString());
      if (r) return r;
    }
    return text("Raport inexistent.", 404);
  }

  const [c] = await db
    .select({
      ref: orderSubmissions.stripeSessionId,
      email: orderSubmissions.email,
      title: orderSubmissions.title,
      status: orderSubmissions.status,
      createdAt: orderSubmissions.createdAt,
      paymentMethod: orderSubmissions.paymentMethod,
    })
    .from(orderSubmissions)
    .where(eq(orderSubmissions.id, id))
    .limit(1);
  if (!c) return text("Raport inexistent.", 404);

  const toate = await campaniileDinRetea();
  const gasita = toate ? campaniaComenzii(c, toate) : null;
  const netToken = gasita?.rand.token ?? null;

  if (netToken) {
    const r = await proxy(netToken, params.token, req.nextUrl.searchParams.toString());
    if (r) return r;
    // Campanie fără niciun articol încă (sau rețeaua nu răspunde): pașii de mai jos.
  }

  const platit = c.status !== "pending_payment";
  const op = c.paymentMethod === "op" || c.ref.startsWith("op_");
  const pasi: Array<{ t: string; gata: boolean; nota?: string }> = [
    { t: "Comandă primită", gata: true, nota: c.createdAt.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "medium", timeStyle: "short" }) },
    { t: platit ? "Plată primită" : "Așteptăm plata", gata: platit, nota: platit ? undefined : op ? "Publicăm imediat ce vedem transferul (sau dovada pe WhatsApp)." : undefined },
    { t: "Articolul e la redacție", gata: platit && Boolean(netToken) },
    { t: "Publicare în ziare", gata: false, nota: "Fiecare ziar apare aici, cu data, ora și linkul, imediat ce articolul e live." },
  ];

  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="60">
<title>Raport publicare — MediaExpres</title>
<style>body{margin:0;background:#f6f7f9;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937}
.w{max-width:720px;margin:0 auto;padding:32px 16px}.k{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#E4002B}
h1{font-size:24px;margin:8px 0 24px}ol{list-style:none;padding:0;margin:0;display:grid;gap:10px}
li{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px}li.g{border-color:#bbf7d0;background:#f0fdf4}
li b{display:block}li span{font-size:13px;color:#6b7280}p.n{margin-top:24px;font-size:14px;color:#4b5563;background:#fff;border-radius:10px;padding:16px;border:1px solid #e5e7eb}</style></head>
<body><div class="w"><div class="k">Raport publicare · se actualizează singur</div>
<h1>${esc(c.title && c.title.trim() ? c.title : "Comanda ta MediaExpres")}</h1>
<ol>${pasi.map((p) => `<li class="${p.gata ? "g" : ""}"><b>${p.gata ? "✓" : "○"} ${esc(p.t)}</b>${p.nota ? `<span>${esc(p.nota)}</span>` : ""}</li>`).join("")}</ol>
<p class="n">Păstrează linkul: e permanent. Aici vezi în timp real fiecare ziar în care apare articolul, cu data, ora și linkul, apoi promovarea pe Facebook. Întrebări: WhatsApp ${esc(SITE.phone)}.</p>
</div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
}
