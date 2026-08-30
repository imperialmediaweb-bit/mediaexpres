import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
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
