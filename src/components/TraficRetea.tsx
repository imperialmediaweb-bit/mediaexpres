import Link from "next/link";
import { CIFRE, nr as nrCifre } from "@/data/cifre";

const milioane = (n: number) => `${(n / 1_000_000).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} milioane`;

/**
 * 06.11.2026 (user: „pe site să fie date în timp real… zilnic… cu grafic…
 * pentru toată rețeaua… din Facebook, Google… câți urmăritori… câte articole
 * zilnic") — traficul REAL al rețelei, din aplicația rețelei
 * (/api/public/trafic: Google Analytics 4 pe toate ziarele, până ieri).
 * Fără date = nu se afișează nimic (nu inventăm cifre).
 */

const URL_TRAFIC =
  process.env.RETEA_TRAFIC_URL || "https://reteau-expres-production.up.railway.app/api/public/trafic";

type Zi = { zi: string; vizite: number; vizitatori: number; pagini: number };
type Trafic = {
  ok: boolean;
  actualizat_la: string;
  ultimele30: { vizite: number; vizitatori: number; pagini: number };
  anterioare30: { vizite: number; vizitatori: number; pagini: number };
  ieri: Zi | null;
  zile: Zi[];
  surse: { canal: string; vizite: number }[];
  urmaritori: number | null;
  urmaritori_zile: { zi: string; urmaritori: number }[];
  articole_zile: { zi: string; articole: number }[];
  articole_30z: number;
};

export async function getTrafic(): Promise<Trafic | null> {
  try {
    const res = await fetch(URL_TRAFIC, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "MediaExpres-Statistici/1.0" },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as Trafic;
    return d.ok && d.ultimele30?.vizite > 0 ? d : null;
  } catch {
    return null;
  }
}

const nr = (n: number) => n.toLocaleString("ro-RO");
const dif = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
const ziScurt = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${m}`;
};

function Grafic({ zile }: { zile: Zi[] }) {
  const W = 720;
  const H = 200;
  const max = Math.max(...zile.map((z) => z.vizite), 1);
  const bw = W / zile.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="h-auto w-full" role="img" aria-label="Vizite pe zi, ultimele 30 de zile">
      {zile.map((z, i) => {
        const h = Math.max(2, (z.vizite / max) * H);
        return (
          <g key={z.zi}>
            <rect x={i * bw + 2} y={H - h} width={bw - 4} height={h} rx={3} className="fill-brand-red/80">
              <title>{`${ziScurt(z.zi)}: ${nr(z.vizite)} vizite`}</title>
            </rect>
            {i % 5 === 0 || i === zile.length - 1 ? (
              <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {ziScurt(z.zi)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function Cifra({ titlu, valoare, schimbare }: { titlu: string; valoare: string; schimbare?: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titlu}</div>
      <div className="mt-1 font-serif text-2xl font-bold text-brand-navy">{valoare}</div>
      {schimbare != null ? (
        <div className={`mt-1 text-xs font-semibold ${schimbare >= 0 ? "text-emerald-600" : "text-slate-500"}`}>
          {schimbare >= 0 ? "+" : ""}
          {schimbare}% față de cele 30 de zile dinainte
        </div>
      ) : null}
    </div>
  );
}

export async function TraficRetea({ cuLink = false }: { cuLink?: boolean }) {
  const t = await getTrafic();
  if (!t) return null;
  const u = t.ultimele30;
  const a = t.anterioare30;
  const totalSurse = t.surse.reduce((s, x) => s + x.vizite, 0) || 1;
  const medieArticole = t.articole_zile.length ? Math.round(t.articole_30z / t.articole_zile.length) : 0;
  const actualizat = new Date(t.actualizat_la).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl font-bold text-brand-navy">Rețeaua în cifre</h2>
        <span className="text-xs text-slate-500">Date Google Analytics · actualizat {actualizat}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titlu="Vizite, ultimele 30 de zile" valoare={nr(u.vizite)} schimbare={dif(u.vizite, a.vizite)} />
        <Cifra titlu="Cititori, ultimele 30 de zile" valoare={nr(u.vizitatori)} schimbare={dif(u.vizitatori, a.vizitatori)} />
        <Cifra titlu="Pagini citite" valoare={nr(u.pagini)} schimbare={dif(u.pagini, a.pagini)} />
        {t.ieri ? <Cifra titlu={`Ieri (${ziScurt(t.ieri.zi)})`} valoare={`${nr(t.ieri.vizite)} vizite`} /> : null}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-brand-navy">Vizite pe zi, ultimele 30 de zile</div>
        <Grafic zile={t.zile} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-brand-navy">De unde vin cititorii</div>
          {t.surse.map((s) => {
            const p = Math.round((s.vizite / totalSurse) * 100);
            return (
              <div key={s.canal} className="mb-2">
                <div className="flex justify-between text-sm">
                  <span>{s.canal}</span>
                  <span className="font-semibold text-brand-navy">
                    {p}% · {nr(s.vizite)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-brand-red" style={{ width: `${Math.max(p, 1)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid gap-3">
          {/* 06.11.2026 (user: „nu sunt așa mulți"): urmăritorii din cronul rețelei (388.861)
              erau greșiți; cifrele verificate stau în data/cifre.ts. */}
          <Cifra
            titlu={`Botoșani Expres pe Facebook, ${CIFRE.perioada}`}
            valoare={`${milioane(CIFRE.botosani.afisari)} de afișări`}
          />
          <p className="-mt-1 text-xs text-slate-500">
            {nrCifre(CIFRE.botosani.interactiuni)} de interacțiuni · cea mai citită pagină din rețea · măsurat la {CIFRE.laData}
          </p>
          {medieArticole ? (
            <Cifra
              titlu="Articole publicate"
              valoare={`${nr(medieArticole)} pe zi`}
              schimbare={null}
            />
          ) : null}
          {t.articole_30z ? (
            <p className="text-xs text-slate-500">{nr(t.articole_30z)} de articole în ultimele 30 de zile, în toată rețeaua.</p>
          ) : null}
        </div>
      </div>

      {cuLink ? (
        <p className="mt-4 text-sm">
          <Link href="/statistici" className="font-semibold text-brand-red hover:underline">
            Vezi toate cifrele rețelei →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
