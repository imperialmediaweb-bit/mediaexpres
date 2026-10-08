import { redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, isNotNull, notInArray, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { orderSubmissions, orders, users } from "@/db/schema";
import { signOrderToken } from "@/lib/order-token";
import { SITE } from "@/data/site";
import { etichetaSursa } from "@/lib/sursa";
import { etichetaRitm } from "@/lib/ritm";
import { findPackageById } from "@/data/packages";
import { recupereazaAbonamente } from "@/lib/abonamente-comenzi";
import { PrimitExtern } from "./PrimitExtern";
import { ArticolGata } from "@/components/ArticolGata";
import { articolHtml, linkuriImplicite, parseazaLinkuri, linkDescarcarePoza } from "@/lib/articol-html";
import { MarkPublishedButton } from "./MarkPublishedButton";
import { NewOrderForm } from "./NewOrderForm";

export const dynamic = "force-dynamic";

// TOTUL PE UN SINGUR ECRAN: articolul trimis de client dupa plata, pozele,
// datele de contact, plata si statusul. Pana acum astea traiau imprastiate
// (emailuri, Cloudinary, Stripe) si un articol platit a fost de negasit.

/**
 * 03.10.2026 — „să se deschidă cererea articolului pe WhatsApp": butonul din
 * caseta rosie deschide WhatsApp cu mesajul gata scris si linkul de formular
 * al clientului (acelasi link ca in emailul de reamintire). Cu telefonul din
 * Stripe se deschide direct conversatia; fara el, WhatsApp cere sa alegi
 * contactul, iar mesajul e deja in caseta.
 */
function linkWhatsAppCerere(o: { email: string; packageId: string; sessionId: string | null; phone: string | null; amount: number }) {
  let link = `${SITE.url}/articol`;
  try {
    if (o.sessionId) link = `${SITE.url}/articol/${signOrderToken({ sessionId: o.sessionId, email: o.email, packageId: o.packageId })}`;
  } catch {
    /* fara SESSION_SECRET nu putem semna; ramane pagina generala */
  }
  const pachet = findPackageById(o.packageId)?.name || "articolul";
  const text =
    `Bună ziua! Plata pentru ${pachet} (${(o.amount / 100).toFixed(0)} lei) a fost confirmată, vă mulțumim. ` +
    `Ca să publicăm, mai avem nevoie de articol, poze și adresa site-ului. Durează 2 minute, aici: ${link}\n\n` +
    `Dacă preferați, trimiteți-le direct aici, pe WhatsApp, și spuneți-ne și:\n` +
    `1. Ritmul de publicare: toate în 12 ore, întinse pe 3 zile sau pe 2 săptămâni (recomandat pentru SEO)?\n` +
    `2. Variantă unică pentru fiecare ziar (recomandat, fără conținut duplicat) sau exact textul dvs., identic peste tot?\n` +
    `3. Ziarul sau orașul unde doriți promovarea pe Facebook (3 zile, inclusă în preț).\n` +
    `Mulțumim!`;
  const tel = (o.phone || "").replace(/[^\d]/g, "").replace(/^0(7\d{8})$/, "40$1");
  return `https://wa.me/${tel}?text=${encodeURIComponent(text)}`;
}

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function MaterialePage() {
  // Coloana noua (fb_boost_paper) poate lipsi pana la fix-db; o adaugam aici.
  await ensureOrderColumns();
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

  // 07.09.2026 — clientul care a platit cu cardul si n-a trimis materialul.
  // Nu apare in lista de mai jos, fiindca lista arata MATERIALE, iar el n-a
  // trimis niciunul: pana acum se vedea doar daca te uitai in Clienti, comanda
  // cu comanda. Reamintirea automata pleaca oricum la 10 minute (cron
  // materiale-lipsa), dar cine plateste 500 de lei merita si un om.
  // 29.09.2026 — abonamentele platite fara comanda se recupereaza si la
  // deschiderea paginii (nu doar din cron): comanda apare pe loc, iar
  // clientul primeste formularul pe email in aceeasi clipa.
  let eroareAbonamente: string | null = null;
  let abonamenteAdaugate = 0;
  try {
    abonamenteAdaugate = await recupereazaAbonamente();
  } catch (e) {
    eroareAbonamente = e instanceof Error ? e.message : String(e);
    console.error("[admin/materiale] abonamente:", e);
  }

  const platiteFaraMaterial = await db
    .select({
      id: orders.id,
      email: orders.email,
      packageId: orders.packageId,
      amount: orders.amount,
      createdAt: orders.createdAt,
      reminderAt: orders.materialReminderAt,
      sessionId: orders.stripeSessionId,
      // Telefonul vine din Stripe (cand clientul l-a dat) — e pe user, nu pe comanda.
      phone: users.phone,
    })
    .from(orders)
    .leftJoin(users, eq(users.email, orders.email))
    .where(
      and(
        eq(orders.status, "paid"),
        isNotNull(orders.stripeSessionId),
        isNull(orders.materialExternAt),
        rows.length
          ? notInArray(
              orders.stripeSessionId,
              rows.map((r) => r.stripeSessionId).filter(Boolean) as string[],
            )
          : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(20);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold text-brand-navy">Materiale de publicat</h1>
        {/* Comenzile de pe WhatsApp si de la telefon intra tot aici, nu pe o
            usa separata — ca sa existe un singur loc unde stau toate. */}
        <NewOrderForm />
      </div>
      {eroareAbonamente && (
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Nu am putut verifica abonamentele din Stripe: {eroareAbonamente}
        </p>
      )}
      {abonamenteAdaugate > 0 && (
        <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Am găsit {abonamenteAdaugate} {abonamenteAdaugate === 1 ? "abonament plătit fără comandă" : "abonamente plătite fără comandă"}: comanda e creată mai jos, iar clientul a primit acum pe email formularul.
        </p>
      )}
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

      {platiteFaraMaterial.length > 0 && (
        <div className="mt-6 rounded-xl border-2 border-brand-red bg-red-50 p-5">
          <p className="font-serif text-base font-bold text-brand-red">
            {platiteFaraMaterial.length === 1
              ? "O comandă plătită care n-a trimis încă articolul"
              : `${platiteFaraMaterial.length} comenzi plătite care n-au trimis încă articolul`}
          </p>
          <p className="mt-1 text-sm text-red-900">
            Au plătit cu cardul și au închis formularul. Reamintirea pleacă
            automat la 10 minute de la plată; dacă a trecut mult, sună-i sau
            scrie-le pe WhatsApp.
          </p>
          <ul className="mt-3 space-y-2">
            {platiteFaraMaterial.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm"
              >
                <span className="font-semibold text-brand-navy">{o.email}</span>
                <span className="text-slate-500">
                  {findPackageById(o.packageId)?.name || o.packageId} ·{" "}
                  {(o.amount / 100).toFixed(0)} lei · {fmt(o.createdAt)}
                </span>
                <span className={o.reminderAt ? "text-emerald-700" : "text-slate-400"}>
                  {o.reminderAt ? `reamintire trimisă ${fmt(o.reminderAt)}` : "reamintirea n-a plecat încă"}
                </span>
                {o.phone && <span className="text-slate-500">{o.phone}</span>}
                <span className="ml-auto flex gap-2">
                  <PrimitExtern orderId={o.id} />
                  <a
                    href={linkWhatsAppCerere(o)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5b]"
                  >
                    Cere articolul pe WhatsApp
                  </a>
                  <a
                    href={`/admin/trimite-email?to=${encodeURIComponent(o.email)}&sablon=material`}
                    className="rounded-lg border border-brand-red px-3 py-1.5 text-xs font-bold text-brand-red hover:bg-red-100"
                  >
                    pe email
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Niciun material încă. Aici apare automat orice articol trimis prin formularul de după plată.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {rows.map((r) => {
            const pkg = findPackageById(r.packageId);
            let images: { url: string; publicId?: string; capturaSite?: boolean }[] = [];
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
                      {r.ziareAlese && <strong className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">{r.ziareAlese}</strong>}
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
                  {/* 01.10.2026 — ziarul ales de client pentru cele 3 zile de promovare
                      platita se salva din 06.09, dar nu se vedea nicaieri in admin. */}
                  <p>
                    <span className="text-slate-500">Promovare Facebook (3 zile):</span>{" "}
                    {r.fbBoostPaper ? (
                      <strong className="text-brand-navy">{r.fbBoostPaper}</strong>
                    ) : (
                      <span className="text-amber-700">n-a ales — alegi tu ziarul din județul lui</span>
                    )}
                  </p>
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
                  <p><span className="text-slate-500">Sursă:</span> {etichetaSursa(r.source)}</p>
                  <p>
                    <span className="text-slate-500">Ritm:</span>{" "}
                    {r.ritm === "rapid" ? etichetaRitm(r.ritm) : <strong className="text-amber-700">{etichetaRitm(r.ritm)}</strong>}
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
                  {/*
                    01.10.2026 — articolul cu linkurile DEJA puse pe cuvinte, plus
                    „Copiaza cu linkuri" / Word / poze (acelasi ArticolGata ca la
                    parteneri). Fara linkuri cerute, numele firmei → site-ul ei.
                  */}
                  {(() => {
                    const note = linkuriImplicite({ linkNotes: r.linkNotes, companyName: r.companyName, siteUrl: r.siteUrl, body: r.body });
                    const { html, negasite } = articolHtml({ titlu: r.title, corp: r.body, linkNotes: note, dofollow: true });
                    const lista = parseazaLinkuri(note);
                    return (
                      <div className="mt-3">
                        {lista.length > 0 && (
                          <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <strong>Linkuri (dofollow):</strong>{" "}
                            {lista.map((l) => `„${l.ancora || "—"}” → ${l.url}`).join(" · ")}
                            {!r.linkNotes?.trim() && " — clientul n-a cerut linkuri; am pus numele firmei către site."}
                            {negasite.length > 0 && (
                              <span className="block font-semibold text-red-700">
                                Nu găsesc în text: {negasite.map((l) => l.ancora || l.url).join(", ")} — pune-l tu pe un cuvânt potrivit.
                              </span>
                            )}
                          </p>
                        )}
                        <ArticolGata
                          titlu={r.title}
                          html={html}
                          poze={images.map((p) => ({ url: p.url, descarcare: linkDescarcarePoza(p.url) }))}
                          featuredIndex={r.featuredIndex ?? 0}
                        />
                      </div>
                    );
                  })()}
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
                          {img.capturaSite && (
                            <span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              CAPTURĂ SITE — fără poze de la client
                            </span>
                          )}
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
