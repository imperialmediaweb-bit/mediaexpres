import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { stareLinkedIn, posteazaUrmatorulPeLinkedIn, posteazaOfertaPeLinkedIn } from "@/lib/linkedin";
import { posturiPublicate } from "@/lib/autoblog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET = starea; POST ?slug=... sau ?oferta=1 = posteaza acum (proba). */
export async function GET(req: NextRequest) {
  if (!getSession() && verifyExtensionKey(req)) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await stareLinkedIn()) });
}

export async function POST(req: NextRequest) {
  if (!getSession() && verifyExtensionKey(req)) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  if (req.nextUrl.searchParams.get("oferta") === "1") return NextResponse.json({ ok: true, ...(await posteazaOfertaPeLinkedIn({ fortat: true })) });
  const slug = req.nextUrl.searchParams.get("slug") || undefined;
  const posturi = await posturiPublicate(200);
  const r = await posteazaUrmatorulPeLinkedIn(posturi, { fortat: true, slug });
  return NextResponse.json({ ok: Boolean(r.postat), ...r });
}
