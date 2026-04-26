// Audit Google News pentru o firma — folosim RSS-ul public Google News.
// Nu necesita API key, dar Google poate sa rate-limit-eze ocazional.
// Parsez XML-ul manual cu regex (e simplu, structura RSS e stabila).

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
}

export interface NewsAudit {
  totalLast30Days: number;
  totalLast6Months: number;
  totalAll: number;
  recent: NewsItem[];
  uniqueSources: number;
}

const FEED_BASE = "https://news.google.com/rss/search";

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function extractTag(item: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = item.match(re);
  return m ? decodeHtmlEntities(stripCdata(m[1].trim())) : "";
}

function parseGoogleNewsRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const source = extractTag(block, "source");

    let iso = "";
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) iso = d.toISOString();
    }

    if (title && link) {
      items.push({ title, link, source: source || "—", publishedAt: iso });
    }
  }
  return items;
}

export async function auditCompanyNews(companyName: string): Promise<NewsAudit> {
  const q = encodeURIComponent(`"${companyName}"`);
  const url = `${FEED_BASE}?q=${q}&hl=ro&gl=RO&ceid=RO:ro`;

  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; MediaExpresAuditBot/1.0; +https://mediaexpress.ro)",
    },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error(`Google News a raspuns ${res.status}`);
  }

  const xml = await res.text();
  const items = parseGoogleNewsRss(xml);

  const now = Date.now();
  const ms30d = 30 * 24 * 60 * 60 * 1000;
  const ms6m = 180 * 24 * 60 * 60 * 1000;

  let last30 = 0;
  let last6m = 0;
  const sources = new Set<string>();

  for (const it of items) {
    if (it.source) sources.add(it.source);
    if (it.publishedAt) {
      const t = new Date(it.publishedAt).getTime();
      if (now - t <= ms30d) last30++;
      if (now - t <= ms6m) last6m++;
    }
  }

  return {
    totalLast30Days: last30,
    totalLast6Months: last6m,
    totalAll: items.length,
    recent: items.slice(0, 5),
    uniqueSources: sources.size,
  };
}
