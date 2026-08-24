import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getResendEmail } from "@/lib/resend-stats";
import { ADMIN_EMAIL } from "@/lib/email";
import { ReplyBox } from "./ReplyBox";

export const dynamic = "force-dynamic";

function first(v: string[] | string | null | undefined): string {
  if (!v) return "";
  return (Array.isArray(v) ? v[0] : v) || "";
}

/**
 * Adresa clientului, nu a noastra.
 *
 * Notificarile interne ([Lead], [Comanda]) vin catre adresa de contact si au
 * clientul in `reply_to`. Emailurile trimise clientului il au in `to`. Alegem
 * prima adresa care nu e a noastra.
 */
function clientAddress(
  to: string[] | string | null | undefined,
  replyTo: string[] | string | null | undefined,
): string {
  const mine = ADMIN_EMAIL.toLowerCase();
  const r = first(replyTo);
  if (r && r.toLowerCase() !== mine) return r;
  const t = first(to);
  if (t && t.toLowerCase() !== mine) return t;
  return "";
}

/** "[Lead] Cerere lista ziare — Ion" -> "Re: Cerere lista ziare — Ion" */
function replySubject(subject: string | undefined): string {
  const clean = (subject || "").replace(/^\[[^\]]+\]\s*/, "").trim();
  if (!clean) return "Re: solicitarea dumneavoastră";
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`;
}

function toDisplay(to: string[] | string | null | undefined): string {
  if (!to) return "—";
  return Array.isArray(to) ? to.join(", ") : to;
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words font-medium text-brand-navy">{value}</span>
    </div>
  );
}

export default async function AdminEmailDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = getSession();
  if (!session) redirect(`/admin/login?from=/admin/emailuri/${params.id}`);

  const { ok, data, error, hint } = await getResendEmail(params.id);
  if (ok && !data) notFound();

  return (
    <div>
      <Link
        href="/admin/emailuri"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la emailuri
      </Link>

      <h1 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
        {data?.subject || "Email"}
      </h1>

      {!ok && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">
            Nu am putut prelua emailul din Resend.
          </p>
          <p className="mt-1 text-amber-800">{error}</p>
          {hint && <p className="mt-1 text-amber-700">{hint}</p>}
        </div>
      )}

      {data && (
        <>
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
            <Row label="Către" value={toDisplay(data.to)} />
            <Row label="De la" value={data.from || "—"} />
            {data.reply_to && (
              <Row label="Răspunde la" value={toDisplay(data.reply_to)} />
            )}
            <Row label="Trimis" value={formatDateTime(data.created_at)} />
            <Row label="Stare" value={data.last_event || "—"} />
          </div>

          <h2 className="mt-8 font-serif text-lg font-semibold text-brand-navy">
            Conținutul emailului
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Exact ce a completat clientul în formular.
          </p>

          {data.html ? (
            // Continutul vine dintr-un email deja trimis si poate include text
            // scris de client. Il randam intr-un iframe cu sandbox gol: fara
            // scripturi, fara acces la sesiunea de admin, fara navigare.
            <iframe
              title="Conținutul emailului"
              sandbox=""
              srcDoc={data.html}
              className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
            />
          ) : data.text ? (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
              {data.text}
            </pre>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              Resend nu mai are conținutul acestui email (retenția e limitată în timp).
            </p>
          )}

          <a
            href={`https://resend.com/emails/${data.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-navy"
          >
            Vezi în Resend <ExternalLink className="h-3 w-3" />
          </a>

          <ReplyBox
            defaultTo={clientAddress(data.to, data.reply_to)}
            defaultSubject={replySubject(data.subject)}
          />
        </>
      )}
    </div>
  );
}
