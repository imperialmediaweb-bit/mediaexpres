"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  code: string;
  expiresAt: string;
}

function timeLeft(expiresAt: string): { h: number; m: number; s: number; expired: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
  const totalSec = Math.floor(diff / 1000);
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
    expired: false,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function DiscountCountdown({ code, expiresAt }: Props) {
  const [time, setTime] = useState(() => timeLeft(expiresAt));

  useEffect(() => {
    const id = setInterval(() => {
      setTime(timeLeft(expiresAt));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (time.expired) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-center text-sm text-slate-500">
        Codul de reducere a expirat. Contactează-ne la contact@mediaexpress.ro pentru o nouă ofertă.
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-brand-red bg-brand-red/5 px-6 py-5 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-brand-red" />
        <p className="text-sm font-semibold text-brand-red uppercase tracking-wide">
          Ofertă specială — -20% la primul articol
        </p>
      </div>
      <p className="text-xs text-slate-600 mb-3">
        Foloseşte codul <strong className="font-mono text-brand-navy">{code}</strong> la comandă. Expiră în:
      </p>
      <div className="flex items-center justify-center gap-2 font-mono text-2xl font-bold text-brand-navy">
        <div className="flex flex-col items-center">
          <span>{pad(time.h)}</span>
          <span className="text-xs font-normal text-slate-500 mt-0.5">ore</span>
        </div>
        <span className="text-slate-400 mb-4">:</span>
        <div className="flex flex-col items-center">
          <span>{pad(time.m)}</span>
          <span className="text-xs font-normal text-slate-500 mt-0.5">min</span>
        </div>
        <span className="text-slate-400 mb-4">:</span>
        <div className="flex flex-col items-center">
          <span>{pad(time.s)}</span>
          <span className="text-xs font-normal text-slate-500 mt-0.5">sec</span>
        </div>
      </div>
    </div>
  );
}
