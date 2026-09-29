import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { placements } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaToken } from "@/lib/plasare-token";
import { mesajeleFirului, trimiteMesaj, LUNGIME_MAXIMA, type Expeditor } from "@/lib/mesaje-plasare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cine scrie, se decide DOAR din token (sau din sesiunea de admin), niciodata
 * din ce trimite browserul:
 *   - token „plasare"  -> partenerul, pe plasarea din token;
 *   - token „client"   -> clientul, pe o plasare din comanda lui;
 *   - fara token + admin logat -> noi.
 */
async function cine(t: string | null | undefined, p: string | null | undefined): Promise<{ rol: Expeditor; placementId: string } | null> {
  await ensurePlacementTables();
  if (t) {
    const tok = verificaToken(t);
    if (!tok) return null;
    if (tok.scope === "plasare") {
      const [pl] = await db.select().from(placements).where(eq(placements.id, tok.id)).limit(1);
      if (!pl || (pl.tokenVersion ?? 0) !== tok.v) return null;
      return { rol: "partener", placementId: pl.id };
    }
    if (tok.scope === "client" && p) {
      const [pl] = await db.select().from(placements).where(eq(placements.id, p)).limit(1);
      if (!pl || pl.orderSubmissionId !== tok.id) return null;
      return { rol: "client", placementId: pl.id };
    }
    return null;
  }
  if (p && getSession()) return { rol: "admin", placementId: p };
  return null;
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams;
  const c = await cine(u.get("t"), u.get("p"));
  if (!c) return NextResponse.json({ ok: false, error: "Link expirat sau invalid." }, { status: 403 });
  return NextResponse.json({ ok: true, rol: c.rol, mesaje: await mesajeleFirului(c.placementId, c.rol) });
}

const schema = z.object({
  t: z.string().max(500).optional(),
  p: z.string().max(100).optional(),
  text: z.string().min(1).max(LUNGIME_MAXIMA),
});

export async function POST(req: NextRequest) {
  let d: z.infer<typeof schema>;
  try {
    d = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: `Mesajul trebuie să aibă între 1 și ${LUNGIME_MAXIMA} de caractere.` }, { status: 400 });
  }
  const c = await cine(d.t, d.p);
  if (!c) return NextResponse.json({ ok: false, error: "Link expirat sau invalid." }, { status: 403 });

  const r = await trimiteMesaj({ placementId: c.placementId, sender: c.rol, text: d.text });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, mesaj: r.mesaj });
}
