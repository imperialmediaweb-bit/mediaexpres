import { TrendingUp } from "lucide-react";

// Totalul rețelei din Google Analytics, servit de aplicația rețelei (cache 12h acolo).
const STATS_URL =
  process.env.NETWORK_STATS_URL ||
  "https://reteau-expres-production.up.railway.app/api/network-stats";

type NetworkStats = {
  days: number;
  users: number;
  pageViews: number;
  updatedAt: string;
};

async function getStats(): Promise<NetworkStats | null> {
  try {
    const res = await fetch(STATS_URL, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "MediaExpres-Oferta/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NetworkStats;
    return data.users > 0 ? data : null;
  } catch {
    return null;
  }
}

// Rotunjit în jos la mie: 126.182 → „126.000+”
function roundDown(n: number) {
  return `${(Math.floor(n / 1000) * 1000).toLocaleString("ro-RO")}+`;
}

export async function NetworkTraffic({ compact = false }: { compact?: boolean } = {}) {
  const stats = await getStats();
  if (!stats) return null;

  const date = new Date(stats.updatedAt).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  });

  if (compact) {
    return (
      <p className="mt-5 text-sm text-white/80">
        <span className="font-bold text-brand-gold">{roundDown(stats.users)} cititori</span>{" "}
        în ultimele {stats.days} de zile în rețea · Date Google Analytics, actualizat la {date}
      </p>
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
      <TrendingUp className="mx-auto h-8 w-8 text-brand-red" />
      <div className="mt-3 font-serif text-4xl font-bold text-brand-navy">
        {roundDown(stats.users)} cititori
      </div>
      <p className="mt-2 text-sm text-slate-600">
        în ultimele {stats.days} de zile în rețea ·{" "}
        {roundDown(stats.pageViews)} afișări de pagină
      </p>
      <p className="mt-3 text-xs text-slate-500">
        Date Google Analytics · actualizat la {date}
      </p>
    </div>
  );
}
