import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listResendEmails, aggregateStats } from "@/lib/resend-stats";
import { ExternalLink, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const EVENT_STYLES: Record<string, { label: string; className: string }> = {
  sent: { label: "Trimis", className: "bg-slate-100 text-slate-700" },
  delivered: { label: "Livrat", className: "bg-blue-100 text-blue-800" },
  delivery_delayed: { label: "Întârziat", className: "bg-amber-100 text-amber-800" },
  opened: { label: "Deschis", className: "bg-amber-100 text-amber-800" },
  clicked: { label: "Click", className: "bg-green-100 text-green-800" },
  bounced: { label: "Bounce", className: "bg-red-100 text-red-700" },
  complained: { label: "Spam", className: "bg-red-100 text-red-700" },
  failed: { label: "Eșuat", className: "bg-red-100 text-red-700" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDisplay(to: string[] | string): string {
  if (Array.isArray(to)) return to.join(", ");
  return to || "—";
}

export default async function EmailuriPage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/emailuri");

  const { data: emails, ok, error, hint } = await listResendEmails(100);
  const stats = aggregateStats(emails);

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-navy">Emailuri trimise</h1>
        <p className="mt-2 text-sm text-slate-600">
          Toate emailurile trimise prin Resend, cu statistici de deschidere și click.
          Datele se citesc live din Resend API la fiecare deschidere a paginii.
        </p>
      </div>

      {!ok && (
        <div className="mt-6 flex gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Nu am putut prelua datele din Resend.</p>
            <p className="mt-1 text-xs">{error}</p>
            {hint && <p className="mt-1 text-xs font-medium">💡 {hint}</p>}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-5">
        <StatCard label="Total trimise" value={stats.total} tone="slate" />
        <StatCard label="Livrate" value={stats.delivered} tone="blue" />
        <StatCard
          label="Open rate"
          value={`${stats.openRate.toFixed(1)}%`}
          subline={`${stats.opened} deschise`}
          tone="amber"
        />
        <StatCard
          label="Click rate"
          value={`${stats.clickRate.toFixed(1)}%`}
          subline={`${stats.clicked} click-uri`}
          tone="green"
        />
        <StatCard
          label="Bounce rate"
          value={`${stats.bounceRate.toFixed(1)}%`}
          subline={`${stats.bounced} bounces`}
          tone="red"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Destinatar</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trimis</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  {ok ? "Niciun email trimis încă." : "Niciun email disponibil."}
                </td>
              </tr>
            ) : (
              emails.map((e) => {
                const style = EVENT_STYLES[e.last_event] || EVENT_STYLES.sent;
                return (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-brand-navy">
                      {toDisplay(e.to)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-md truncate">
                      {e.subject}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`https://resend.com/emails/${e.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"
                      >
                        Detalii <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Live din Resend API. Afișăm primele 100 de emailuri.
        Rate-urile de Open/Click sunt calculate doar pe emailurile livrate.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  subline,
  tone,
}: {
  label: string;
  value: string | number;
  subline?: string;
  tone: "slate" | "blue" | "amber" | "green" | "red";
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
  };
  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold text-brand-navy">{value}</p>
      {subline && <p className="mt-1 text-xs text-slate-500">{subline}</p>}
    </div>
  );
}
