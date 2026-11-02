"use client";

import { useState } from "react";

const BANNERE = [
  { f: "banner-300x250.png", w: 300, h: 250, unde: "Lângă articole (300×250)" },
  { f: "banner-728x90.png", w: 728, h: 90, unde: "Sus pe pagină (728×90)" },
  { f: "banner-160x600.png", w: 160, h: 600, unde: "Pe lateral (160×600)" },
  { f: "banner-320x50.png", w: 320, h: 50, unde: "Pe telefon (320×50)" },
];

const IMAGINI = [
  { f: "postare-patrat.png", unde: "Postare Facebook / Instagram (pătrat)" },
  { f: "postare-story.png", unde: "Story / TikTok (vertical)" },
];

/**
 * Materialele partenerului (lib/afiliati.ts): distribuire cu un click,
 * texte gata scrise cu linkul lui inclus, bannere cu cod de copiat si
 * imagini de descarcat. Cu cat e mai usor, cu atat distribuie mai mult.
 */
export function KitPartener({ link, site }: { link: string; site: string }) {
  const [copiat, setCopiat] = useState("");
  const copiaza = async (cheie: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiat(cheie);
      setTimeout(() => setCopiat(""), 2000);
    } catch {
      /* browserul nu permite — textul ramane vizibil pentru copiere manuala */
    }
  };

  const postare = `Știai că poți apărea în 50 de ziare online cu un singur articol? 📰\nTrimiți textul, iar MediaExpres îl publică în toată țara în 12 ore, cu raport în timp real și promovare pe Facebook. Totul pentru 500 lei.\n👉 ${link}`;
  const mesaj = `Bună! Un sfat pentru vizibilitatea afacerii tale: MediaExpres publică un articol despre firma ta în 50 de ziare online, în 12 ore, cu raport în timp real. Costă 500 lei, iar articolele rămân permanent. Detalii aici: ${link}`;

  const buton =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90";

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-brand-navy">Distribuie cu un click</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a className={`${buton} bg-[#25D366]`} target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(mesaj)}`}>
            Trimite pe WhatsApp
          </a>
          <a
            className={`${buton} bg-[#1877F2]`}
            target="_blank"
            rel="noopener"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
          >
            Postează pe Facebook
          </a>
          <a
            className={`${buton} bg-[#0A66C2]`}
            target="_blank"
            rel="noopener"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`}
          >
            Postează pe LinkedIn
          </a>
          <button className={`${buton} bg-brand-navy`} onClick={() => copiaza("link", link)}>
            {copiat === "link" ? "Copiat ✓" : "Copiază linkul"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-brand-navy">Texte gata scrise (linkul tău e deja inclus)</p>
        {[
          { k: "postare", t: "Postare pentru Facebook / Instagram / LinkedIn", v: postare },
          { k: "mesaj", t: "Mesaj pentru clienții tăi (WhatsApp sau email)", v: mesaj },
        ].map((x) => (
          <div key={x.k} className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{x.t}</p>
            <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{x.v}</p>
            <button className="mt-2 text-sm font-semibold text-brand-red" onClick={() => copiaza(x.k, x.v)}>
              {copiat === x.k ? "Copiat ✓" : "Copiază textul"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-brand-navy">Bannere pentru site sau blog</p>
        <p className="mt-1 text-sm text-slate-600">Copiezi codul și îl lipești pe site. Bannerul duce la linkul tău.</p>
        <div className="mt-4 space-y-6">
          {BANNERE.map((b) => {
            const cod = `<a href="${link}" target="_blank" rel="noopener"><img src="${site}/parteneri/kit/${b.f}" width="${b.w}" height="${b.h}" alt="Firma ta în 50 de ziare — MediaExpres" /></a>`;
            return (
              <div key={b.f}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{b.unde}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/parteneri/kit/${b.f}`} width={b.w} height={b.h} alt="" className="mt-2 max-w-full h-auto" />
                <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold">
                  <button className="text-brand-red" onClick={() => copiaza(b.f, cod)}>
                    {copiat === b.f ? "Cod copiat ✓" : "Copiază codul pentru site"}
                  </button>
                  <a className="text-brand-navy underline" href={`/parteneri/kit/${b.f}`} download>
                    Descarcă imaginea
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-brand-navy">Imagini pentru postări</p>
        <p className="mt-1 text-sm text-slate-600">Le descarci și le postezi împreună cu textul de mai sus.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {IMAGINI.map((i) => (
            <div key={i.f}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/parteneri/kit/${i.f}`} alt="" className="max-h-72 rounded-lg border border-slate-200" />
              <p className="mt-2 text-xs text-slate-500">{i.unde}</p>
              <a className="text-sm font-semibold text-brand-red" href={`/parteneri/kit/${i.f}`} download>
                Descarcă imaginea
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
