"use client";

import { RitmSelect } from "@/components/forms/RitmSelect";
import { RITM_IMPLICIT, type RitmId } from "@/lib/ritm";

import { useState } from "react";
import { Loader2, Sparkles, Upload, X, Star, CheckCircle2 } from "lucide-react";
import {
  reportUploadError,
  UPLOAD_FALLBACK_HINT,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload-client";
import { ContentDeclaration } from "@/components/forms/ContentDeclaration";
import { CONTENT_DECLARATION_ERROR, POZE_OBLIGATORII, POZE_OBLIGATORII_MESAJ } from "@/lib/content-policy";
import { FormError } from "@/components/forms/FormError";
import { FbBoostSelect } from "@/components/forms/FbBoostSelect";
import { importaDocx, mesajImportDocx } from "@/lib/docx-client";
import { comprimaPoza } from "@/lib/comprima-poza";
import { SITE } from "@/data/site";

type Mode = "ai" | "write";

interface UploadedImage {
  url: string;
  publicId?: string;
}

const MAX_IMAGES = 3;

export function ArticleForm({
  token,
  email,
  isCasino,
  newspapers = 50,
}: {
  token: string;
  email: string;
  isCasino: boolean;
  newspapers?: number;
}) {
  const [mode, setMode] = useState<Mode>("ai");

  const [companyName, setCompanyName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [cui, setCui] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [brief, setBrief] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [generatedByAi, setGeneratedByAi] = useState(false);
  const [contentDeclaration, setContentDeclaration] = useState(false);

  const [images, setImages] = useState<UploadedImage[]>([]);
  // 13.09.2026 — a treia comanda la rand sosita „Imagini (0/3)". Sectiunea
  // de poze era optionala si tacuta, iar omul trecea peste ea. Decizia
  // user: aici (dupa plata) pozele sunt OBLIGATORII, 3 — vezi
  // POZE_OBLIGATORII in content-policy. Trimiterea e blocata pana le urca.
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [facebookOptIn, setFacebookOptIn] = useState(true);
  const [fbBoostPaper, setFbBoostPaper] = useState("");
  // Implicit rescriem unic pentru fiecare ziar (fara continut duplicat).
  // Clientul poate cere textul identic peste tot — comunicat oficial, text
  // aprobat juridic — caz in care nu atingem nimic.
  const [uniquePerSite, setUniquePerSite] = useState(true);
  const [ritm, setRitm] = useState<RitmId>(RITM_IMPLICIT);

  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Eroarea de la poze se arata LANGA poze, nu doar jos langa „Trimite":
  // pe telefon, jos nu se vede, iar omul crede ca poza a intrat.
  const [pozeEroare, setPozeEroare] = useState<string | null>(null);
  /**
   * 22.09.2026 — un client care PLATISE a ramas blocat: incarcarea pozelor
   * ii pica in browser, iar cele 3 poze obligatorii nu-l lasau sa trimita
   * nimic. Bani luati, om captiv. Zidul ramane pentru cine n-a incercat;
   * se deschide doar dupa ce incarcarea a esuat MACAR o data (pozeEroare) si
   * doar la a doua apasare, ca sa fie o decizie, nu o scapare.
   */
  const [faraPozeConfirmat, setFaraPozeConfirmat] = useState(false);
  const [done, setDone] = useState(false);

  async function generate() {
    if (generating) return;
    setError(null);
    setNotice(null);
    if (brief.trim().length < 20) {
      setError("Scrie câteva propoziții despre ce vrei să comunici (minim 20 de caractere).");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/articol/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, brief, companyName, siteUrl }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Generarea a eșuat");

      setTitle(json.article.title);
      setBody(json.article.body);
      setMetaDescription(json.article.metaDescription || "");
      setKeywords(json.article.keywords || []);
      setGeneratedByAi(true);
      setNotice(
        json.siteRead
          ? "Am citit site-ul și am scris articolul. Verifică-l și editează ce vrei."
          : "Am scris articolul din descrierea ta. (Site-ul nu a putut fi citit.) Verifică-l înainte de trimitere.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generarea a eșuat");
    } finally {
      setGenerating(false);
    }
  }

  /**
   * 22.09.2026 — BUG-UL, gasit dupa o luna de reclamatii „nu ma lasa sa urc
   * pozele, nici jpg nici png".
   *
   * Functia primea `FileList`-ul VIU al inputului, nu o copie. Ea cere intai
   * semnatura de la server (`await`), si abia dupa aceea citea lista. Intre
   * cele doua momente, `onChange` apucase sa execute `e.target.value = ""` —
   * iar golirea campului goleste si lista. `picked` iesea gol, bucla nu
   * rula, nicio poza nu se urca SI nu aparea nicio eroare, pentru ca nimic
   * nu esuase: pur si simplu nu mai era nimic de urcat.
   *
   * De-aia formatul nu conta si de-aia nu se vedea niciun mesaj. Formularul
   * de OP scapa pentru ca acolo lista se copiaza inainte de primul `await`.
   *
   * Acum primim un `File[]` copiat sincron in `onChange`, inainte de golire.
   */
  async function uploadFiles(alese: File[]) {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`Poți încărca maximum ${MAX_IMAGES} poze.`);
      return;
    }
    setError(null);
    setPozeEroare(null);
    setUploading(true);
    try {
      const signRes = await fetch("/api/articol/upload-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const sign = await signRes.json();
      if (!signRes.ok || !sign.ok) throw new Error(sign.error || "Upload indisponibil");

      const picked = alese.slice(0, room);
      const uploaded: UploadedImage[] = [];

      const probleme: string[] = [];
      for (const ales of picked) {
        // NU sarim peste fisierele fara `type`: telefoanele trimit des un tip
        // gol sau neasteptat (HEIC de pe iPhone, unele galerii Android), iar
        // `continue` insemna ca poza dispare fara niciun mesaj — omul apasa,
        // nu se intampla nimic si crede ca site-ul e stricat. Lasam Cloudinary
        // sa refuze ce nu e imagine; el macar spune de ce.
        if (ales.type && !ales.type.startsWith("image/")) {
          probleme.push(`„${ales.name}" nu pare să fie o imagine.`);
          continue;
        }
        // Pozele de telefon trec des de 8MB. Pana pe 13.09.2026 le RESPINGEAM
        // aici — si asa au sosit comenzi „fara poze" de la oameni care le
        // pusesera. Acum le micsoram in browser (lib/comprima-poza.ts) si
        // refuzam doar ce nu se poate micsora — cu alerta la noi.
        const file = await comprimaPoza(ales);
        if (file.size > MAX_UPLOAD_BYTES) {
          const msg = `„${file.name}" are ${(file.size / 1024 / 1024).toFixed(1)}MB, peste limita de 8MB.`;
          reportUploadError("articol/poze:marime", msg, { name: file.name, size: file.size, type: file.type });
          probleme.push(msg);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sign.apiKey);
        form.append("timestamp", String(sign.timestamp));
        form.append("folder", sign.folder);
        form.append("signature", sign.signature);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
          { method: "POST", body: form },
        );
        const json = await res.json();
        if (!res.ok || !json.secure_url) {
          throw new Error(json?.error?.message || "Încărcarea unei poze a eșuat");
        }
        uploaded.push({ url: json.secure_url, publicId: json.public_id });
      }

      if (uploaded.length) setImages((prev) => [...prev, ...uploaded]);
      if (probleme.length) setPozeEroare(`${probleme.join(" ")} ${UPLOAD_FALLBACK_HINT}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Încărcarea a eșuat";
      reportUploadError("articol/poze", msg);
      setPozeEroare(`${msg} ${UPLOAD_FALLBACK_HINT}`);
    } finally {
      setUploading(false);
    }
  }

  /**
   * 13.09.2026 — clientul a scris articolul in Word, cu poze si cu linkuri pe
   * cuvinte, si a lipit textul. Pozele si adresele au ramas in Word. Acum
   * urca documentul, iar noi scoatem tot din el (lib/docx.ts).
   */
  async function importDocx(file: File) {
    if (importing) return;
    setError(null);
    setNotice(null);
    setImporting(true);
    try {
      const d = await importaDocx(file, token);
      const room = Math.max(0, MAX_IMAGES - images.length);
      setMode("write");
      if (d.title && !title.trim()) setTitle(d.title);
      if (d.body) setBody(d.body);
      if (d.linkNotes) setLinkNotes((prev) => (prev.trim() ? `${prev.trim()}\n${d.linkNotes}` : d.linkNotes));
      const noi = d.images.slice(0, room).map((i) => ({ url: i.url, publicId: i.publicId }));
      if (noi.length) setImages((prev) => [...prev, ...noi]);
      setNotice(mesajImportDocx(d, room));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nu am putut citi documentul Word.";
      reportUploadError("articol/docx", msg, { name: file.name, size: file.size, type: file.type });
      setError(`${msg} Poți lipi textul în casetă și urca pozele separat, mai jos.`);
    } finally {
      setImporting(false);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setFeaturedIndex((prev) => {
      if (i === prev) return 0;
      return i < prev ? prev - 1 : prev;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (title.trim().length < 5) {
      setError("Articolul are nevoie de un titlu.");
      return;
    }
    if (body.trim().length < 100) {
      setError("Textul articolului e prea scurt (minim 100 de caractere).");
      return;
    }
    if (!contentDeclaration) {
      setError(CONTENT_DECLARATION_ERROR);
      return;
    }
    if (images.length < POZE_OBLIGATORII && !(pozeEroare && faraPozeConfirmat)) {
      // Daca incarcarea a picat, nu-l mai tinem captiv: a doua apasare trimite
      // comanda, iar pozele vin pe WhatsApp. Vezi `faraPozeConfirmat`.
      if (pozeEroare) {
        setFaraPozeConfirmat(true);
        setError(
          `Încărcarea pozelor nu a reușit. Apasă din nou „Trimite" și comanda pleacă fără ele — ` +
            `apoi trimite-ne cele ${POZE_OBLIGATORII} poze pe WhatsApp la ${SITE.phone} și le punem noi. ` +
            `Publicarea nu se blochează.`,
        );
        return;
      }
      setError(
        images.length === 0
          ? POZE_OBLIGATORII_MESAJ
          : `Mai urcă ${POZE_OBLIGATORII - images.length} ${POZE_OBLIGATORII - images.length === 1 ? "poză" : "poze"} — sunt necesare ${POZE_OBLIGATORII} (ai ${images.length}).`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/articol/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          title,
          body,
          companyName,
          siteUrl,
          contactPhone,
          cui,
          billingAddress,
          pozeEsuate: Boolean(pozeEroare) && images.length < POZE_OBLIGATORII,
          metaDescription,
          keywords,
          images,
          featuredIndex,
          facebookOptIn,
          uniquePerSite,
          ritm,
          contentDeclaration,
          generatedByAi,
          fbBoostPaper,
          linkNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Trimiterea a eșuat");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trimiterea a eșuat");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 font-serif text-2xl font-bold text-brand-navy">
          Materialele au ajuns la noi
        </h2>
        <p className="mt-3 text-slate-600">
          Publicăm pe {newspapers === 1
            ? "publicația din pachetul tău"
            : `cele ${newspapers}${newspapers >= 20 ? " de" : ""} publicații`} în
          maximum <strong>12 ore lucrătoare</strong>. Primești raportul cu
          toate linkurile pe <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {isCasino && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Conținut iGaming declarat.</strong> Articolul va include
          automat mențiunile obligatorii ONJN și 18+ / joc responsabil.
        </div>
      )}

      {/* 1. Date firma */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-bold text-brand-navy">
          1. Despre firma ta
        </h2>
        <div className="space-y-4">
          <Field
            label="Numele firmei"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Ex: MediaCom SRL"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Site-ul firmei
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="firma.ro"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Îl citim ca să scriem articolul cu informații reale despre tine.
            </p>
          </div>
          <Field
            label="Telefon de contact"
            value={contactPhone}
            onChange={setContactPhone}
            placeholder="07XX XXX XXX"
            type="tel"
          />
          {/*
            21.09.2026 — CUI-ul si adresa se cer AICI, nu pe pagina de plata.
            Acolo erau opt campuri pentru 500 de lei si patruzeci din
            patruzeci si cinci de oameni se opreau inainte sa plateasca. Aici
            omul a platit deja si completeaza oricum ca sa-i apara articolul,
            deci datele ajung la fel de sigur la factura.
          */}
          <Field
            label="CUI (pentru factură)"
            value={cui}
            onChange={setCui}
            placeholder="RO12345678 sau 12345678"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Adresa firmei (pentru factură)
            </label>
            <input
              type="text"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Str. Exemplu nr. 10, București"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Le folosim doar la factură. Dacă factura e pe persoană fizică, lasă CUI-ul gol.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Articolul */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-bold text-brand-navy">
          2. Articolul
        </h2>

        <div className="mb-5 flex gap-3">
          {(
            [
              ["ai", "🤖 Scrieți voi"],
              ["write", "✍️ Am textul meu"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <label
              key={m}
              className={`flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ${
                mode === m
                  ? "border-brand-red bg-red-50 text-brand-red"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="mode"
                checked={mode === m}
                onChange={() => setMode(m)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>

        <label
          className={`mb-5 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition ${
            importing ? "border-slate-300 bg-slate-50" : "border-brand-navy/40 bg-blue-50/40 hover:border-brand-navy hover:bg-blue-50"
          }`}
        >
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            disabled={importing || uploading || generating}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importDocx(f);
              e.target.value = "";
            }}
          />
          {importing ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-navy" />
          ) : (
            <Upload className="h-5 w-5 shrink-0 text-brand-navy" />
          )}
          <span>
            <span className="block text-sm font-semibold text-brand-navy">
              {importing ? "Citim documentul…" : "Ai articolul în Word? Încarcă fișierul .docx"}
            </span>
            <span className="block text-xs text-slate-600">
              Luăm din el textul, pozele și linkurile puse pe cuvinte — nu mai lipești nimic.
            </span>
          </span>
        </label>

        {mode === "ai" && (
          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ce vrei să comunici?
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder="Ex: Lansăm un serviciu de curățenie pentru birouri în Cluj. Suntem singurii cu produse ecologice certificate și lucrăm și în weekend."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-navy/90 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Citim site-ul și scriem...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {title ? "Generează din nou" : "Scrie articolul"}
                </>
              )}
            </button>
          </div>
        )}

        {notice && (
          <p className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            {notice}
          </p>
        )}

        <div className="space-y-4">
          <Field
            label="Titlu articol"
            value={title}
            onChange={setTitle}
            placeholder="Titlul care apare în ziare"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Textul articolului
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder={
                mode === "ai"
                  ? "Aici apare articolul generat. Îl poți edita liber."
                  : "Lipește articolul complet aici..."
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm leading-relaxed focus:border-brand-red focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              {body.trim() ? `${body.trim().split(/\s+/).length} cuvinte` : "Minim 100 de caractere"}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Dacă ai copiat textul din Word, linkurile puse pe cuvinte se pierd — scrie
              adresele direct în text sau trece-le mai jos.
            </p>
          </div>

          {/*
            13.09.2026 — „de unde știu eu pe ce cuvânt a vrut el linkul?"
            Formularul OP avea campul asta; cel de dupa plata cu cardul, nu.
            Aici e drumul principal, deci aici lipsea cel mai tare.
          */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Linkurile dorite{" "}
              <span className="font-normal text-slate-500">(până la 3 — pe ce cuvinte și către ce adresă)</span>
            </label>
            <textarea
              rows={3}
              value={linkNotes}
              onChange={(e) => setLinkNotes(e.target.value)}
              placeholder={"stație ITP Sector 5 → https://firma.ro\nprogramare online → https://firma.ro/contact"}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Scrie ce cuvinte din articol să fie link și către ce adresă. Dacă lași gol,
              punem numele firmei ca link către site.
            </p>
          </div>

          {keywords.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cuvinte-cheie SEO
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Poze */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          3. Poze <span className="text-sm font-normal text-brand-red">— obligatoriu, {POZE_OBLIGATORII} poze</span>{" "}
          <span className="text-sm font-normal text-slate-500">({images.length}/{MAX_IMAGES})</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          <strong>Urcă {POZE_OBLIGATORII} poze</strong> cu firma ta: logo, sediu, produse,
          echipă. Alege una ca <strong>imagine reprezentativă</strong> — aia apare pe
          prima pagină și pe Facebook. Fără poze, articolul nu se poate trimite.
        </p>

        {images.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {images.map((img, i) => (
              <div
                key={img.url}
                className={`relative overflow-hidden rounded-xl border-2 ${
                  i === featuredIndex ? "border-brand-red" : "border-slate-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Poza ${i + 1}`}
                  className="h-32 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                  aria-label="Șterge poza"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedIndex(i)}
                  className={`flex w-full items-center justify-center gap-1 py-1.5 text-xs font-semibold transition ${
                    i === featuredIndex
                      ? "bg-brand-red text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Star
                    className={`h-3 w-3 ${i === featuredIndex ? "fill-current" : ""}`}
                  />
                  {i === featuredIndex ? "Reprezentativă" : "Alege"}
                </button>
              </div>
            ))}
          </div>
        )}

        {pozeEroare && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pozeEroare}
          </p>
        )}

        {images.length < MAX_IMAGES && (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 transition hover:border-brand-red hover:bg-red-50/40">
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                // Copiem lista INAINTE de a goli campul: `e.target.files` e o
                // referinta vie, iar `value = ""` o goleste. Vezi uploadFiles.
                const alese = Array.from(e.target.files || []);
                e.target.value = "";
                if (alese.length) void uploadFiles(alese);
              }}
            />
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-brand-red" />
                <span className="mt-2 text-sm text-slate-600">Se încarcă...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="mt-2 text-sm font-medium text-slate-700">
                  Încarcă poze
                </span>
                <span className="mt-0.5 text-xs text-slate-500">
                  JPG sau PNG • încă {MAX_IMAGES - images.length} disponibile
                </span>
              </>
            )}
          </label>
        )}
      </section>

      {/* 4. Cum se publică pe cele 50 de ziare */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <RitmSelect value={ritm} onChange={setRitm} className="mb-6 border-b border-slate-100 pb-6" />
        <p className="font-semibold text-brand-navy">Cum publicăm pe cele 50 de ziare</p>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="rewriteMode"
              checked={uniquePerSite}
              onChange={() => setUniquePerSite(true)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand-red"
            />
            <span>
              <strong className="text-brand-navy">
                Variantă unică pentru fiecare ziar{" "}
                <span className="text-brand-red">(recomandat)</span>
              </strong>
              <span className="mt-1 block text-sm text-slate-600">
                Fiecare publicație primește alt titlu și altă formulare, cu
                același mesaj, aceleași cifre și aceleași linkuri către
                site-ul tău. Zero conținut duplicat între ziare — mai bine
                pentru SEO.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="rewriteMode"
              checked={!uniquePerSite}
              onChange={() => setUniquePerSite(false)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand-red"
            />
            <span>
              <strong className="text-brand-navy">
                Exact textul meu, identic pe toate
              </strong>
              <span className="mt-1 block text-sm text-slate-600">
                Nu modificăm nimic. Alege asta dacă textul e aprobat juridic
                sau e un comunicat oficial care trebuie publicat cuvânt cu
                cuvânt.
              </span>
            </span>
          </label>
        </div>
      </section>

      {/* 5. Facebook */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={facebookOptIn}
            onChange={(e) => setFacebookOptIn(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-red"
          />
          <span>
            <strong className="text-brand-navy">
              Distribuie articolul și pe paginile de Facebook
            </strong>
            <span className="mt-1 block text-sm text-slate-600">
              Cele 46 de pagini de Facebook ale publicațiilor, 37.323 de
              urmăritori în total. Inclus, fără cost suplimentar. Poți refuza
              dacă preferi doar publicarea pe site.
            </span>
          </span>
        </label>
        {facebookOptIn && (
          <FbBoostSelect value={fbBoostPaper} onChange={setFbBoostPaper} className="mt-4" />
        )}
      </section>

      <ContentDeclaration checked={contentDeclaration} onChange={setContentDeclaration} />

      <FormError message={error} className="rounded-xl bg-red-50 p-4 text-sm text-red-700" />

      <button
        type="submit"
        // 07.09.2026 — un client a ales pozele, le-a vazut in formular si a
        // apasat „Trimite" cat inca urcau la Cloudinary: comanda a plecat cu
        // lista goala, iar emailul a spus „Nicio poza incarcata". Omul avea
        // dreptate ca le-a pus. Formularul de OP era deja protejat asa; asta
        // nu era. Blocam si cat urca, si cat se genereaza textul.
        disabled={submitting || uploading || generating || importing}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Se încarcă pozele — nu închide pagina
          </>
        ) : submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Se trimite...
          </>
        ) : images.length < POZE_OBLIGATORII && pozeEroare && faraPozeConfirmat ? (
          "Trimite fără poze — le dau pe WhatsApp →"
        ) : images.length < POZE_OBLIGATORII ? (
          `Urcă ${POZE_OBLIGATORII - images.length === 1 ? "încă o poză" : `${POZE_OBLIGATORII - images.length} poze`} ca să trimiți`
        ) : (
          "Trimite materialele →"
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        Publicăm în maximum 12 ore lucrătoare de la primire.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
      />
    </div>
  );
}
