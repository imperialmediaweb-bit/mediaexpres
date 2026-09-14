import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { placements, publishers } from "@/db/schema";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaToken } from "@/lib/plasare-token";
import { etichetaStare, timpRamas, ZILE_PUBLICARE, ZILE_REFUZ, LUNI_ONLINE } from "@/lib/plasari";
import { SITE } from "@/data/site";
import { PlacementActions } from "./PlacementActions";

export const dynamic = "force-dynamic";
// Pagina e a unui singur partener, cu un singur articol. Nu are ce cauta in
// Google, iar articolul nu trebuie sa apara indexat la noi inainte sa-l
// publice el.
export const metadata: Metadata = { robots: { index: false, follow: false } };

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" });
}

export default async function PaginaPlasare({ params }: { params: { token: string } }) {
  const t = verificaToken(params.token, "plasare");

  // NU 404 pe un link trimis de noi: un partener care vede „pagina nu exista"
  // suna, iar noi pierdem timpul explicand. Ii spunem ce s-a intamplat.
  if (!t) {
    return (
      <Cadru titlu="Link expirat">
        <p className="text-slate-600">
          Linkul nu mai e valabil. Scrie-ne la{" "}
          <a href={`mailto:${SITE.email}`} className="text-brand-red underline">{SITE.email}</a>{" "}
          și îți trimitem unul nou.
        </p>
      </Cadru>
    );
  }

  await ensurePlacementTables();
  const [pl] = await db.select().from(placements).where(eq(placements.id, t.id)).limit(1);
  if (!pl || (pl.tokenVersion ?? 0) !== t.v) {
    return (
      <Cadru titlu="Link invalid">
        <p className="text-slate-600">
          Linkul a fost înlocuit. Scrie-ne la{" "}
          <a href={`mailto:${SITE.email}`} className="text-brand-red underline">{SITE.email}</a>.
        </p>
      </Cadru>
    );
  }

  const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
  let poze: { url: string }[] = [];
  try {
    poze = JSON.parse(pl.images || "[]");
  } catch {
    poze = [];
  }

  const acum = new Date();
  const deschis = pl.status === "trimis" || pl.status === "acceptat";
  const poateRefuza = pl.status === "trimis" && acum <= new Date(pl.deadlineRefuz);

  return (
    <Cadru titlu={pl.articleTitle} subtitlu={pub?.siteName}>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Camp eticheta="Starea" valoare={etichetaStare(pl.status)} />
          <Camp eticheta="Îți plătim" valoare={`${pl.pricePartner} lei`} />
          <Camp
            eticheta="Refuz până la"
            valoare={`${fmt(pl.deadlineRefuz)}${deschis ? ` (${timpRamas(new Date(pl.deadlineRefuz), acum)})` : ""}`}
          />
          <Camp
            eticheta="Publicare până la"
            valoare={`${fmt(pl.deadlinePublicare)}${deschis ? ` (${timpRamas(new Date(pl.deadlinePublicare), acum)})` : ""}`}
          />
          {pl.publishedUrl && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Articolul publicat</dt>
              <dd className="mt-0.5">
                <a href={pl.publishedUrl} target="_blank" rel="noreferrer" className="break-all text-brand-red underline">
                  {pl.publishedUrl}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {pl.linkNotes && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Linkuri de păstrat în articol</p>
          <p className="mt-1 whitespace-pre-wrap font-mono text-sm text-slate-800">{pl.linkNotes}</p>
          <p className="mt-2 text-xs text-amber-900">
            Linkurile rămân exact așa. {pl.dofollowExpected ? "Fără nofollow." : ""}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-serif text-lg font-bold text-brand-navy">Articolul</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{pl.articleBody}</div>
        {poze.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {poze.map((p, i) => (
              <a key={p.url} href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className={`h-28 w-40 rounded-lg border-2 object-cover ${i === pl.featuredIndex ? "border-brand-red" : "border-slate-200"}`}
                />
              </a>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Textul e scris de noi și e original. Îl poți publica așa cum e; poți schimba forma
          (titlu, subtitluri, așezare), dar nu conținutul și nu linkurile.
        </p>
      </div>

      {deschis ? (
        <PlacementActions token={params.token} status={pl.status} poateRefuza={poateRefuza} />
      ) : (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          {etichetaStare(pl.status)}. Nu mai e nimic de făcut aici.
        </div>
      )}

      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        <strong>Regulile, pe scurt:</strong> refuzi în {ZILE_REFUZ} zile lucrătoare, fără să explici
        de ce. Dacă publici, ai {ZILE_PUBLICARE} zile lucrătoare și lipești aici adresa articolului.
        Articolul rămâne online {LUNI_ONLINE} luni, cu linkurile neatinse. Decontarea se face când
        ajungi la 500 de lei sau la sfârșitul trimestrului: îți trimitem situația, emiți factura pe
        ea, plătim în 10 zile lucrătoare.
      </div>
    </Cadru>
  );
}

function Cadru({ titlu, subtitlu, children }: { titlu: string; subtitlu?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {subtitlu && <p className="text-xs font-bold uppercase tracking-wider text-brand-red">{subtitlu}</p>}
      <h1 className="mt-1 font-serif text-2xl font-bold text-brand-navy sm:text-3xl">{titlu}</h1>
      <div className="mt-6">{children}</div>
    </main>
  );
}

function Camp({ eticheta, valoare }: { eticheta: string; valoare: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500">{eticheta}</dt>
      <dd className="mt-0.5 text-sm font-medium text-brand-navy">{valoare}</dd>
    </div>
  );
}
