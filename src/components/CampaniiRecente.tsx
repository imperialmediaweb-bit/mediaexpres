import Link from "next/link";
import { posturiPublicate } from "@/lib/autoblog";
import { PozaCampanie } from "@/components/PozaCampanie";

/** „ZETTUM ." / „IGIENA SERV . (IGIENASERV.RO)" → „ZETTUM" / „IGIENA SERV". */
function numeFirma(f: string | null | undefined): string {
  return (f || "").replace(/\s*\([^)]*\)/g, "").replace(/[\s.,·]+$/g, "").replace(/\s+\./g, "").trim();
}

/**
 * 24.11.2026 (owner: „cand intra astia, sa fie articolele acolo"): ultimele
 * campanii ale clientilor (variantele de pe blog, lib/campanii-vitrina.ts),
 * sub dovezi, pe pagina ofertei. Fara campanii publicate, nu apare nimic.
 */
export async function CampaniiRecente() {
  const toate = await posturiPublicate(200);
  const toateCampaniile = toate.filter((p) => (p.keyword || "").startsWith("campanie:"));
  // Cate campanii are fiecare firma (owner: „clientul care a comandat 4 sa se vada").
  const peFirma = new Map<string, number>();
  for (const p of toateCampaniile) {
    const f = numeFirma(p.coverCredit).toLowerCase();
    if (f) peFirma.set(f, (peFirma.get(f) || 0) + 1);
  }
  // 26.11.2026 (owner: „la ultima comandă"): o singura carte pe firma, cea mai noua.
  const vazute = new Set<string>();
  const campanii = toateCampaniile
    .filter((p) => {
      const f = numeFirma(p.coverCredit).toLowerCase() || p.id;
      if (vazute.has(f)) return false;
      vazute.add(f);
      return true;
    })
    .slice(0, 6);
  if (!campanii.length) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Campanii recente</h2>
          <p className="mt-2 text-slate-600">Firme care și-au publicat articolul în cele 50 de ziare, prin MediaExpres.</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campanii.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              <PozaCampanie src={p.coverUrl || null} firma={numeFirma(p.coverCredit)} />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#E4002B]">
                  {numeFirma(p.coverCredit) ? `${numeFirma(p.coverCredit)} · ` : ""}
                  {(peFirma.get(numeFirma(p.coverCredit).toLowerCase()) || 0) > 1
                    ? `${peFirma.get(numeFirma(p.coverCredit).toLowerCase())} campanii`
                    : "50 de ziare"}
                </p>
                <h3 className="mt-1 line-clamp-3 font-semibold text-slate-900">{p.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
