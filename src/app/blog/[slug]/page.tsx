import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";
import { getPostBySlug, type PostMeta } from "@/lib/mdx";
import { postDupaSlug, minuteCitire } from "@/lib/autoblog";
import { formatDate } from "@/lib/utils";
import { BlogCard } from "@/components/blog/BlogCard";
import { CtaBanner } from "@/components/home/CtaBanner";
import { SITE } from "@/data/site";
import { toatePosturile } from "@/lib/blog-posts";

// Articolele autoblogului sunt in baza: pagina se randeaza la cerere.
export const dynamic = "force-dynamic";

/** Un articol, de oriunde ar veni: fisier MDX sau autoblog. */
async function incarcaArticol(slug: string): Promise<(PostMeta & { mdx?: string; html?: string; coverCredit?: string | null }) | null> {
  const fisier = getPostBySlug(slug);
  if (fisier) return { ...fisier, mdx: fisier.content };
  const p = await postDupaSlug(slug);
  if (!p) return null;
  return {
    slug: p.slug,
    title: p.title,
    date: p.publishedAt.toISOString().slice(0, 10),
    excerpt: p.excerpt,
    cover: p.coverUrl || undefined,
    coverCredit: p.coverCredit,
    author: "Echipa MediaExpres",
    tags: p.tags,
    readingMinutes: minuteCitire(p.bodyHtml),
    html: p.bodyHtml,
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await incarcaArticol(params.slug);
  if (!post) return { title: "Articol" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      publishedTime: post.date,
      authors: [post.author || SITE.name],
      title: post.title,
      description: post.excerpt,
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await incarcaArticol(params.slug);
  if (!post) notFound();

  const related = (await toatePosturile()).filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    image: post.cover ? [post.cover] : undefined,
    author: { "@type": "Organization", name: post.author || SITE.name },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}/logo.svg` },
    },
    mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
  };

  const prose = `prose prose-lg prose-slate max-w-none
              prose-headings:font-serif prose-headings:text-brand-navy
              prose-a:text-brand-red prose-a:no-underline hover:prose-a:underline
              prose-strong:text-brand-navy
              prose-blockquote:border-l-brand-red prose-blockquote:bg-brand-ivory prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-md prose-blockquote:not-italic
              prose-code:bg-brand-ivory prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-brand-navy prose-code:before:content-none prose-code:after:content-none
              prose-img:rounded-xl`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article>
        <header className="bg-brand-navy text-white">
          <div className="container py-16">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-brand-gold"
            >
              <ArrowLeft className="h-4 w-4" /> Înapoi la blog
            </Link>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-tight sm:text-5xl max-w-3xl">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {formatDate(post.date)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" /> {post.readingMinutes} min citire
              </span>
              {post.author && <span>De {post.author}</span>}
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-2">
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="section bg-white">
          <div className="container max-w-3xl">
            {post.cover && (
              <figure className="mb-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.cover}
                  alt={post.title}
                  className="aspect-[16/9] w-full rounded-2xl object-cover"
                  loading="eager"
                />
                {post.coverCredit && (
                  <figcaption className="mt-2 text-right text-xs text-slate-400">{post.coverCredit}</figcaption>
                )}
              </figure>
            )}
            <div className={prose}>
              {post.mdx ? (
                <MDXRemote
                  source={post.mdx}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm],
                      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
                    },
                  }}
                />
              ) : (
                // HTML-ul autoblogului e curatat la generare (lib/autoblog.ts: doar
                // taguri de text si linkuri interne), deci e sigur de pus direct.
                <div dangerouslySetInnerHTML={{ __html: post.html || "" }} />
              )}
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section bg-newsprint">
          <div className="container">
            <h2 className="h3 mb-8">Articole similare</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBanner />
    </>
  );
}
