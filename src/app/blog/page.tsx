import type { Metadata } from "next";
import { BlogCard } from "@/components/blog/BlogCard";
import { getAllPosts } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Ghiduri despre comunicate de presă, strategii PR și distribuție media pentru afaceri românești.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-20 text-center">
          <p className="eyebrow text-brand-gold">Blog MediaExpres</p>
          <h1 className="h1 mt-3 text-white">Ghiduri, strategii și studii de caz</h1>
          <p className="lead mx-auto mt-6 max-w-2xl text-white/85">
            Articole practice despre comunicate de presă, PR, distribuție media și SEO — tot ce
            trebuie să știi ca să-ți maximizezi vizibilitatea.
          </p>
        </div>
      </section>

      <section className="section bg-newsprint">
        <div className="container">
          {posts.length === 0 ? (
            <p className="text-center text-slate-600">Articole în pregătire. Revino curând.</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
