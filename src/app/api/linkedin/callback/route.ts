import { NextRequest, NextResponse } from "next/server";
import { finalizeazaConectarea } from "@/lib/linkedin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error_description") || req.nextUrl.searchParams.get("error");
  const pagina = (t: string, ok: boolean) =>
    new NextResponse(
      `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:40px;text-align:center"><h2 style="color:${ok ? "#0a7a2f" : "#b91c1c"}">${t}</h2><p><a href="/admin">Înapoi în admin</a></p></body>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  if (err) return pagina(`LinkedIn a refuzat: ${err.replace(/</g, "&lt;")}`, false);
  if (!code || !state || state !== req.cookies.get("li_state")?.value) return pagina("Link expirat. Deschide din nou /api/linkedin/connect.", false);
  const r = await finalizeazaConectarea(code);
  if (!r.ok) return pagina(`Conectarea a eșuat: ${(r.motiv || "").replace(/</g, "&lt;")}`, false);
  return pagina(`LinkedIn conectat${r.nume ? ` (${r.nume.replace(/</g, "&lt;")})` : ""}. Articolele pleacă automat, câte unul pe zi.`, true);
}
