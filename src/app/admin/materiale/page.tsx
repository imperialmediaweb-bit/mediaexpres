import { redirect } from "next/navigation";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { findPackageById } from "@/data/packages";
import { MarkPublishedButton } from "./MarkPublishedButton";

export const dynamic = "force-dynamic";

// TOTUL PE UN SINGUR ECRAN: articolul trimis de client dupa plata, pozele,
// datele de contact, plata si statusul. Pana acum astea traiau imprastiate
// (emailuri, Cloudinary, Stripe) si un articol platit a fost de negasit.

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function MaterialePage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/materiale");

  const rows = await db
    .select()
    .from(orderSubmissions)
    .orderBy(desc(orderSubmissions.createdAt))
    .limit(100);

  const pending = rows.filter((r) => r.status === "pending").length;
  // Comenzile prin OP asteapta confirmarea incasarii inainte de publicare.
  const awaitingPayment = rows.filter((r) => r.status === "pending_payment").length;

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Materiale de publicat</h1>
      <p className="mt-2 text-sm text-slate-600">
        Articolele trimise de clienți după plată — text, poze și contact, într-un singur loc.
        {pending > 0 && (
          <strong className="ml-2 text-brand-red">{pending} de publicat.</strong>
        )}
        {awaitingPayment > 0 && (
          <strong className="ml-2 text-amber-700">
            {awaitingPayment} așteaptă confirmarea plății (OP).
          </strong>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Niciun material încă. Aici apare automat orice articol trimis prin formularul de după plată.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {rows.map((r) => {
            const pkg = findPackageById(r.packageId);
            let images: { url: string; publicId?: string }[] = [];
            try {
              images = JSON.parse(r.images || "[]");
            } catch {
              images = [];
            }
            const isPending = r.status === "pending";
            const isPaid = r.status === "paid";
            // OP: materialele au ajuns, dar incasarea nu e confirmata. Fara
            // starea asta distincta, comanda aparea verde, ca si cum ar fi
            // fost publicata — exact greseala care duce la publicare neplatita.
            const awaitingPay = r.status === "pending_payment";
            let proof: { url: string; name: string } | null = null;
            try {
              proof = r.paymentProof ? JSON.parse(r.paymentProof) : null;
            } catch {
              proof = null;
            }
            return (
              <div
                key={r.id}
                className={`rounded-xl border bg-white ${
                  awaitingPay
                    ? "border-amber-400"
                    : isPending
                      ? "border-brand-red/40"
                      : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <span
                      className={`mr-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        awaitingPay
                          ? "bg-amber-100 text-amber-900"
                          : isPending
                            ? "bg-red-100 text-red-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {awaitingPay
                        ? "⚠️ NEÎNCASATĂ (OP) — trimite factura"
                        : isPaid
                          ? "✅ ÎNCASATĂ — de publicat"
                          : isPending
                            ? "DE PUBLICAT"
                            : "Publicat"}
                    </span>
                    {r.isCasino && (
                      <span className="mr-3 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        ⚠️ CAZINO
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {fmt(r.createdAt)} · {pkg ? `${pkg.name} — ${pkg.price} RON` : r.packageId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Pe OP neincasat NU oferim publicarea din lista: intai
                        se confirma plata, in pagina comenzii. */}
                    {(isPending || isPaid) && <MarkPublishedButton id={r.id} />}
                    <Link
                      href={`/admin/materiale/${r.id}`}
                      className="text-sm font-semibold text-brand-red hover:underline"
                    >
                      Deschide →
                    </Link>
                  </div>
                </div>

                <div className="grid gap-x-8 gap-y-1 px-5 py-4 text-sm sm:grid-cols-2">
                  <p><span className="text-slate-500">Client:</span> <strong>{r.companyName || "—"}</strong></p>
                  <p><span className="text-slate-500">Email:</span> <span className="font-mono">{r.email}</span></p>
                  <p><span className="text-slate-500">Telefon:</span> {r.contactPhone || "—"}</p>
                  <p>
                    <span className="text-slate-500">Site:</span>{" "}
                    {r.siteUrl ? (
                      <a href={r.siteUrl} target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">{r.siteUrl}</a>
                    ) : "—"}
                  </p>
                  <p><span className="text-slate-500">Facebook:</span> {r.facebookOptIn ? "da" : "NU (refuzat)"}</p>
                  <p>
                    <span className="text-slate-500">Publicare:</span>{" "}
                    {r.uniquePerSite ? (
                      "variantă unică pe fiecare ziar"
                    ) : (
                      <strong className="text-amber-700">IDENTIC pe toate (cerut de client)</strong>
                    )}
                  </p>
                  <p>
                    <span className="text-slate-500">Plată:</span>{" "}
                    {r.paymentMethod === "op" ? (
                      <strong className="text-amber-700">transfer bancar (OP)</strong>
                    ) : (
                      "card (Stripe)"
                    )}
                  </p>
                  <p><span className="text-slate-500">Referință:</span> <span className="font-mono text-xs">{r.stripeSessionId}</span></p>
                  {r.companyCui && (
                    <p><span className="text-slate-500">CUI:</span> <strong>{r.companyCui}</strong></p>
                  )}
                  {r.companyAddress && (
                    <p className="sm:col-span-2"><span className="text-slate-500">Adresă facturare:</span> {r.companyAddress}</p>
                  )}
                </div>

                {proof && (
                  <div className="border-t border-slate-100 bg-amber-50/60 px-5 py-3 text-sm">
                    <span className="text-slate-600">Dovada plății:</span>{" "}
                    <a
                      href={proof.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-red hover:underline"
                    >
                      {proof.name}
                    </a>
                    {awaitingPay && (
                      <span className="ml-2 text-amber-800">
                        — verifică extrasul înainte de publicare
                      </span>
                    )}
                  </div>
                )}

                <div className="border-t border-slate-100 px-5 py-4">
                  <h2 className="font-serif text-lg font-bold text-brand-navy">{r.title}</h2>
                  {r.metaDescription && (
                    <p className="mt-1 text-xs text-slate-500"><strong>Meta:</strong> {r.metaDescription}</p>
                  )}
                  {r.keywords && (
                    <p className="mt-1 text-xs text-slate-500"><strong>Cuvinte-cheie:</strong> {r.keywords}</p>
                  )}
                  <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                    {r.body}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Poze ({images.length}/3)
                  </p>
                  {images.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Clientul nu a urcat nicio poză — publici cu o imagine tematică sau i-o ceri pe email.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {images.map((img, i) => (
                        <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="relative block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" className="h-28 w-40 rounded-lg border border-slate-200 object-cover" />
                          {i === r.featuredIndex && (
                            <span className="absolute left-1 top-1 rounded bg-brand-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                              REPREZENTATIVĂ
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
