import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { NEWSPAPERS, REGION_COUNTS } from "@/data/newspapers";
import { LogoutButton } from "./LogoutButton";

export const metadata: Metadata = {
  title: "Admin • Ziare",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminZiarePage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/ziare");

  const byRegion = {
    Național: NEWSPAPERS.filter((n) => n.region === "Național"),
    Moldova: NEWSPAPERS.filter((n) => n.region === "Moldova"),
    Transilvania: NEWSPAPERS.filter((n) => n.region === "Transilvania"),
    Muntenia: NEWSPAPERS.filter((n) => n.region === "Muntenia"),
    Banat: NEWSPAPERS.filter((n) => n.region === "Banat"),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold text-brand-red">
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">Salut, {session.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand-navy">Lista ziarelor</h1>
            <p className="mt-2 text-sm text-slate-600">
              Rețeaua completă de ziare partenere — <strong>confidențial, nu expus public</strong>.
              Total: <strong>{NEWSPAPERS.length} ziare</strong>.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-brand-red hover:underline"
          >
            ← Înapoi la site
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <StatPill label="Naționale" value={REGION_COUNTS.Național} tone="gold" />
          <StatPill label="Moldova" value={REGION_COUNTS.Moldova} />
          <StatPill label="Transilvania" value={REGION_COUNTS.Transilvania} />
          <StatPill label="Muntenia" value={REGION_COUNTS.Muntenia} />
          <StatPill label="Banat+Oltenia" value={REGION_COUNTS.Banat} />
        </div>

        <div className="mt-10 space-y-8">
          {Object.entries(byRegion).map(([region, items]) => (
            <section key={region}>
              <h2 className="font-serif text-xl font-semibold text-brand-navy">
                {region} <span className="text-sm font-normal text-slate-500">({items.length})</span>
              </h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Ziar</th>
                      <th className="px-4 py-3 text-left">Județ</th>
                      <th className="px-4 py-3 text-left">Tip</th>
                      <th className="px-4 py-3 text-left">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((n, i) => (
                      <tr key={`${n.name}-${i}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-brand-navy">{n.name}</td>
                        <td className="px-4 py-3 text-slate-600">{n.county || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{n.type}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {n.url || <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-900">
            <strong>Securitate:</strong> Această pagină este blocată în <code>robots.txt</code> și are
            meta <code>noindex, nofollow</code>. NU distribui screenshot-uri ale acestei pagini, nu
            adăuga URL-uri către ea în conținut public. Rețeaua noastră e protejată prin anonimitate.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "gold";
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        tone === "gold" ? "border-brand-gold/50 bg-brand-gold/5" : "border-slate-200"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-serif text-3xl font-bold text-brand-navy">{value}</div>
    </div>
  );
}
