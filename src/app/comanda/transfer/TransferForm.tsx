"use client";

import { useState } from "react";
import { Loader2, Upload, X, CheckCircle2, FileCheck } from "lucide-react";
import {
  signAndUpload,
  MAX_UPLOAD_BYTES as MAX_BYTES,
  reportUploadError,
  UPLOAD_FALLBACK_HINT,
  type Uploaded,
} from "@/lib/upload-client";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";
import { SITE } from "@/data/site";
import { ContentDeclaration } from "@/components/forms/ContentDeclaration";
import { CONTENT_DECLARATION_ERROR } from "@/lib/content-policy";

export function TransferForm({
  packageId,
  price,
  isCasino,
  // Emailul scris deja pe pagina de oferta — sa nu-l ceara nimeni de doua ori.
  initialEmail = "",
}: {
  packageId: string;
  price: number;
  isCasino: boolean;
  initialEmail?: string;
}) {
  const [f, setF] = useState({
    email: initialEmail,
    contactPhone: "",
    companyName: "",
    companyCui: "",
    companyAddress: "",
    title: "",
    body: "",
    siteUrl: "",
    linkNotes: "",
  });
  const [images, setImages] = useState<Uploaded[]>([]);
  const [proof, setProof] = useState<Uploaded | null>(null);
  const [uniquePerSite, setUniquePerSite] = useState(true);
  const [facebookOptIn, setFacebookOptIn] = useState(true);
  const [contentDeclaration, setContentDeclaration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"images" | "proof" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set(k: keyof typeof f, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function handleUpload(list: FileList | null, kind: "images" | "proof") {
    if (!list?.length) return;
    setError(null);
    setUploading(kind);
    try {
      if (kind === "proof") {
        const file = list[0];
        if (file.size > MAX_BYTES) throw new Error("Fișierul depășește 8MB.");
        setProof(await signAndUpload(file));
      } else {
        const next = [...images];
        for (const file of Array.from(list)) {
          if (next.length >= 3) break;
          if (file.size > MAX_BYTES) {
            setError(`„${file.name}" depășește 8MB.`);
            continue;
          }
          next.push(await signAndUpload(file));
        }
        setImages(next);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Eroare la încărcare";
      // Aflam si noi, pe loc. Altfel eroarea ramane doar pe ecranul lui.
      reportUploadError(`comanda/transfer:${kind}`, msg);
      setError(`${msg} ${UPLOAD_FALLBACK_HINT}`);
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    if (busy) return;
    // Dovada platii NU mai e ceruta: clientul comanda intai, primeste factura
    // pe email si plateste dupa. Cerinta veche il obliga sa fi platit inainte
    // sa aiba vreun document — de-asta nu trimitea nimeni formularul.
    if (f.body.trim().length < 100) {
      setError("Articolul trebuie să aibă minimum 100 de caractere.");
      return;
    }
    if (!contentDeclaration) {
      setError(CONTENT_DECLARATION_ERROR);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comanda/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          isCasino,
          ...f,
          email: f.email.trim(),
          images,
          featuredIndex: 0,
          ...(proof ? { paymentProof: proof } : {}),
          facebookOptIn,
          uniquePerSite,
          contentDeclaration,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Eroare");
      // Comanda OP e o initiere de checkout in GA4 — altfel toata calea de
      // transfer bancar era invizibila in masurarea conversiei.
      trackGaEvent("begin_checkout", { value: price, currency: "RON", payment_type: "op" });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 font-serif text-2xl font-bold text-emerald-900">
          Am primit comanda ta
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-emerald-800">
          Ți-am trimis pe email confirmarea cu pașii următori. Primești în scurt timp
          <strong> factura fiscală</strong>, plătești prin transfer pe baza ei, iar imediat
          ce vedem încasarea publicăm articolul — în maximum 24 de ore lucrătoare — și îți
          trimitem raportul cu toate cele 50 de linkuri.
        </p>
      </div>
    );
  }

  const label = "mb-1 block text-sm font-medium text-slate-700";
  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none";

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">1. Date de facturare</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pe acestea emitem factura fiscală, transmisă și prin eFactura.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Email *</label>
            <input type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} className={input} placeholder="nume@firma.ro" />
            {/*
              Avertisment scurt, langa camp: TOT ce datoram clientului pleaca
              spre adresa asta — factura si raportul cu cele 50 de linkuri. O
              litera gresita si omul nu primeste nimic, iar noi aflam abia cand
              ne scrie ca „n-a venit nimic".
            */}
            <p className="mt-1 text-xs text-slate-500">
              Verifică adresa — aici primești factura și raportul cu linkurile. Dacă
              greșești, scrie-ne pe WhatsApp la {SITE.phone}.
            </p>
          </div>
          <div>
            <label className={label}>Telefon *</label>
            <input type="tel" required value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={input} placeholder="07xx xxx xxx" />
          </div>
          <div>
            <label className={label}>Denumire firmă *</label>
            <input required value={f.companyName} onChange={(e) => set("companyName", e.target.value)} className={input} placeholder="Firma Mea SRL" />
          </div>
          <div>
            <label className={label}>CUI *</label>
            <input required value={f.companyCui} onChange={(e) => set("companyCui", e.target.value)} className={input} placeholder="RO12345678" />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Adresă *</label>
            <input required value={f.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} className={input} placeholder="Str., nr., oraș, județ" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          2. Dovada plății <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 align-middle">opțional</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          <strong>Nu trebuie să fi plătit ca să comanzi.</strong> După trimitere primești
          factura pe email și plătești pe baza ei. Dacă ai făcut deja transferul,
          încarcă dovada aici (imagine sau PDF) și confirmăm mai repede.
        </p>
        {proof ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <FileCheck className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{proof.name}</span>
            <button type="button" onClick={() => setProof(null)} aria-label="Șterge" className="ml-auto text-emerald-700 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-navy">
            {uploading === "proof" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading === "proof" ? "Se încarcă..." : "Încarcă dovada plății"}
            <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploading !== null} onChange={(e) => { void handleUpload(e.target.files, "proof"); e.target.value = ""; }} />
          </label>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">3. Articolul</h2>
        <p className="mt-1 text-sm text-slate-600">
          Nu ai articol scris? Trimite comanda cu o descriere scurtă a firmei și a ce vrei
          să comunici, iar noi îl redactăm și ți-l trimitem spre aprobare.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className={label}>Titlu *</label>
            <input required value={f.title} onChange={(e) => set("title", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Textul articolului (sau descrierea a ce vrei comunicat) *</label>
            <textarea required rows={10} value={f.body} onChange={(e) => set("body", e.target.value)} className={input} />
            <p className="mt-1 text-xs text-slate-500">{f.body.length} caractere (minimum 100)</p>
            {/*
              Avertismentul asta a fost scris dupa o comanda reala: clientul a
              redactat articolul in Word, cu linkuri puse pe cuvinte, iar la
              lipire in formular a ramas doar textul ancora — adresele s-au
              pierdut pe drum, si n-aveam de unde sti unde trebuiau sa duca.
            */}
            <p className="mt-1 text-xs text-amber-700">
              Dacă ai copiat textul din Word, linkurile puse pe cuvinte se pierd — scrie
              adresele direct în text (ex. &bdquo;vezi la https://firma.ro&rdquo;) sau trece-le mai jos.
            </p>
          </div>
          <div>
            <label className={label}>Site-ul firmei</label>
            <input value={f.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} className={input} placeholder="https://firma.ro" />
          </div>
          <div>
            <label className={label}>
              Linkurile dorite <span className="font-normal text-slate-500">(opțional — până la 3)</span>
            </label>
            <textarea
              rows={3}
              value={f.linkNotes}
              onChange={(e) => set("linkNotes", e.target.value)}
              className={input}
              placeholder={"stație ITP Sector 5 → https://firma.ro\nprogramare online → https://firma.ro/contact"}
            />
            <p className="mt-1 text-xs text-slate-500">
              Scrie ce cuvinte din articol să fie link și către ce adresă. Dacă lași gol,
              punem numele firmei ca link către site.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className={label}>Poze (maximum 3)</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-navy">
            {uploading === "images" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading === "images" ? "Se încarcă..." : "Adaugă poze"}
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading !== null || images.length >= 3} onChange={(e) => { void handleUpload(e.target.files, "images"); e.target.value = ""; }} />
          </label>
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-24 w-32 rounded-lg border border-slate-200 object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Șterge poza" className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-slate-200 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={uniquePerSite} onChange={(e) => setUniquePerSite(e.target.checked)} className="mt-1" />
            <span className="text-slate-700">
              Publicați o variantă unică pe fiecare ziar (recomandat — fără conținut duplicat).
              Debifează dacă textul trebuie să apară identic peste tot.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={facebookOptIn} onChange={(e) => setFacebookOptIn(e.target.checked)} className="mt-1" />
            <span className="text-slate-700">Distribuiți articolul și pe paginile de Facebook asociate.</span>
          </label>
        </div>
      </section>

      <ContentDeclaration checked={contentDeclaration} onChange={setContentDeclaration} />

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy || uploading !== null}
        className="w-full rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {busy ? "Se trimite..." : `Trimite comanda — ${price.toLocaleString("ro")} lei`}
      </button>
    </div>
  );
}
