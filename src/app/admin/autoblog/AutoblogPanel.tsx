"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Sparkles, Share2 } from "lucide-react";

interface Setari {
  activ: boolean;
  ritm: string;
  facebook: boolean;
}
interface Cuvant {
  id: string;
  keyword: string;
  status: string;
  error: string | null;
  usedAt: string | null;
}
interface Post {
  id: string;
  slug: string;
  title: string;
  keyword: string;
  coverUrl: string | null;
  publishedAt: string;
  fbPostId: string | null;
  fbError: string | null;
}

const CUVINTE_SUGERATE = [
  "publicare comunicat de presă",
  "cât costă un advertorial",
  "advertorial în ziare online",
  "publicitate în presa online pentru firme mici",
  "promovare firmă în ziare locale",
  "cum scrii un comunicat de presă",
  "model comunicat de presă lansare produs",
  "distribuție comunicate de presă România",
  "advertorial vs comunicat de presă",
  "backlink din presă pentru SEO",
  "articole SEO în ziare",
  "link building prin presă",
  "cum apari în Google cu firma ta",
  "SEO local pentru firme mici",
  "notorietate online pentru o firmă nouă",
  "reputație online firmă",
  "promovare eveniment local în presă",
  "promovare lansare produs",
  "promovare clinică medicală online",
  "promovare cabinet stomatologic",
  "promovare restaurant în presa locală",
  "promovare agenție imobiliară",
  "promovare pensiune turistică",
  "promovare magazin online",
  "promovare firmă de construcții",
  "promovare ONG și strângere de fonduri",
  "ce înseamnă Domain Authority",
  "ce este un link dofollow",
  "ziare online din România lista",
  "PR pentru antreprenori la început",
];

async function cere(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/autoblog", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }))) as Record<string, unknown> & { ok: boolean; error?: string; motiv?: string };
}

