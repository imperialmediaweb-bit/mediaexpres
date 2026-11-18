import Link from "next/link";
import { posturiPublicate } from "@/lib/autoblog";

/** 18.11.2026 — ultimele 3 articole de pe blog pe prima pagina: se vad si se schimba zilnic. */
export async function UltimeleArticole() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const posturi = await posturiPublicate(3);
  if (!posturi.length) return null;
  const zi = (d: Date) =>
    d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", timeZone: "Europe/Bucharest" });
  return (
    <section className="section bg-white">
      <div className="container">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Blog</p>
            <h2 className="h2 mt-2">Ultimele articole</h2>
          </div>
          <Link href="/blog" className="text-sm font-semibold text-brand-red hover:underline">
            Toate articolele →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {posturi.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md"
            >
              {p.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
              )}
              <div className="p-5">
                <p className="text-xs text-slate-500">{zi(p.publishedAt)}</p>
                <h3 className="mt-1 font-serif text-lg font-bold text-brand-navy group-hover:underline">{p.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
