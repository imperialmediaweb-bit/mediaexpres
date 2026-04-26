import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, uploads, subscriptions, orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getEntitlements } from "@/lib/entitlements";
import { ArticleEditor } from "@/components/cont/ArticleEditor";
import { ArticleTracker } from "@/components/cont/ArticleTracker";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Articol",
  robots: { index: false, follow: false },
};

export default async function ArticolPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, params.id), eq(articles.userId, session.user.id)))
    .limit(1);
  if (!article) notFound();

  const photos = await db.select().from(uploads).where(eq(uploads.articleId, article.id));

  const ent = await getEntitlements(session.user.id);
  const category: "standard" | "casino" =
    ent.activeSubscription?.category === "casino" ? "casino" : "standard";

  const isReadOnly = article.status === "submitted" || article.status === "published";
  const isPublished = article.status === "published";

  // Pentru tracker: derivam pachetul (din comanda asociata sau din planul de abonament)
  let trackerPackageId: string | null = null;
  if (article.orderId) {
    const [o] = await db
      .select({ packageId: orders.packageId })
      .from(orders)
      .where(eq(orders.id, article.orderId))
      .limit(1);
    trackerPackageId = o?.packageId ?? null;
  } else if (article.subscriptionId) {
    const [s] = await db
      .select({ planId: subscriptions.planId, category: subscriptions.category })
      .from(subscriptions)
      .where(eq(subscriptions.id, article.subscriptionId))
      .limit(1);
    if (s) {
      trackerPackageId = s.category === "casino" ? "cazino-national" : "national";
    }
  }

  return (
    <section className="container py-12">
      <div className="max-w-3xl">
        <Link
          href="/cont/articole"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red"
        >
          <ArrowLeft className="h-4 w-4" /> Inapoi la articole
        </Link>

        <h1 className="h1 mt-4">{article.title}</h1>
        <p className="mt-2 text-sm">
          <StatusBadge status={article.status} />
          {article.aiGenerated && (
            <span className="ml-2 inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
              AI
            </span>
          )}
        </p>

        {isReadOnly && (
          <div className="mt-6 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
            Acest articol a fost trimis spre publicare si nu mai poate fi modificat.
            Pentru schimbari, contacteaza-ne pe email.
          </div>
        )}

        {isPublished && (
          <div className="mt-8">
            <ArticleTracker
              publishedAt={article.publishedAt}
              packageId={trackerPackageId}
            />
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <ArticleEditor
            articleId={article.id}
            initial={{
              title: article.title,
              body: article.body || "",
              existingUrl: article.existingUrl || "",
              notes: article.notes || "",
            }}
            initialPhotos={photos.map((p) => ({
              id: p.id,
              url: p.url,
              publicId: p.cloudinaryPublicId,
            }))}
            canGenerate={ent.hasPaid}
            defaultCategory={category}
            readOnly={isReadOnly}
          />
        </div>

        {article.publishedUrls && (
          <div className="mt-8">
            <h2 className="font-serif text-xl font-bold text-brand-navy">Link-uri publicate</h2>
            <ul className="mt-3 list-inside list-disc text-sm text-slate-700">
              {safeParseUrls(article.publishedUrls).map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-red hover:underline break-all"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function safeParseUrls(s: string | null): string[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {}
  return [];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
    submitted: { label: "Trimis", cls: "bg-blue-100 text-blue-800" },
    published: { label: "Publicat", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Respins", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
