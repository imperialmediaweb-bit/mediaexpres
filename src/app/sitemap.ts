import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";
import { getAllSlugs } from "@/lib/mdx";
import { COUNTIES } from "@/data/counties";
import { TEMPLATES } from "@/data/templates";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const now = new Date();

  const staticPages = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/pachete`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${base}/generator-comunicat`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${base}/audit-mentiuni`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${base}/sabloane`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
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

  const counties = COUNTIES.map((c) => ({
    url: `${base}/publicare-comunicat-${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const templates = TEMPLATES.map((t) => ({
    url: `${base}/sabloane/${t.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  return [...staticPages, ...blog, ...counties, ...templates];
}
