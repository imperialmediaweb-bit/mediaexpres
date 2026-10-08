import type { Metadata } from "next";
import { citesteSetariOferta } from "@/lib/oferta-facebook";
import { SITE } from "@/data/site";

export const dynamic = "force-dynamic";

/**
 * Pagina de trecere pentru oferta zilnica de pe Facebook (08.10.2026).
 * Facebook citeste de aici imaginea zilei (generata cu OpenAI) pentru
 * previzualizarea linkului; omul care da click e trimis imediat la oferta.
 * Ascunsa de Google: nu e o pagina de continut.
 */
export async function generateMetadata({ params }: { params: { zi: string } }): Promise<Metadata> {
  let imagine: string | null = null;
  try {
    imagine = (await citesteSetariOferta()).imaginiAI[params.zi] || null;
  } catch {
    imagine = null;
  }
  const titlu = "Advertorial în 50 de ziare — 500 lei";
  const descriere = "Articolul tău publicat în 50 de ziare online din România, cu link și promovare pe Facebook inclusă.";
  return {
    title: titlu,
    description: descriere,
    robots: { index: false, follow: false },
    alternates: { canonical: "/oferta-500" },
    openGraph: {
      type: "website",
      url: `${SITE.url}/promo/${params.zi}`,
      title: titlu,
      description: descriere,
      images: imagine ? [{ url: imagine, width: 1536, height: 1024, alt: titlu }] : undefined,
    },
  };
}

export default function Promo() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <script dangerouslySetInnerHTML={{ __html: `location.replace("/oferta-500"+location.search)` }} />
      <p className="text-slate-600">
        Te ducem la ofertă…{" "}
        <a href="/oferta-500" className="font-semibold text-brand-red underline">
          Deschide oferta
        </a>
      </p>
    </div>
  );
}
