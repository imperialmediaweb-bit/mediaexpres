import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";
import { getAllSlugs } from "@/lib/mdx";
import { COUNTIES } from "@/data/counties";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const now = new Date();

  const staticPages = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/pachete`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${base}/generator-comunicat`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${base}/despre`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.6 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${base}/legal/termeni`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/legal/confidentialitate`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/legal/cookies`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/legal/gdpr`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const blog = getAllSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // 41 judete + Bucuresti — pagini SEO long-tail pentru "publicare comunicat <judet>"
  const counties = COUNTIES.map((c) => ({
    url: `${base}/publicare-comunicat-${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // NOTE: /reteaua-noastra, /comanda and /admin/* are intentionally EXCLUDED
  // from the sitemap to protect the network from indexing.
  return [...staticPages, ...blog, ...counties];
}
