import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOrderToken } from "@/lib/order-token";
import { fetchSiteContext } from "@/lib/site-context";
import { generateAdvertorial } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  token: z.string().min(10),
  brief: z.string().min(20).max(4000),
  companyName: z.string().max(200).optional(),
  siteUrl: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
});

// Generarea costa bani per apel — limitam per token, nu per IP.
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const log = new Map<string, number[]>();

function limited(key: string): boolean {
  const now = Date.now();
  const recent = (log.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  log.set(key, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Descrie în câteva propoziții ce vrei să comunici." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const order = verifyOrderToken(data.token);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Link expirat sau invalid. Scrie-ne pe contact@mediaexpress.ro." },
      { status: 403 },
    );
  }

  if (limited(order.sessionId)) {
    return NextResponse.json(
      { ok: false, error: "Prea multe generări. Încearcă din nou în câteva minute." },
      { status: 429 },
    );
  }

  // Site-ul e optional: daca nu raspunde, scriem articolul doar din brief.
  const site = data.siteUrl ? await fetchSiteContext(data.siteUrl) : null;

  try {
    const article = await generateAdvertorial({
      brief: data.brief,
      companyName: data.companyName,
      siteUrl: site?.url || data.siteUrl,
      siteContext: site
        ? [site.title, site.description, site.text].filter(Boolean).join("\n")
        : undefined,
      city: data.city,
      isCasino: order.packageId.includes("cazino"),
    });

    return NextResponse.json({
      ok: true,
      article,
      siteRead: Boolean(site),
    });
  } catch (err) {
    console.error("[articol/generate] error:", err);
    return NextResponse.json(
      { ok: false, error: "Generarea a eșuat. Încearcă din nou sau scrie articolul manual." },
      { status: 500 },
    );
  }
}