export function AutoblogPanel({
  setari,
  ritmuri,
  cuvinte,
  posturi,
  facebookConfigurat,
}: {
  setari: Setari;
  ritmuri: { id: string; eticheta: string }[];
  cuvinte: Cuvant[];
  posturi: Post[];
  facebookConfigurat: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState<Setari>(setari);
  const [text, setText] = useState("");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [ocupat, setOcupat] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function ruleaza(eticheta: string, body: Record<string, unknown>, dupa?: (r: Record<string, unknown>) => string) {
    setOcupat(eticheta);
    setMesaj(null);
    try {
      const r = await cere(body);
      if (!r.ok) setMesaj(`Nu a mers: ${r.error || r.motiv || "eroare"}`);
      else setMesaj(dupa ? dupa(r) : "Gata.");
      startTransition(() => router.refresh());
    } finally {
      setOcupat(null);
    }
  }

  const inAsteptare = cuvinte.filter((c) => c.status === "pending");

  return (
    <div className="mt-6 space-y-8">
      {mesaj && (
        <p className={`rounded-lg border p-3 text-sm ${mesaj.startsWith("Nu a mers") ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>
          {mesaj}
        </p>
      )}

      {/* Setari */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-serif text-lg font-bold text-brand-navy">Ritmul</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={s.activ} onChange={(e) => setS({ ...s, activ: e.target.checked })} className="h-4 w-4 accent-brand-red" />
            <span className="font-semibold">{s.activ ? "Pornit" : "Oprit"}</span>
          </label>
          <select value={s.ritm} onChange={(e) => setS({ ...s, ritm: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-1.5">
            {ritmuri.map((r) => (
              <option key={r.id} value={r.id}>
                {r.eticheta}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={s.facebook} onChange={(e) => setS({ ...s, facebook: e.target.checked })} className="h-4 w-4 accent-brand-red" />
            postează și pe Facebook
            {!facebookConfigurat && <span className="text-xs text-amber-700">(lipsește tokenul de pagină)</span>}
          </label>
          <button
            type="button"
            disabled={ocupat !== null}
            onClick={() => ruleaza("setari", { actiune: "setari", ...s }, () => "Setările sunt salvate.")}
            className="rounded-lg bg-brand-navy px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {ocupat === "setari" ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Salvează"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Publică doar între 8:00 și 21:00, ora României, câte un articol când îi vine rândul. Cu „1 pe zi” și 30 de
          cuvinte ai o lună de articole.
        </p>
      </section>

      {/* Cuvinte */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-lg font-bold text-brand-navy">
            Cuvinte cheie <span className="text-sm font-normal text-slate-500">({inAsteptare.length} în așteptare)</span>
          </h2>
          <button
            type="button"
            disabled={ocupat !== null || inAsteptare.length === 0}
            onClick={() =>
              ruleaza("genereaza", { actiune: "genereaza" }, (r) => `Publicat: „${r.title}” — /blog/${r.slug}. Facebook: ${r.facebook}.`)
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {ocupat === "genereaza" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generează acum următorul
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"un cuvânt cheie pe linie, de exemplu:\ncât costă un advertorial\npromovare firmă în ziare locale"}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={ocupat !== null || !text.trim()}
            onClick={() => ruleaza("cuvinte", { actiune: "cuvinte", text }, (r) => `Am adăugat ${r.adaugate} cuvinte cheie.`).then(() => setText(""))}
            className="rounded-lg bg-brand-navy px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            Adaugă
          </button>
          <button
            type="button"
            onClick={() => setText((t) => (t.trim() ? t.trimEnd() + "\n" : "") + CUVINTE_SUGERATE.join("\n"))}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700"
          >
            Pune lista sugerată (30)
          </button>
        </div>
        {cuvinte.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {cuvinte.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className={c.status === "done" ? "text-slate-400 line-through" : c.status === "failed" ? "text-red-700" : "text-slate-800"}>
                  {c.keyword}
                </span>
                {c.status === "failed" && <span className="text-xs text-red-600">eroare: {c.error}</span>}
                {c.status === "done" && <span className="text-xs text-emerald-700">publicat</span>}
                <span className="ml-auto flex gap-1">
                  {c.status !== "done" && (
                    <button
                      type="button"
                      disabled={ocupat !== null}
                      title="Generează acum din cuvântul ăsta"
                      onClick={() =>
                        ruleaza("genereaza", { actiune: "genereaza", keywordId: c.id }, (r) => `Publicat: „${r.title}” — /blog/${r.slug}. Facebook: ${r.facebook}.`)
                      }
                      className="rounded px-2 py-1 text-xs text-brand-navy hover:bg-slate-100"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={ocupat !== null}
                    onClick={() => ruleaza("sterge-cuvant", { actiune: "sterge-cuvant", id: c.id }, () => "Șters.")}
                    className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Șterge"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Articole */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          Articole publicate <span className="text-sm font-normal text-slate-500">({posturi.length})</span>
        </h2>
        {posturi.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Niciunul încă. Pune cuvinte cheie și apasă „Generează acum”.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {posturi.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                {p.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverUrl} alt="" className="h-10 w-16 rounded object-cover" />
                ) : (
                  <span className="h-10 w-16 rounded bg-slate-100" />
                )}
                <span className="min-w-0 flex-1">
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-navy hover:underline">
                    {p.title}
                  </a>
                  <span className="block text-xs text-slate-500">
                    {p.keyword} · {new Date(p.publishedAt).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                    {p.fbPostId ? <span className="text-emerald-700">pe Facebook</span> : p.fbError ? <span className="text-red-600">Facebook: {p.fbError}</span> : "nepostat pe Facebook"}
                  </span>
                </span>
                {!p.fbPostId && facebookConfigurat && (
                  <button
                    type="button"
                    disabled={ocupat !== null}
                    onClick={() => ruleaza("fb-" + p.id, { actiune: "facebook", id: p.id }, () => "Postat pe Facebook.")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Postează
                  </button>
                )}
                <button
                  type="button"
                  disabled={ocupat !== null}
                  onClick={() => {
                    if (confirm(`Ștergi articolul „${p.title}”? Cuvântul cheie revine în așteptare.`)) {
                      ruleaza("sterge-" + p.id, { actiune: "sterge-post", id: p.id }, () => "Articol șters.");
                    }
                  }}
                  className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Șterge articolul"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
