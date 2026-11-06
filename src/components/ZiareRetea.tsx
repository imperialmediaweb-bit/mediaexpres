import { DOMENII_INREGISTRATE } from "@/data/domenii-whois";

/**
 * 06.11.2026 (user: „trebuie să demonstrăm… vechimea domeniilor, articolele,
 * câte pe zi… toate statisticile, analytics, tot") — tabelul fiecărui ziar:
 * domeniul (data înregistrării din WHOIS, cu link de verificare), articolele
 * pe ani, articolele pe zi acum și vizitele din Google Analytics pe 30 de zile.
 * Datele vin din aplicația rețelei (/api/public/ziare); fără date = nimic.
 */

const URL_ZIARE =
  process.env.RETEA_ZIARE_URL || "https://reteau-expres-production.up.railway.app/api/public/ziare";

type Ziar = {
  slug: string;
  domeniu: string | null;
  nume: string | null;
  total: number;
  pe_zi: number;
  pe_an: Record<string, number>;
  vizite_30z: number | null;
};

async function getZiare(): Promise<Ziar[] | null> {
  try {
    const res = await fetch(URL_ZIARE, { next: { revalidate: 3600 }, headers: { "User-Agent": "MediaExpres-Statistici/1.0" } });
    if (!res.ok) return null;
    const d = (await res.json()) as { ok: boolean; ziare: Ziar[] };
    return d.ok && d.ziare?.length ? d.ziare : null;
  } catch {
    return null;
  }
}

const nr = (n: number) => n.toLocaleString("ro-RO");
const LUNI = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
const lunaAn = (iso: string) => `${LUNI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const ANI = ["2023", "2024", "2025", "2026"];

function afisareDomeniu(d: string) {
  try {
    return new URL(`https://${d}`).hostname.startsWith("xn--")
      ? d.replace("xn--constanaexpres-mbf.ro", "constanțaexpres.ro").replace("xn--timiexpres-xxd.ro", "timișexpres.ro")
      : d;
  } catch {
    return d;
  }
}

export async function ZiareRetea() {
  const ziare = await getZiare();
  if (!ziare) return null;
  // Sibiu Expres e nou (domeniu din 03.11.2026) și nu intră în cele 50 din ofertă.
  const lista = ziare
    .filter((z) => z.domeniu && z.slug !== "sibiu-expres")
    .sort((a, b) => b.total - a.total);
  const total = lista.reduce((s, z) => s + z.total, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-bold text-brand-navy">Fiecare ziar, în cifre</h2>
      <p className="mt-2 text-sm text-slate-600">
        {lista.length} de ziare, {nr(total)} de articole publicate. Data înregistrării domeniului e cea din registrul
        domeniilor .ro (WHOIS) — o puteți verifica dând clic pe ea.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3">Ziar</th>
              <th className="py-2 pr-3">Domeniu înregistrat</th>
              {ANI.map((a) => (
                <th key={a} className="py-2 pr-3 text-right">
                  Articole {a}
                </th>
              ))}
              <th className="py-2 pr-3 text-right">Total articole</th>
              <th className="py-2 pr-3 text-right">Pe zi acum</th>
              <th className="py-2 text-right">Vizite, 30 de zile</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((z) => {
              const dom = z.domeniu as string;
              const inreg = DOMENII_INREGISTRATE[dom];
              return (
                <tr key={z.slug} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <a href={`https://${dom}`} target="_blank" rel="noopener" className="font-semibold text-brand-navy hover:underline">
                      {z.nume || afisareDomeniu(dom)}
                    </a>
                  </td>
                  <td className="py-2 pr-3">
                    {inreg ? (
                      <a
                        href={`https://www.whois.com/whois/${dom}`}
                        target="_blank"
                        rel="noopener nofollow"
                        className="text-slate-700 hover:underline"
                      >
                        {lunaAn(inreg)}
                      </a>
                    ) : (
                      <a href={`https://www.whois.com/whois/${dom}`} target="_blank" rel="noopener nofollow" className="text-slate-500 hover:underline">
                        verifică
                      </a>
                    )}
                  </td>
                  {ANI.map((a) => (
                    <td key={a} className="py-2 pr-3 text-right tabular-nums">
                      {z.pe_an[a] ? nr(z.pe_an[a]) : "—"}
                    </td>
                  ))}
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums">{nr(z.total)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{z.pe_zi}</td>
                  <td className="py-2 text-right tabular-nums">{z.vizite_30z != null ? nr(z.vizite_30z) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Articolele din anii anteriori lansării domeniului actual provin din arhive preluate. Vizitele: Google Analytics,
        ultimele 30 de zile, până ieri.
      </p>
    </div>
  );
}
