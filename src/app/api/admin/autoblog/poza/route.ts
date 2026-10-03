import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { citesteSetariOferta, salveazaSetariOferta, urcaPozaOferta } from "@/lib/oferta-facebook";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

/** Poza pentru oferta zilnica pe Facebook: urcata din admin, copiata in Cloudinary. */
export async function POST(req: Request) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  const f = fd?.get("poza");
  if (!(f instanceof File)) return NextResponse.json({ ok: false, error: "Lipsește poza" }, { status: 400 });
  if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) return NextResponse.json({ ok: false, error: "Doar JPG, PNG sau WebP" }, { status: 400 });
  if (f.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Poza e peste 8MB" }, { status: 400 });
  const url = await urcaPozaOferta(Buffer.from(await f.arrayBuffer()), f.type);
  if (!url) return NextResponse.json({ ok: false, error: "Nu am putut copia poza în Cloudinary (lipsesc cheile?)" }, { status: 502 });
  const s = await citesteSetariOferta();
  if (s.poze.length >= 10) return NextResponse.json({ ok: false, error: "Maxim 10 poze" }, { status: 400 });
  await salveazaSetariOferta({ ...s, poze: [...s.poze, url] });
  return NextResponse.json({ ok: true, url });
}
