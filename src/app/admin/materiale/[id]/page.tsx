import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Paperclip, ExternalLink } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions, publicationReports, clientMessages } from "@/db/schema";
import { findPackageById } from "@/data/packages";
import { OrderActions } from "./OrderActions";
import { CopyButton } from "./CopyButton";
import { cleanArticleText } from "@/lib/clean-text";
import { waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// UN SINGUR ECRAN PER COMANDA: articolul, pozele, datele clientului, plata,
// rapoartele trimise si mesajele lui — plus actiunile, acolo. Inainte trebuia
// sarit intre Materiale, Raport publicare, Trimite email si Emailuri, copiind
// manual adresa si titlul intre ele.

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-36 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-brand-navy">{value}</span>
    </div>
  );
}

export default async function MaterialDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = getSession();
  if (!session) redirect(`/admin/login?from=/admin/materiale/${params.id}`);

  const [r] = await db
    .select()
    .from(orderSubmissions)
    .where(eq(orderSubmissions.id, params.id))
    .limit(1);
  if (!r) notFound();

  const pkg = findPackageById(r.packageId);
  const isPublished = r.status === "published";
  const awaitingPay = r.status === "pending_payment";
  const isPaid = r.status === "paid";

  let images: { url: string; publicId?: string }[] = [];
  try {
    images = JSON.parse(r.images || "[]");
  } catch {
    images = [];
  }
  let proof: { url: string; name: string; analiza?: {
    suma: string | null; data: string | null; beneficiar: string | null; iban: string | null;
    platitor: string | null; potrivire: string; observatii: string;
  } } | null = null;
  try {
    proof = r.paymentProof ? JSON.parse(r.paymentProof) : null;
  } catch {
    proof = null;
  }

  // Istoricul clientului, dupa email — leaga comanda de ce i-am trimis deja
  // si de ce ne-a scris, fara sa cauti prin alte pagini.
  const reports = await db
    .select()
    .from(publicationReports)
    .where(eq(publicationReports.email, r.email.toLowerCase()))
    .orderBy(desc(publicationReports.createdAt))
    .limit(5);
  const messages = await db
    .select()
    .from(clientMessages)
    .where(eq(clientMessages.email, r.email.toLowerCase()))
    .orderBy(desc(clientMessages.createdAt))
    .limit(5);

  return (
    <div>
      <Link
        href="/admin/materiale"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Toate materialele
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            awaitingPay
              ? "bg-amber-100 text-amber-900"
              : isPublished
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {awaitingPay ? "⚠️ NEÎNCASATĂ (OP)" : isPaid ? "✅ ÎNCASATĂ — de publicat" : isPublished ? "Publicat" : "DE PUBLICAT"}
        </span>
        {r.isCasino && (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            ⚠️ CAZINO
          </span>
        )}
        <span className="text-sm text-slate-500">
          {fmt(r.createdAt)} · {pkg ? `${pkg.name} — ${pkg.price} RON` : r.packageId}
        </span>
      </div>

      <h1 className="mt-3 font-serif text-2xl font-bold text-brand-navy">{r.title}</h1>

      {/*
        „Ce am de facut ACUM", scris o singura data, sus.
        Pagina avea trei sectiuni numerotate si un badge de stare, dar
        raspunsul la intrebarea reala — care e urmatorul pas — trebuia dedus
        din ele. Banda asta il spune direct, dupa starea comenzii.
      */}
      {(() => {
        const pasi = awaitingPay
          ? {
              culoare: "border-amber-300 bg-amber-50 text-amber-900",
              titlu: "Următorul pas: emite factura și trimite-o",
              text: "Comanda nu e încasată. Emite factura în StartCo pe datele din dreapta, trimite-i-o de mai jos (pe email sau pe WhatsApp), iar când vezi banii în extras apasă „Confirmă plata”. Publicarea e blocată până atunci.",
            }
          : isPaid
            ? {
                culoare: "border-emerald-300 bg-emerald-50 text-emerald-900",
                titlu: "Următorul pas: publică articolul",
                text: "Banii au intrat. Copiază textul, publică pe cele 50 de ziare, apoi apasă „Marchează publicat”.",
              }
            : isPublished
              ? {
                  culoare: "border-sky-300 bg-sky-50 text-sky-900",
                  titlu: "Următorul pas: trimite raportul cu linkurile",
                  text: "Articolul e publicat. Lipește linkurile mai jos și trimite raportul — PDF-ul și Excelul se generează automat.",
                }
              : {
                  culoare: "border-slate-300 bg-slate-50 text-slate-700",
                  titlu: "Următorul pas: publică articolul",
                  text: "Plata e confirmată. Publică pe cele 50 de ziare, apoi marchează comanda ca publicată.",
                };
        return (
          <div className={`mt-4 rounded-xl border-2 p-4 ${pasi.culoare}`}>
            <p className="font-serif text-base font-bold">{pasi.titlu}</p>
            <p className="mt-1 text-sm leading-relaxed">{pasi.text}</p>
          </div>
        );
      })()}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Stanga: materialele */}
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-lg font-bold text-brand-navy">Articolul</h2>
              {/* Curatat la copiere, nu doar la intrare: comenzile vechi sunt deja in
                  baza cu spatii duble si randuri rupte din PDF — exact textul care a
                  ajuns o data pe ziare asa cum era. */}
              <CopyButton text={cleanArticleText(r.body)} label="Copiază textul" />
            </div>
            {r.metaDescription && (
              <p className="mt-2 text-xs text-slate-500">
                <strong>Meta:</strong> {r.metaDescription}
              </p>
            )}
            {r.keywords && (
              <p className="mt-1 text-xs text-slate-500">
                <strong>Cuvinte-cheie:</strong> {r.keywords}
              </p>
            )}

            {/*
              Linkurile, scoase din text si puse la vedere.
              Fara asta, cel care publica trebuia sa citeasca tot articolul ca
              sa ghiceasca ce cuvinte se leaga si unde — sau publica fara
              linkuri, adica exact lucrul pentru care plateste clientul.
            */}
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                Linkuri de pus în articol
              </p>
              {(() => {
                const found = Array.from(
                  new Set((r.body.match(/https?:\/\/[^\s<>")\]]+/gi) || []).map((u) =>
                    u.replace(/[.,;:)]+$/, ""),
                  )),
                );
                const site = r.siteUrl?.trim();
                const all = site && !found.includes(site) ? [site, ...found] : found;
                if (all.length === 0) {
                  return (
                    <p className="mt-1 text-xs text-slate-600">
                      Niciun link în text. Cel mai des, clientul a scris articolul în Word
                      cu linkuri puse pe cuvinte — la lipire rămâne doar textul ancoră, iar
                      adresa se pierde. Caută în articol expresii care sună a link (&bdquo;poți
                      accesa…&rdquo;, numele firmei, numele serviciului) și leagă-le către site-ul
                      lui. Dacă nu ai nici site, întreabă-l înainte să publici.
                    </p>
                  );
                }
                return (
                  <ul className="mt-2 space-y-1">
                    {all.map((u) => (
                      <li key={u} className="flex items-center gap-2 text-xs">
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate font-mono text-brand-red hover:underline"
                        >
                          {u}
                        </a>
                        <CopyButton text={u} label="copiază" />
                      </li>
                    ))}
                  </ul>
                );
              })()}
              <p className="mt-2 text-[11px] leading-relaxed text-amber-900">
                Dacă linkul apare scris în text, leagă exact cuvintele din jurul lui.
                Dacă nu apare deloc, ancora implicită e numele firmei
                {r.companyName ? ` („${r.companyName}")` : ""} către site.
              </p>
            </div>
            <div className="mt-3 max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {r.body}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-lg font-bold text-brand-navy">
              Poze ({images.length}/3)
            </h2>
            {images.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Clientul nu a urcat nicio poză — publici cu o imagine tematică sau i-o ceri
                din secțiunea de mai jos.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <a
                    key={img.url}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="h-32 w-44 rounded-lg border border-slate-200 object-cover"
                    />
                    {i === r.featuredIndex && (
                      <span className="absolute left-1 top-1 rounded bg-brand-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                        REPREZENTATIVĂ
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </section>

          <OrderActions
            id={r.id}
            email={r.email}
            clientName={r.companyName || ""}
            articleTitle={r.title}
            contactPhone={r.contactPhone}
            isPublished={isPublished}
            awaitingPayment={awaitingPay}
          />
        </div>

        {/* Dreapta: clientul si istoricul */}
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-lg font-bold text-brand-navy">Clientul</h2>
            <div className="mt-2">
              <Row label="Firmă" value={<strong>{r.companyName || "—"}</strong>} />
              <Row
                label="Email"
                value={
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs">{r.email}</span>
                    <CopyButton text={r.email} label="copiază" />
                  </span>
                }
              />
              <Row
                label="Telefon"
                value={
                  waLink(r.contactPhone) ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{r.contactPhone}</span>
                      <a
                        href={waLink(r.contactPhone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        WhatsApp
                      </a>
                    </span>
                  ) : (
                    r.contactPhone || "—"
                  )
                }
              />
              {r.companyCui && <Row label="CUI" value={<strong>{r.companyCui}</strong>} />}
              {r.companyAddress && <Row label="Adresă" value={r.companyAddress} />}
              <Row
                label="Site"
                value={
                  r.siteUrl ? (
                    <a
                      href={r.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-red hover:underline"
                    >
                      {r.siteUrl}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-lg font-bold text-brand-navy">Comanda</h2>
            <div className="mt-2">
              <Row
                label="Plată"
                value={
                  r.paymentMethod === "op" ? (
                    <strong className="text-amber-700">transfer bancar (OP)</strong>
                  ) : (
                    "card (Stripe)"
                  )
                }
              />
              <Row
                label="Publicare"
                value={
                  r.uniquePerSite ? (
                    "variantă unică pe fiecare ziar"
                  ) : (
                    <strong className="text-amber-700">IDENTIC pe toate</strong>
                  )
                }
              />
              <Row label="Facebook" value={r.facebookOptIn ? "da" : "NU (refuzat)"} />
              <Row label="Scris cu AI" value={r.generatedByAi ? "da" : "text propriu"} />
              <Row
                label="Referință"
                value={<span className="font-mono text-[11px]">{r.stripeSessionId}</span>}
              />
              {r.publishedAt && <Row label="Publicat la" value={fmt(r.publishedAt)} />}
            </div>
            {proof && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Dovada plății:</span>{" "}
                <a
                  href={proof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-red hover:underline"
                >
                  {proof.name}
                </a>
                {/* Ce a citit chatul pe dovada, ca sa confirmi dintr-o privire.
                    E o citire a pozei, nu o verificare bancara. */}
                {proof.analiza && (
                  <span className="mt-2 block border-t border-amber-200 pt-2 text-xs text-slate-700">
                    <strong>
                      {proof.analiza.potrivire === "da"
                        ? "✅ Se potrivește"
                        : proof.analiza.potrivire === "partial"
                          ? "⚠️ Parțial — verifică"
                          : proof.analiza.potrivire === "nu"
                            ? "❌ Nu pare dovadă de plată"
                            : "❔ Necitită automat"}
                    </strong>
                    {" · "}
                    {[proof.analiza.suma, proof.analiza.data, proof.analiza.beneficiar, proof.analiza.platitor && `de la ${proof.analiza.platitor}`]
                      .filter(Boolean)
                      .join(" · ") || "fără date"}
                    {proof.analiza.observatii && <span className="block text-slate-500">{proof.analiza.observatii}</span>}
                    <span className="block text-slate-500">Confirmă în extras înainte să publici.</span>
                  </span>
                )}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-lg font-bold text-brand-navy">Istoric</h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rapoarte trimise
            </p>
            {reports.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Niciunul încă.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {reports.map((rep) => {
                  let count = 0;
                  try {
                    count = (JSON.parse(rep.links || "[]") as unknown[]).length;
                  } catch {
                    count = 0;
                  }
                  return (
                    <li key={rep.id} className="text-slate-700">
                      {fmt(rep.createdAt)} — <strong>{count}</strong> linkuri
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mesaje
            </p>
            {messages.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Niciunul.</p>
            ) : (
              <ul className="mt-1 space-y-2 text-sm">
                {messages.map((m) => (
                  <li key={m.id} className="text-slate-700">
                    <span className="text-xs text-slate-500">
                      {m.fromClient ? "Client" : "Noi"} · {fmt(m.createdAt)}
                    </span>
                    <br />
                    <span className="line-clamp-2">{m.body}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/admin/emailuri?q=${encodeURIComponent(r.email)}`}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"
            >
              Toate emailurile cu el <ExternalLink className="h-3 w-3" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
