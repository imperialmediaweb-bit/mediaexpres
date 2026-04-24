import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { articles, uploads, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { ArticleActions } from "./ArticleActions";

export const dynamic = "force-dynamic";

function safeParseUrls(s: string | null): string[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {}
  return [];
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminArticleDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = getSession();
  if (!session) redirect(`/admin/login?from=/admin/articole/${params.id}`);

  const [a] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, params.id))
    .limit(1);
  if (!a) notFound();

  const [author] = await db
    .select()
    .from(users)
    .where(eq(users.id, a.userId))
    .limit(1);

  const photos = await db
    .select()
    .from(uploads)
    .where(eq(uploads.articleId, a.id));

  const publishedUrls = safeParseUrls(a.publishedUrls);

  return (
    <div>
      <Link
        href="/admin/articole"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red"
      >
        <ArrowLeft className="h-4 w-4" /> Inapoi la articole
      </Link>

      <div className="mt-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-navy">
            {a.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Trimis de{" "}
            <Link
              href={`/admin/clienti/${a.userId}`}
              className="text-brand-red hover:underline"
            >
              {author?.name || author?.email}
            </Link>{" "}
            • {formatDate(a.submittedAt || a.createdAt)}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {a.existingUrl && (
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">URL existent oferit de client:</p>
              <a
                href={a.existingUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-700 underline"
              >
                {a.existingUrl}
              </a>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-lg font-semibold text-brand-navy">
              Text articol {a.aiGenerated && <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">AI</span>}
            </h2>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-700 font-sans">
              {a.body || <em className="text-slate-400">Fără text (doar URL existent).</em>}
            </pre>
          </div>

          {a.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-brand-navy">Observații client</h3>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                {a.notes}
              </p>
            </div>
          )}

          {photos.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-brand-navy">
                Poze ({photos.length}/3)
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt="Poza articol"
                      className="aspect-video w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {publishedUrls.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-white p-5">
              <h3 className="font-semibold text-brand-navy">
                Link-uri publicate ({publishedUrls.length})
              </h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
                {publishedUrls.map((u) => (
                  <li key={u}>
                    <a
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-red hover:underline break-all"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside>
          <ArticleActions
            articleId={a.id}
            initialStatus={a.status}
            initialUrls={publishedUrls}
          />
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
    submitted: { label: "De aprobat", cls: "bg-amber-100 text-amber-800" },
    published: { label: "Publicat", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Respins", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
