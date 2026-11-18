import { NextRequest, NextResponse } from "next/server";
import { cronAutorizat } from "@/lib/cron-auth";
import { COUNTIES } from "@/data/counties";
import { SITE } from "@/data/site";
import { pingIndexNow } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 18.11.2026 — o data pe saptamana (luni) anuntam la IndexNow (Bing, Yandex…)
 * ca paginile pe judet s-au schimbat (au stirile noi din ziarul local).
 * Planificatorul o cheama zilnic; in celelalte zile nu face nimic.
 */
export async function POST(req: NextRequest) {
  if (!cronAutorizat(req.headers)) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  const fortat = req.nextUrl.searchParams.get("acum") === "1";
  if (!fortat && new Date().getUTCDay() !== 1) {
    return NextResponse.json({ ok: true, sarit: "nu e luni" });
  }
  const base = SITE.url.replace(/\/$/, "");
  const urls = COUNTIES.map((c) => `${base}/publicare-comunicat-${c.slug}`);
  const r = await pingIndexNow(urls);
  return NextResponse.json({ ok: true, pagini: urls.length, indexnow: r });
}
