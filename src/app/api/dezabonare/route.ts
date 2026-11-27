import { NextRequest, NextResponse } from "next/server";
import { dezaboneaza, tokenValid } from "@/lib/dezabonare";
import { SITE } from "@/data/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dezabonare dintr-un clic: GET din link, POST din butonul Gmail/Outlook (List-Unsubscribe-Post). */
async function ruleaza(req: NextRequest) {
  const e = (req.nextUrl.searchParams.get("e") || "").trim().toLowerCase();
  const t = req.nextUrl.searchParams.get("t") || "";
  if (!e || !tokenValid(e, t)) return null;
  await dezaboneaza(e);
  return e;
}

export async function GET(req: NextRequest) {
  const e = await ruleaza(req);
  return NextResponse.redirect(`${SITE.url}/dezabonare?gata=${e ? "1" : "0"}`, 303);
}

export async function POST(req: NextRequest) {
  const e = await ruleaza(req);
  return NextResponse.json({ ok: Boolean(e) }, { status: e ? 200 : 400 });
}
