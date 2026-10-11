import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";

// Asistentii si motoarele de cautare cu AI (11.10.2026): ii poftim explicit,
// cu aceleasi interdictii ca restul. Ce blocheaza Cloudflare inainte de
// robots.txt (GPTBot, ClaudeBot) se deblocheaza din contul Cloudflare.
const ROBOTI_AI = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "meta-externalagent",
  "DuckAssistBot",
  "MistralAI-User",
];

const INTERZIS = ["/admin", "/admin/*", "/api", "/api/*", "/comanda", "/cont/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ROBOTI_AI, allow: "/", disallow: INTERZIS },
      {
        userAgent: "*",
        allow: "/",
        // /reteaua-noastra NU are ce cauta aici: e vitrina publica a retelei,
        // e in sitemap si o trimitem activ la indexare. Disallow-ul era o
        // ramasita din epoca in care lista statea ascunsa dupa formular —
        // noindex-ul paginii a fost scos atunci, robots.txt a ramas uitat, iar
        // Google primea un sitemap cu un URL pe care robots il interzicea.
        disallow: [
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/comanda",
          // "/cont" (fara slash) e PREFIX in robots.txt si bloca si /contact —
          // pagina de contact era invizibila pentru Google. Slash-ul final
          // limiteaza regula la sectiunea de cont a clientilor.
          "/cont/",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
