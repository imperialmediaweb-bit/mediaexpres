"use client";

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";

const END_KEY = "me_offer_end";
const DISMISS_KEY = "me_banner_dismissed";
const OFFER_DAYS = 3;

function getEndDate(): Date {
  const stored = localStorage.getItem(END_KEY);
  if (stored) {
    const d = new Date(stored);
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) return d;
  }
  const end = new Date();
  end.setDate(end.getDate() + OFFER_DAYS);
  end.setHours(23, 59, 59, 999);
  localStorage.setItem(END_KEY, end.toISOString());
  return end;
}

type Remaining = { d: number; h: number; m: number; s: number };

export function CountdownBanner() {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }
    setDismissed(false);

    const end = getEndDate();
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      setRemaining({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff / 3_600_000) % 24),
        m: Math.floor((diff / 60_000) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (dismissed || !remaining) return null;

  return (
    <div className="relative bg-brand-red text-white text-sm">
      <div className="container flex items-center justify-center gap-2 py-2 pr-10 text-center">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          Ofertă limitată: <strong>{remaining.d}z {remaining.h}h {remaining.m}m {remaining.s}s</strong>
          {" "}— cere oferta personalizată acum
        </span>
      </div>
      <button
        type="button"
        aria-label="Închide"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
