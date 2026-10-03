import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  citesteSetariAutoblog,
  configFacebookPagina,
  listeazaCuvinte,
  toatePosturileAdmin,
  RITMURI_BLOG,
} from "@/lib/autoblog";
import { getCloudinaryConfig } from "@/lib/cloudinary";
import { AutoblogPanel } from "./AutoblogPanel";

export const dynamic = "force-dynamic";

/**
 * Autoblogul (03.10.2026): cuvintele cheie, ritmul, articolele publicate si
 * ce lipseste din configurare (chei de poze, token Facebook).
 */
export default async function AutoblogAdmin() {
  if (!getSession()) redirect("/admin/login?from=/admin/autoblog");
  const [setari, cuvinte, posturi] = await Promise.all([citesteSetariAutoblog(), listeazaCuvinte(), toatePosturileAdmin()]);

  const stare = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    pexels: Boolean(process.env.PEXELS_API_KEY?.trim()),
    pixabay: Boolean(process.env.PIXABAY_API_KEY?.trim()),
    cloudinary: Boolean(getCloudinaryConfig()),
    facebook: Boolean(configFacebookPagina()),
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-navy">Autoblog</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Articole de ghid pe cuvinte cheie, scrise automat, cu poză, publicate pe{" "}
            <Link href="/blog" className="underline" target="_blank">
              /blog
            </Link>{" "}
            în ritmul ales și postate pe pagina de Facebook. Pui cuvintele, pornești, și restul merge singur.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-xs sm:grid-cols-5">
        <Semafor ok={stare.openai} ce="OpenAI (scrie articolele)" lipsa="OPENAI_API_KEY în Railway" />
        <Semafor ok={stare.pexels} ce="Pexels (poze)" lipsa="PEXELS_API_KEY în Railway" />
        <Semafor ok={stare.pixabay} ce="Pixabay (poze, rezervă)" lipsa="PIXABAY_API_KEY în Railway" />
        <Semafor ok={stare.cloudinary} ce="Cloudinary (copiem pozele la noi)" lipsa="cheile Cloudinary" />
        <Semafor ok={stare.facebook} ce="Facebook (postare automată)" lipsa="FB_PAGE_TOKEN + FB_PAGE_ID în Railway" />
      </div>

      <AutoblogPanel
        setari={setari}
        ritmuri={RITMURI_BLOG.map((r) => ({ id: r.id, eticheta: r.eticheta }))}
        cuvinte={cuvinte.map((c) => ({
          id: c.id,
          keyword: c.keyword,
          status: c.status,
          error: c.error,
          usedAt: c.usedAt ? c.usedAt.toISOString() : null,
        }))}
        posturi={posturi.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          keyword: p.keyword,
          coverUrl: p.coverUrl,
          publishedAt: p.publishedAt.toISOString(),
          fbPostId: p.fbPostId,
          fbError: p.fbError,
        }))}
        facebookConfigurat={stare.facebook}
      />
    </div>
  );
}

function Semafor({ ok, ce, lipsa }: { ok: boolean; ce: string; lipsa: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <span className="font-semibold">{ok ? "✓" : "!"} {ce}</span>
      {!ok && <span className="block text-[11px]">lipsește: {lipsa}</span>}
    </div>
  );
}
