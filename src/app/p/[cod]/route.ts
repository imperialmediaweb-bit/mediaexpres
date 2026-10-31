import { NextRequest, NextResponse } from "next/server";
import { clickAfiliat } from "@/lib/afiliati";
import { SITE } from "@/data/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Linkul unui partener (lib/afiliati.ts): numara clickul si trimite omul la
 * oferta cu UTM-ul partenerului, pe care sistemul de surse il retine 90 de zile.
 * Un cod gresit duce tot la oferta, doar fara partener.
 */
export async function GET(_req: NextRequest, { params }: { params: { cod: string } }) {
  const cod = (params.cod || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const afiliat = cod ? await clickAfiliat(cod).catch(() => null) : null;
  const url = new URL("/oferta-500", SITE.url);
  if (afiliat) {
    url.searchParams.set("utm_source", "partener");
    url.searchParams.set("utm_medium", "afiliat");
    url.searchParams.set("utm_campaign", afiliat.cod);
  }
  return NextResponse.redirect(url, 302);
}
