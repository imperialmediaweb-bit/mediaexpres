"use client";

import { useState } from "react";

/** Poza campaniei; daca adresa e stricata, un fundal simplu in loc de textul alt rupt. */
export function PozaCampanie({ src, firma }: { src: string | null; firma: string }) {
  const [rupta, setRupta] = useState(!src);
  if (rupta)
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-slate-800 to-[#E4002B] px-4 text-center text-lg font-bold text-white">
        {firma || "Campanie în 50 de ziare"}
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src || ""} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" onError={() => setRupta(true)} />;
}
