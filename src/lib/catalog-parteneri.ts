import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { seriozitatePeParteneri, procentLaTimp } from "@/lib/termene-parteneri";
import { ADAOS_PLASARE, PRAGURI_ADAOS, adaosPentru } from "@/lib/niveluri-publicatii";
import { citesteOptiuni, pretOptiuneClient, etichetaOptiune, CHEI_OPTIUNI, OPTIUNI_PE_TIP, type CheieOptiune } from "@/lib/optiuni-partener";

/**
 * Catalogul publicatiilor partenere de pe /alege-ziarele.
 *
 * 29.09.2026 — ce vede clientul si ce NU vede. Vede: numele si adresa
 * site-ului (decizia proprietarului: clientii de SEO vor sa verifice inainte
 * sa plateasca), judetul, nisa, DA-ul citit de noi, traficul si pretul LUI.
 * Nu vede: tariful partenerului, adaosul nostru, contactul partenerului.
 */

export interface OptiuneCatalog {
  key: CheieOptiune;
  eticheta: string;
  /** Pretul pentru client, cu adaosul inclus. */
  pret: number;
}

export interface PartenerCatalog {
  id: string;
  nume: string;
  url: string;
  judet: string | null;
  regiune: string | null;
  nisa: string | null;
  da: number | null;
  trafic: number | null;
  urmaritoriFacebook: number | null;
  dofollow: boolean | null;
  /** presa | influencer */
  tip: string;
  platforma: string | null;
  urmaritori: number | null;
  vizualizari: number | null;
  /** „livreaza la timp": procent din comenzile incheiate; null sub 3 comenzi. */
  laTimp: number | null;
  comenzi: number;
  /** Pretul unui articol pentru client, la bucata (fara reducerea de volum). */
  pret: number;
  optiuni: OptiuneCatalog[];
}

/**
 * Reducerea la volum, trimisa clientului ca TABEL de reduceri, nu ca adaos:
 * pagina calculeaza totalul fara sa vada vreodata cat e adaosul nostru.
 */
export function reduceriVolum(): { deLa: number; reducere: number }[] {
  // Crescator dupa prag: pagina citeste primul element ca „de la cate incepe
  // reducerea" si cauta urmatorul prag in ordine.
  return PRAGURI_ADAOS.map((p) => ({ deLa: p.deLa, reducere: ADAOS_PLASARE - p.adaos }))
    .filter((r) => r.reducere > 0)
    .sort((a, b) => a.deLa - b.deLa);
}

export function reducerePentru(bucati: number): number {
  return ADAOS_PLASARE - adaosPentru(bucati);
}

export async function parteneriDisponibili(): Promise<PartenerCatalog[]> {
  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);
  const [rows, seriozitate] = await Promise.all([
    db
      .select()
      .from(publishers)
      .where(and(eq(publishers.status, "approved"), isNotNull(publishers.pricePerArticle))),
    seriozitatePeParteneri().catch(() => new Map<string, { laTimp: number; total: number }>()),
  ]);
  return rows
    .filter((p) => (p.pricePerArticle ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      nume: p.siteName,
      url: p.siteUrl,
      judet: p.county,
      regiune: p.region,
      nisa: p.niche,
      da: p.domainAuthority,
      trafic: p.monthlyTraffic,
      urmaritoriFacebook: p.facebookFollowers,
      dofollow: p.dofollowLinks,
      tip: p.kind || "presa",
      platforma: p.platform,
      urmaritori: p.followers,
      vizualizari: p.avgViews,
      laTimp: procentLaTimp(seriozitate.get(p.id)),
      comenzi: seriozitate.get(p.id)?.total ?? 0,
      pret: (p.pricePerArticle as number) + ADAOS_PLASARE,
      optiuni: citesteOptiuni(p.extraOptions)
        .filter((o) => (OPTIUNI_PE_TIP[p.kind === "influencer" ? "influencer" : "presa"] as string[]).includes(o.key))
        .map((o) => ({
        key: o.key,
        eticheta: etichetaOptiune(o.key),
        pret: pretOptiuneClient(o.pret),
      })),
    }))
    // Presa dupa DA, influencerii dupa urmaritori.
    .sort((a, b) => (b.da ?? 0) - (a.da ?? 0) || (b.urmaritori ?? 0) - (a.urmaritori ?? 0));
}

/** Ce a ales clientul: „id" sau „id+facebook+prima_pagina". */
export interface AlegerePartener {
  id: string;
  optiuni: CheieOptiune[];
}

export function parseazaAlegeri(v: string[] | string | null | undefined): AlegerePartener[] {
  const lista = Array.isArray(v) ? v : (v || "").split(",");
  const vazute = new Set<string>();
  const out: AlegerePartener[] = [];
  for (const bucata of lista) {
    const [id, ...opt] = String(bucata).trim().split("+");
    if (!id || vazute.has(id) || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) continue;
    vazute.add(id);
    out.push({ id, optiuni: Array.from(new Set(opt)).filter((o) => CHEI_OPTIUNI.includes(o)) as CheieOptiune[] });
  }
  return out;
}

export function serializeazaAlegeri(a: AlegerePartener[]): string {
  return a.map((x) => [x.id, ...x.optiuni].join("+")).join(",");
}

export interface LinieCalculata {
  id: string;
  nume: string;
  tarifPartener: number;
  pretClient: number;
  optiuni: { key: CheieOptiune; pret: number; pretClient: number }[];
}

/**
 * Pretul pe server, din baza: tarifele reale ale partenerilor aprobati,
 * optiunile pe care chiar le ofera, reducerea de volum. Ce trimite browserul
 * e doar lista de alegeri.
 */
export async function calculeazaParteneri(alegeri: AlegerePartener[]): Promise<{
  linii: LinieCalculata[];
  total: number;
  costParteneri: number;
}> {
  if (alegeri.length === 0) return { linii: [], total: 0, costParteneri: 0 };
  await ensureOrderColumns();
  const rows = await db
    .select()
    .from(publishers)
    .where(and(inArray(publishers.id, alegeri.map((a) => a.id)), eq(publishers.status, "approved")));
  const dupaId = new Map(rows.map((r) => [r.id, r]));
  const valide = alegeri.filter((a) => (dupaId.get(a.id)?.pricePerArticle ?? 0) > 0);
  const reducere = reducerePentru(valide.length);

  const linii: LinieCalculata[] = valide.map((a) => {
    const p = dupaId.get(a.id)!;
    const oferite = new Map(citesteOptiuni(p.extraOptions).map((o) => [o.key, o.pret]));
    const optiuni = a.optiuni
      .filter((k) => oferite.has(k))
      .map((k) => ({ key: k, pret: oferite.get(k)!, pretClient: pretOptiuneClient(oferite.get(k)!) }));
    const tarif = p.pricePerArticle as number;
    return {
      id: p.id,
      nume: p.siteName,
      tarifPartener: tarif,
      pretClient: tarif + ADAOS_PLASARE - reducere,
      optiuni,
    };
  });
  const total = linii.reduce((s, l) => s + l.pretClient + l.optiuni.reduce((x, o) => x + o.pretClient, 0), 0);
  const costParteneri = linii.reduce((s, l) => s + l.tarifPartener + l.optiuni.reduce((x, o) => x + o.pret, 0), 0);
  return { linii, total, costParteneri };
}
