"use client";

import { useState } from "react";
import { PlayCircle, CreditCard, Landmark } from "lucide-react";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";

/*
  „Vezi cum comanzi" — pentru cine vrea sa se uite, nu pentru toti. De aceea
  sta strans: un rand cu un buton. Abia la apasare apare playerul, cu cele
  doua clipuri scurte (card / OP), filmate pe site-ul real, cu textul pe
  ecran. Clipurile nu se descarca pana nu apesi (preload none), deci pagina
  nu se ingreuneaza pentru restul.
*/

const CLIPURI = {
  card: { src: "/video/cum-comanzi-card.mp4", poster: "/video/poster-card.jpg", eticheta: "Cu cardul", durata: "48 s" },
  op: { src: "/video/cum-comanzi-op.mp4", poster: "/video/poster-op.jpg", eticheta: "Prin transfer (OP)", durata: "38 s" },
} as const;

export function VideoTutorial() {
  const [deschis, setDeschis] = useState(false);
  const [clip, setClip] = useState<keyof typeof CLIPURI>("card");
  const c = CLIPURI[clip];

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="container py-8">
        {!deschis ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-5">
            <p className="text-slate-700">
              <strong className="text-brand-navy">Vrei să vezi cum se comandă?</strong> Un minut, filmat pe telefon.
            </p>
            <button
              type="button"
              onClick={() => {
                setDeschis(true);
                trackGaEvent("video_tutorial", { pas: "deschis" });
              }}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-navy px-5 py-2.5 font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
            >
              <PlayCircle className="h-5 w-5" /> Vezi cum comanzi
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(Object.keys(CLIPURI) as (keyof typeof CLIPURI)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setClip(k)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    clip === k
                      ? "border-brand-red bg-brand-red text-white"
                      : "border-slate-300 text-slate-700 hover:border-brand-navy"
                  }`}
                >
                  {k === "card" ? <CreditCard className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                  {CLIPURI[k].eticheta} · {CLIPURI[k].durata}
                </button>
              ))}
            </div>
            <div className="mx-auto mt-5 w-full max-w-[320px] overflow-hidden rounded-[28px] border-[6px] border-brand-navy bg-black shadow-2xl">
              <video
                key={c.src}
                src={c.src}
                poster={c.poster}
                controls
                playsInline
                preload="none"
                className="aspect-[9/16] w-full"
                onPlay={() => trackGaEvent("video_tutorial", { pas: "play", clip })}
              />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Fără sunet. Pașii sunt scriși pe ecran.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
