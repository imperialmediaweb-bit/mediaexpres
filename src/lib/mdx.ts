import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  author?: string;
  tags?: string[];
  readingMinutes: number;
}

export interface Post extends PostMeta {
  content: string;
}

function readPostFile(filename: string): Post | null {
  const fullPath = path.join(BLOG_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const slug = filename.replace(/\.mdx?$/i, "");
  const stats = readingTime(content);
  return {
    slug,
    title: String(data.title || slug),
    date: String(data.date || new Date().toISOString().slice(0, 10)),
    excerpt: String(data.excerpt || ""),
    cover: data.cover ? String(data.cover) : undefined,
    author: data.author ? String(data.author) : "Echipa MediaExpres",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
    content,
  };
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => /\.mdx?$/i.test(f))
    .map((f) => readPostFile(f))
    .filter((p): p is Post => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  const candidates = [`${slug}.mdx`, `${slug}.md`];
  for (const f of candidates) {
    const post = readPostFile(f);
    if (post) return post;
  }
  return null;
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}
