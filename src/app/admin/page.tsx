import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, orders, subscriptions, articles, publishers, orderSubmissions } from "@/db/schema";
import { count, eq, sql, desc, and, or, gte } from "drizzle-orm";
import { findPackageById } from "@/data/packages";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { etichetaSursa } from "@/lib/sursa";

export const dynamic = "force-dynamic";

function formatRON(cents: number) {
  return (cents / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
  });
}

export default async function AdminHome() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin");

  const [[u], [o], [s], [a], [p], paidSum, pendingArticles, pendingPublishers] =
    await Promise.all([
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(orders).where(eq(orders.status, "paid")),
      db
        .select({ n: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active")),
      db.select({ n: count() }).from(articles),
      db
        .select({ n: count() })
        .from(publishers)
        .where(eq(publishers.status, "pending")),
      db
        .select({ total: sql<number>`COALESCE(SUM(${orders.amount}), 0)` })
        .from(orders)
        .where(eq(orders.status, "paid")),
      db
        .select({ n: count() })
        .from(articles)
        .where(eq(articles.status, "submitted")),
      db
        .select({ n: count() })
        .from(publishers)
        .where(eq(publishers.status, "pending")),
    ]);

  // 13.09.2026 — pana azi cifra de aici era DOAR ce a intrat prin Stripe.
  // Comenzile luate pe WhatsApp sau prin transfer nu trec niciodata prin
  // tabela `orders`, deci vreo 3.500 de lei pe septembrie pur si simplu nu
  // existau pe prima pagina. `order_submission` n-are coloana de suma —
  // pretul vine din pachet — asa ca il adunam aici, din `packageId`.
  await ensureOrderColumns();
  const opRows = await db
    .select({
      packageId: orderSubmissions.packageId,
      createdAt: orderSubmissions.createdAt,
      source: orderSubmissions.source,
    })
    .from(orderSubmissions)
    .where(
      and(
        eq(orderSubmissions.paymentMethod, "op"),
        or(eq(orderSubmissions.status, "paid"), eq(orderSubmissions.status, "published")),
      ),
    );
  const pretPachet = (id: string) => (findPackageById(id)?.price ?? 0) * 100;
  const opCents = opRows.reduce((s, r) => s + pretPachet(r.packageId), 0);

  // Luna curenta, ora Romaniei: cifra dupa care se decide cat bagi in reclama.
  const acum = new Date();
  const inceputLuna = new Date(
    new Date(acum.toLocaleString("en-US", { timeZone: "Europe/Bucharest" })).getFullYear(),
    new Date(acum.toLocaleString("en-US", { timeZone: "Europe/Bucharest" })).getMonth(),
    1,
  );
  const [lunaCard] = await db
    .select({ total: sql<number>`COALESCE(SUM(${orders.amount}), 0)` })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.createdAt, inceputLuna)));
  const lunaOpCents = opRows
    .filter((r) => r.createdAt && new Date(r.createdAt) >= inceputLuna)
    .reduce((s, r) => s + pretPachet(r.packageId), 0);

  const cardCents = Number(paidSum[0]?.total || 0);
  const totalCents = cardCents + opCents;
  const lunaCents = Number(lunaCard?.total || 0) + lunaOpCents;
  const numeLuna = inceputLuna.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  /**
   * 22.09.2026 — „de unde vin banii", intr-un tabel.
   *
   * Sursa se salva pe fiecare comanda inca din 13.09 (cookie `me_src`, vezi
   * lib/sursa.ts), dar nu se vedea nicaieri adunata. Asa s-a ajuns ca decizia
   * „mai bag in reclama sau nu?" sa se ia din amintiri: pixelul Meta numara 5
   * vanzari, iar o comanda de 1.200 de lei venita tot din reclama, dar platita
   * prin transfer, nu aparea in niciun raport.
   *
   * Aici se aduna AMANDOUA drumurile — card si transfer — pe aceeasi sursa.
   * Asta e cifra dupa care se decide bugetul, nu ce spune platforma despre ea
   * insasi.
   */
  const cardSurse = await db
    .select({ source: orders.source, amount: orders.amount, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.status, "paid"));

  const de30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const peSursa = new Map<string, { total: number; comenzi: number; total30: number; comenzi30: number }>();
  function adauga(sursa: string | null, cents: number, cand: Date | null) {
    const cheie = sursa || "";
    const r = peSursa.get(cheie) || { total: 0, comenzi: 0, total30: 0, comenzi30: 0 };
    r.total += cents;
    r.comenzi += 1;
    if (cand && new Date(cand) >= de30) {
      r.total30 += cents;
      r.comenzi30 += 1;
    }
    peSursa.set(cheie, r);
  }
  for (const r of cardSurse) adauga(r.source, Number(r.amount || 0), r.createdAt);
  for (const r of opRows) adauga(r.source, pretPachet(r.packageId), r.createdAt);

  const surse = [...peSursa.entries()]
    .map(([sursa, v]) => ({ sursa, ...v }))
    .sort((a, b) => b.total30 - a.total30 || b.total - a.total);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Privire generală peste afacere. Click pe un card pentru detalii.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat href="/admin/comenzi" label="Total încasat (card + transfer)" value={formatRON(totalCents)} tone="gold" />
        <Stat href="/admin/materiale" label={`Încasat în ${numeLuna}`} value={formatRON(lunaCents)} tone="gold" />
        <Stat href="/admin/clienti" label="Clienți (users)" value={u.n} />
        <Stat href="/admin/abonamente" label="Abonamente active" value={s.n} />
        <Stat href="/admin/comenzi" label="Comenzi plătite" value={o.n} />
        <Stat href="/admin/articole" label="Articole (total)" value={a.n} />
        <Stat
          href="/admin/articole?status=submitted"
          label="Articole de aprobat"
          value={pendingArticles[0]?.n || 0}
          tone={pendingArticles[0]?.n ? "red" : undefined}
        />
        <Stat
          href="/admin/parteneri"
          label="Aplicații ziare noi"
          value={pendingPublishers[0]?.n || 0}
          tone={pendingPublishers[0]?.n ? "red" : undefined}
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Din total: <strong>{formatRON(cardCents)}</strong> prin card (Stripe) și{" "}
        <strong>{formatRON(opCents)}</strong> prin transfer bancar sau comenzi luate pe
        WhatsApp, marcate încasate. Comenzile de pe WhatsApp intră în socoteală doar după
        ce le adaugi din <Link href="/admin/materiale" className="underline">Materiale</Link>{" "}
        și bifezi &bdquo;banii au intrat deja&rdquo;.
      </p>

      {/* De unde vin banii — card si transfer adunate pe aceeasi sursa. */}
      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-xl font-bold text-brand-navy">De unde vin banii</h2>
        <p className="mt-1 text-sm text-slate-600">
          Card și transfer la un loc, pe sursa reținută la prima vizită. Cine a venit din
          reclamă și a plătit prin transfer apare tot la reclamă — pixelul platformei nu-l
          vede niciodată.
        </p>

        {surse.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Încă nicio comandă.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4 font-semibold">Sursă</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Ultimele 30 zile</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Comenzi</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Total</th>
                  <th className="pb-2 text-right font-semibold">Comenzi</th>
                </tr>
              </thead>
              <tbody>
                {surse.map((r) => (
                  <tr key={r.sursa || "necunoscuta"} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 font-medium text-brand-navy">
                      {etichetaSursa(r.sursa || null)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold">
                      {r.total30 ? formatRON(r.total30) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-500">{r.comenzi30 || "—"}</td>
                    <td className="py-2.5 pr-4 text-right">{formatRON(r.total)}</td>
                    <td className="py-2.5 text-right text-slate-500">{r.comenzi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          &bdquo;Necunoscută&rdquo; sunt comenzile de dinainte de 13 septembrie, când am
          început să reținem sursa, plus cele adăugate manual. Sursa se ține 90 de zile și
          un click de reclamă o suprascrie mereu — cine a venit din reclamă și peste o
          săptămână a tastat adresa direct rămâne tot al reclamei.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <RecentArticles />
        <RecentOrders />
      </div>
    </div>
  );
}

function Stat({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: string | number;
  tone?: "gold" | "red";
}) {
  const toneCls =
    tone === "gold"
      ? "border-brand-gold/40 bg-brand-gold/5"
      : tone === "red"
      ? "border-brand-red/30 bg-brand-red/5"
      : "border-slate-200";
  return (
    <Link
      href={href}
      className={`block rounded-xl border bg-white p-5 transition hover:shadow-md ${toneCls}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">{value}</p>
    </Link>
  );
}

async function RecentArticles() {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      createdAt: articles.createdAt,
      userEmail: users.email,
    })
    .from(articles)
    .leftJoin(users, eq(articles.userId, users.id))
    .orderBy(desc(articles.createdAt))
    .limit(5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Articole recente
        </h2>
        <Link
          href="/admin/articole"
          className="text-xs text-brand-red hover:underline"
        >
          Toate →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Niciun articol înca.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
            >
              <Link
                href={`/admin/articole/${a.id}`}
                className="flex-1 min-w-0 text-sm text-brand-navy hover:text-brand-red"
              >
                <p className="truncate font-medium">{a.title}</p>
                <p className="text-xs text-slate-500">{a.userEmail || "—"}</p>
              </Link>
              <StatusBadge kind="article" status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function RecentOrders() {
  const rows = await db
    .select({
      id: orders.id,
      amount: orders.amount,
      packageId: orders.packageId,
      createdAt: orders.createdAt,
      status: orders.status,
      email: orders.email,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-brand-navy">
          Plăți recente
        </h2>
        <Link
          href="/admin/comenzi"
          className="text-xs text-brand-red hover:underline"
        >
          Toate →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nicio plată înca.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-navy">
                  {o.packageId}
                </p>
                <p className="text-xs text-slate-500">{o.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-navy">
                  {formatRON(o.amount)}
                </p>
                <StatusBadge kind="order" status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({
  kind,
  status,
}: {
  kind: "article" | "order";
  status: string;
}) {
  const articleMap: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-700" },
    submitted: { label: "De aprobat", cls: "bg-amber-100 text-amber-800" },
    published: { label: "Publicat", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Respins", cls: "bg-red-100 text-red-700" },
  };
  const orderMap: Record<string, { label: string; cls: string }> = {
    paid: { label: "Platit", cls: "bg-green-100 text-green-800" },
    pending: { label: "În așteptare", cls: "bg-amber-100 text-amber-800" },
    refunded: { label: "Rambursat", cls: "bg-slate-100 text-slate-700" },
    canceled: { label: "Anulat", cls: "bg-red-100 text-red-700" },
  };
  const s = (kind === "article" ? articleMap : orderMap)[status] || {
    label: status,
    cls: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
