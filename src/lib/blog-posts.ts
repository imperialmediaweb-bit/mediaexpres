import { getAllPosts, type PostMeta } from "@/lib/mdx";
import { posturiPublicate, minuteCitire } from "@/lib/autoblog";

/**
 * Articolele scrise de mana (fisiere MDX in content/blog) si cele din
 * autoblog (baza), intr-o singura lista, cele mai noi primele.
 */
export async function toatePosturile(): Promise<PostMeta[]> {
  const mdx = getAllPosts();
  const db = (await posturiPublicate()).map<PostMeta>((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.publishedAt.toISOString().slice(0, 10),
    excerpt: p.excerpt,
    cover: p.coverUrl || undefined,
    author: "Echipa MediaExpres",
    tags: p.tags,
    readingMinutes: minuteCitire(p.bodyHtml),
  }));
  return [...mdx, ...db].sort((a, b) => (a.date < b.date ? 1 : -1));
}
