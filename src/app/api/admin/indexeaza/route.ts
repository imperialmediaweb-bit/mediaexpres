import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pingIndexNow, INDEXNOW_KEY } from "@/lib/indexnow";
import { submitToGoogle } from "@/lib/google-indexing";
import sitemap from "@/app/sitemap";
import { SITE } from "@/data/site";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Anunta TOATE motoarele de cautare, dintr-un apel.
 *
 * Doua protocoale diferite pentru ca motoarele nu vorbesc acelasi limbaj:
 *  - IndexNow acopera Bing, Yandex, Seznam si Naver (isi paseaza notificarea
 *    intre ele, deci un singur apel ajunge la toate)
 *  - Google are API-ul lui, cu autentificare separata
 *
 * Cele doua ruleaza in paralel si sunt independente: daca Google nu e
 * configurat, IndexNow tot isi face treaba.
 */
async function handle() {
  const urls = sitemap().map((e) => (typeof e.url === "string" ? e.url : String(e.url)));

  const [indexNow, google] = await Promise.all([pingIndexNow(urls), submitToGoogle(urls)]);

  const pasiRamasi: string[] = [];
  if (!google.configured) {
    pasiRamasi.push(
      "Google nu e conectat încă — setează GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON în Railway (instrucțiuni în src/lib/google-indexing.ts).",
    );
  }
  pasiRamasi.push(
    `Trimite sitemap-ul în Google Search Console: https://${SITE.domain}/sitemap.xml — asta rămâne calea principală pentru Google, indiferent de API.`,
  );

  return NextResponse.json({
    ok: indexNow.ok || google.ok,
    totalInSitemap: urls.length,
    indexNow: {
      ok: indexNow.ok,
      submitted: indexNow.submitted,
      motoare: "Bing, Yandex, Seznam, Naver",
      error: indexNow.error,
    },
    google: {
      configurat: google.configured,
      ok: google.ok,
      submitted: google.submitted,
      failed: google.failed,
      error: google.error,
      nota: google.configured
        ? "Cota Google e de 200 de adrese pe zi."
        : undefined,
    },
    keyLocation: `https://${SITE.domain}/${INDEXNOW_KEY}.txt`,
    pasiRamasi,
  });
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  const viaKey = Boolean(key && key === process.env.EXTENSION_API_KEY);
  if (!viaKey && !getSession()) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  return handle();
}
