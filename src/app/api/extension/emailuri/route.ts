import { NextRequest, NextResponse } from "next/server";
import { verifyExtensionKey } from "@/lib/extension-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 03.11.2026 — „ce emailuri i-am trimis lui X?”. Cauta in Resend, doar citire,
 * dupa destinatar (sau dupa o bucata din subiect). Aceeasi cheie ca extensia
 * (X-Api-Key), ca asistentul sa poata raspunde fara cookie de admin.
 * Parcurge pana la 10 pagini de cate 100 (ultimele ~1.000 de emailuri).
 */
export async function GET(req: NextRequest) {
  const eroare = verifyExtensionKey(req);
  if (eroare) return eroare;
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "RESEND_API_KEY lipseste" }, { status: 500 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 3) return NextResponse.json({ ok: false, error: "q prea scurt" }, { status: 400 });

  type Email = { id: string; to: string[] | string; subject: string; created_at: string; last_event?: string };
  const gasite: Email[] = [];
  let cursor: string | null = null;
  for (let pagina = 0; pagina < 10; pagina++) {
    const url = `https://api.resend.com/emails?limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!res.ok) break;
    const j = (await res.json()) as { data?: Email[]; has_more?: boolean };
    const lista = j.data ?? [];
    for (const e of lista) {
      const to = (Array.isArray(e.to) ? e.to.join(",") : e.to || "").toLowerCase();
      if (to.includes(q) || (e.subject || "").toLowerCase().includes(q)) gasite.push(e);
    }
    if (!j.has_more || !lista.length) break;
    cursor = lista[lista.length - 1].id;
  }
  return NextResponse.json({
    ok: true,
    emailuri: gasite.map((e) => ({ id: e.id, catre: e.to, subiect: e.subject, data: e.created_at, stare: e.last_event ?? null })),
  });
}

/**
 * Anuleaza emailuri PROGRAMATE (cineva a cerut STOP inainte sa plece
 * follow-upurile). Primeste { ids: [...] }; Resend refuza singur ce a plecat deja.
 */
export async function POST(req: NextRequest) {
  const eroare = verifyExtensionKey(req);
  if (eroare) return eroare;
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "RESEND_API_KEY lipseste" }, { status: 500 });
  let ids: string[] = [];
  try {
    const j = (await req.json()) as { ids?: unknown };
    ids = Array.isArray(j.ids) ? j.ids.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const rezultate = [];
  for (const id of ids) {
    const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    rezultate.push({ id, ok: r.ok, status: r.status });
  }
  return NextResponse.json({ ok: true, rezultate });
}
