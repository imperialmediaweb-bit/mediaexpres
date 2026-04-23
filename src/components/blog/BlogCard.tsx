import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { PostMeta } from "@/lib/mdx";

export function BlogCard({ post }: { post: PostMeta }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="aspect-[16/9] bg-gradient-to-br from-brand-navy via-[#13396B] to-brand-red relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <span className="font-serif text-xl font-bold text-white text-center leading-tight line-clamp-3">
            {post.title}
          </span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <time>{formatDate(post.date)}</time>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readingMinutes} min
          </span>
        </div>
        <h3 className="mt-3 font-serif text-xl font-semibold text-brand-navy group-hover:text-brand-red transition-colors">
          <Link href={`/blog/${post.slug}`} className="block">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm text-slate-600 leading-relaxed">{post.excerpt}</p>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-red hover:gap-2 transition-all"
        >
          Citește articolul <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
