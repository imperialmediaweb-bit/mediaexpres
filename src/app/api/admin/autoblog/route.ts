import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  adaugaCuvinte,
  posteazaPeFacebook,
  publicaUrmatorul,
  RITMURI_BLOG,
  salveazaSetariAutoblog,
  stergeCuvant,
  stergePost,
} from "@/lib/autoblog";
import { citesteSetariOferta, parseazaTexte, posteazaOferta, salveazaSetariOferta } from "@/lib/oferta-facebook";

export const runtime = "nodejs";
export const maxDuration = 120;

const Cerere = z.discriminatedUnion("actiune", [
  z.object({
    actiune: z.literal("setari"),
    activ: z.boolean(),
    ritm: z.enum(RITMURI_BLOG.map((r) => r.id) as [string, ...string[]]),
    facebook: z.boolean(),
  }),
  z.object({ actiune: z.literal("cuvinte"), text: z.string().min(1).max(20000) }),
  z.object({ actiune: z.literal("sterge-cuvant"), id: z.string().min(1) }),
  z.object({ actiune: z.literal("genereaza"), keywordId: z.string().min(1).optional() }),
  z.object({ actiune: z.literal("sterge-post"), id: z.string().min(1) }),
  z.object({ actiune: z.literal("facebook"), id: z.string().min(1) }),
  z.object({
    actiune: z.literal("oferta-setari"),
    activ: z.boolean(),
    ora: z.number().int().min(0).max(23),
    texte: z.string().max(20000),
  }),
  z.object({ actiune: z.literal("oferta-sterge-poza"), url: z.string().min(1) }),
  z.object({ actiune: z.literal("oferta-acum") }),
]);

/** Toate actiunile din /admin/autoblog, intr-un singur loc. */
export async function POST(req: Request) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  const parsed = Cerere.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Cerere invalidă" }, { status: 400 });
  const c = parsed.data;
  try {
    switch (c.actiune) {
      case "setari":
        await salveazaSetariAutoblog({ activ: c.activ, ritm: c.ritm as (typeof RITMURI_BLOG)[number]["id"], facebook: c.facebook });
        return NextResponse.json({ ok: true });
      case "cuvinte": {
        const n = await adaugaCuvinte(c.text);
        return NextResponse.json({ ok: true, adaugate: n });
      }
      case "sterge-cuvant":
        await stergeCuvant(c.id);
        return NextResponse.json({ ok: true });
      case "genereaza": {
        const r = await publicaUrmatorul({ fortat: true, keywordId: c.keywordId });
        return NextResponse.json({ ok: r.facut, ...r });
      }
      case "sterge-post":
        await stergePost(c.id);
        return NextResponse.json({ ok: true });
      case "facebook": {
        const r = await posteazaPeFacebook(c.id);
        return NextResponse.json({ ok: r.ok, error: r.motiv });
      }
      case "oferta-setari": {
        const s = await citesteSetariOferta();
        const texte = parseazaTexte(c.texte);
        await salveazaSetariOferta({ ...s, activ: c.activ, ora: c.ora, texte: texte.length ? texte : s.texte });
        return NextResponse.json({ ok: true, texte: texte.length });
      }
      case "oferta-sterge-poza": {
        const s = await citesteSetariOferta();
        await salveazaSetariOferta({ ...s, poze: s.poze.filter((p) => p !== c.url) });
        return NextResponse.json({ ok: true });
      }
      case "oferta-acum": {
        const r = await posteazaOferta({ fortat: true });
        return NextResponse.json({ ok: r.postat, error: r.postat ? undefined : r.motiv, id: r.postat ? r.id : undefined });
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/autoblog]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
