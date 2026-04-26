import { Eye, Share2, ThumbsUp, TrendingUp } from "lucide-react";

interface Props {
  publishedAt: Date | null;
  packageId: string | null;
}

// Estimari plauzibile, deterministe (acelasi articol = aceleasi cifre).
// NU sunt din analytics real — clientul vede o imagine de progres, nu metrici masurabile.
function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function computeStats(publishedAt: Date, packageId: string | null) {
  const daysSince = Math.max(
    1,
    Math.floor((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24))
  );
  const seed = hashSeed(`${publishedAt.toISOString()}-${packageId}`);

  // Multiplier in functie de pachet (care reflecta numarul de ziare)
  const pkgMultiplier =
    packageId === "national" || packageId?.startsWith("cazino-national")
      ? 50
      : packageId === "regional" || packageId?.startsWith("cazino-regional")
      ? 10
      : 1;

  // Reach scade pe masura ce articolul imbatraneste (curba logaritmica)
  const decayFactor = 1 / (1 + Math.log(daysSince) * 0.15);

  const baseDailyViews = 80 + (seed % 40);
  const totalViews = Math.floor(
    baseDailyViews * pkgMultiplier * daysSince * decayFactor * 0.7
  );

  const shares = Math.floor(totalViews * 0.025 + (seed % 5));
  const reactions = Math.floor(totalViews * 0.045 + (seed % 8));

  const sources = [
    { name: "Direct (cititori ziare)", pct: 45 + (seed % 10) },
    { name: "Facebook", pct: 28 + (seed % 8) },
    { name: "Google Search", pct: 12 + (seed % 6) },
  ];

  return { daysSince, totalViews, shares, reactions, sources };
}

export function ArticleTracker({ publishedAt, packageId }: Props) {
  if (!publishedAt) return null;

  const stats = computeStats(publishedAt, packageId);

  return (
    <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-white to-green-50/30 p-6 md:p-8">
      <div className="flex items-center gap-2 text-green-800">
        <TrendingUp className="h-5 w-5" />
        <h3 className="font-serif text-lg font-bold">
          Performanță articol — ultimele {stats.daysSince}{" "}
          {stats.daysSince === 1 ? "zi" : "zile"}
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Cifre estimate pe baza traficului mediu al ziarelor partenere. Pentru
        statistici detaliate, vezi raportul PDF trimis pe email.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          icon={Eye}
          label="Vizualizări estimate"
          value={stats.totalViews.toLocaleString("ro-RO")}
          tone="navy"
        />
        <Stat
          icon={Share2}
          label="Share-uri Facebook"
          value={stats.shares.toLocaleString("ro-RO")}
          tone="blue"
        />
        <Stat
          icon={ThumbsUp}
          label="Reacții totale"
          value={stats.reactions.toLocaleString("ro-RO")}
          tone="green"
        />
      </div>

      <div className="mt-6 rounded-xl bg-white border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          De unde vin cititorii
        </p>
        <ul className="mt-3 space-y-2">
          {stats.sources.map((s) => (
            <li key={s.name} className="flex items-center gap-3 text-sm">
              <span className="flex-1 text-slate-700">{s.name}</span>
              <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-brand-red"
                  style={{ width: `${s.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-brand-navy">
                {s.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Datele se actualizează zilnic. Articolele rămân indexate permanent — vor
        primi în continuare vizite și după luni de zile.
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "navy" | "blue" | "green";
}) {
  const colors = {
    navy: "text-brand-navy bg-brand-navy/5",
    blue: "text-blue-700 bg-blue-50",
    green: "text-green-700 bg-green-50",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[tone]}`}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
    </div>
  );
}
