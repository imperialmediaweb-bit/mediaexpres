"use client";

import { useState } from "react";
import { Loader2, Upload, X, Search, CheckCircle2, Sparkles, RefreshCw, Camera, FileText, Clock } from "lucide-react";
import { RitmSelect } from "@/components/forms/RitmSelect";
import { RITM_IMPLICIT, type RitmId } from "@/lib/ritm";
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
import { FbBoostSelect } from "@/components/forms/FbBoostSelect";
import { CONTENT_DECLARATION_ERROR, TITLU_DE_PROPUS, FARA_POZE_AVERTISMENT } from "@/lib/content-policy";
import { FormError } from "@/components/forms/FormError";
import { importaDocx, mesajImportDocx } from "@/lib/docx-client";
import { AlegeZona } from "@/components/pricing/AlegeZona";
import { felAlegere } from "@/lib/zona-pachet";

type Varianta = "am" | "scrieti" | "dupa";
type Tip = "advertorial" | "comunicat" | "seo";

const TIPURI: { id: Tip; nume: string; desc: string }[] = [
  { id: "advertorial", nume: "Advertorial", desc: "prezintă firma și serviciile, cu îndemn la final" },
  { id: "comunicat", nume: "Comunicat de presă", desc: "o știre despre firmă, ton de ziar" },
  { id: "seo", nume: "Articol SEO", desc: "ghid util, construit pe o căutare din Google" },
];

/**
 * 17.10.2026 — formularul de comanda de DINAINTE de plata. Clientul isi pune
 * firma (cautata la ANAF dupa CUI), articolul (al lui, scris de noi din site,
 * sau „il trimit dupa plata"), pozele si ritmul, apoi alege cum plateste pe
 * /comanda/plata/[ref]. Vede ce cumpara inainte sa i se ceara banii.
 */
export function ComandaForm({
  packageId,
  price,
  isCasino,
  initialEmail = "",
  initialAlegere = "",
}: {
  packageId: string;
  price: number;
  isCasino: boolean;
  initialEmail?: string;
  initialAlegere?: string;
}) {
  const fel = felAlegere(packageId);
  const [alegere, setAlegere] = useState(initialAlegere);
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
    brief: "",
    cuvinteCheie: "",
  });
  // Firma gasita la ANAF: numele si adresa nu se mai scriu de mana.
  const [firma, setFirma] = useState<{ nume: string; adresa: string; inactiva: boolean } | null>(null);
  const [anafManual, setAnafManual] = useState(false);
  const [cautCui, setCautCui] = useState(false);
  const [cuiEroare, setCuiEroare] = useState<string | null>(null);

  const [varianta, setVarianta] = useState<Varianta>("am");
  const [tip, setTip] = useState<Tip>("advertorial");
  const [generez, setGenerez] = useState(false);
  const [generat, setGenerat] = useState(0);
  // Linkurile din lista au fost puse de noi (propuse), nu scrise de client.
  const [linkuriAuto, setLinkuriAuto] = useState(false);

  const [images, setImages] = useState<Uploaded[]>([]);
  const [captura, setCaptura] = useState(false);
  const [uniquePerSite, setUniquePerSite] = useState(true);
  const [facebookOptIn, setFacebookOptIn] = useState(true);
  const [ritm, setRitm] = useState<RitmId>(RITM_IMPLICIT);
  const [fbBoostPaper, setFbBoostPaper] = useState("");
  const [contentDeclaration, setContentDeclaration] = useState(false);
  const [faraPozeConfirmat, setFaraPozeConfirmat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof typeof f, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function cautaFirma() {
    if (cautCui) return;
    setCuiEroare(null);
    setCautCui(true);
    try {
      const res = await fetch(`/api/anaf?cui=${encodeURIComponent(f.companyCui)}`);
      const j = await res.json();
      if (j.ok) {
        setFirma(j.firma);
        setAnafManual(false);
        setF((p) => ({ ...p, companyCui: j.firma.cui, companyName: j.firma.nume, companyAddress: j.firma.adresa }));
      } else {
        setFirma(null);
        setCuiEroare(j.error || "Nu am găsit firma.");
        if (j.anafIndisponibil) setAnafManual(true);
      }
    } catch {
      setCuiEroare("ANAF nu răspunde acum. Completează numele firmei și adresa de mână.");
      setAnafManual(true);
    } finally {
      setCautCui(false);
    }
  }

  async function genereaza() {
    if (generez) return;
    setError(null);
    if (f.siteUrl.trim().length < 4) {
      setError("Scrie adresa site-ului firmei, ca să avem de unde lua informațiile.");
      return;
    }
    setGenerez(true);
    try {
      const res = await fetch("/api/articol/genereaza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: f.siteUrl,
          brief: f.brief,
          companyName: f.companyName || undefined,
          tip,
          cuvinteCheie: f.cuvinteCheie || undefined,
          // Linkurile propuse la generarea trecuta nu sunt alegerea clientului.
          linkuri: linkuriAuto ? undefined : f.linkNotes || undefined,
          isCasino,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Generarea a eșuat.");
      setF((p) => ({
        ...p,
        title: j.article.title,
        body: j.article.body,
        linkNotes: !p.linkNotes.trim() || linkuriAuto ? j.linkuriPropuse || p.linkNotes : p.linkNotes,
      }));
      if (!f.linkNotes.trim() || linkuriAuto) setLinkuriAuto(Boolean(j.linkuriPropuse));
      setGenerat((n) => n + 1);
      trackGaEvent("generate_article", { tip });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generarea a eșuat.");
    } finally {
      setGenerez(false);
    }
  }

  /**
   * Textul lipit din Word sau de pe un site vine si ca HTML, cu linkurile pe
   * cuvinte. In casuta ramane doar textul, deci linkurile le scoatem de aici
   * si le trecem in lista „cuvant → adresa", ca sa nu se piarda pe drum.
   */
  function prindeLinkuri(html: string) {
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const gasite: string[] = [];
    doc.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const text = (a.textContent || "").replace(/\s+/g, " ").trim();
      if (!/^https?:\/\//i.test(href) || !text) return;
      const linie = `${text} → ${href}`;
      if (!gasite.includes(linie)) gasite.push(linie);
    });
    if (!gasite.length) return;
    setF((p) => {
      const existente = p.linkNotes.split("\n").map((l) => l.trim()).filter(Boolean);
      const noi = gasite.filter((l) => !existente.includes(l));
      return { ...p, linkNotes: [...existente, ...noi].join("\n").slice(0, 1000) };
    });
    setNotice(`Am găsit ${gasite.length} ${gasite.length === 1 ? "link" : "linkuri"} în textul lipit și ${gasite.length === 1 ? "l-am trecut" : "le-am trecut"} mai jos, la „Linkurile dorite”.`);
  }

  async function handleUpload(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setUploading(true);
    try {
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
      if (next.length) setFaraPozeConfirmat(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Eroare la încărcare";
      reportUploadError("comanda/noua:images", msg);
      setError(`${msg} ${UPLOAD_FALLBACK_HINT}`);
    } finally {
      setUploading(false);
    }
  }

  async function capturaSite() {
    if (captura || images.length >= 3) return;
    setError(null);
    if (f.siteUrl.trim().length < 4) {
      setError("Scrie mai întâi adresa site-ului firmei.");
      return;
    }
    setCaptura(true);
    try {
      const res = await fetch("/api/captura-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: f.siteUrl }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Nu am putut face captura.");
      setImages((prev) => [...prev, j.poza].slice(0, 3));
      setFaraPozeConfirmat(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nu am putut face captura.");
    } finally {
      setCaptura(false);
    }
  }

  async function importDocx(file: File) {
    if (importing) return;
    setError(null);
    setNotice(null);
    setImporting(true);
    try {
      const d = await importaDocx(file);
      const room = Math.max(0, 3 - images.length);
      setF((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : d.title,
        body: d.body || prev.body,
        linkNotes: d.linkNotes
          ? prev.linkNotes.trim()
            ? `${prev.linkNotes.trim()}\n${d.linkNotes}`
            : d.linkNotes
          : prev.linkNotes,
      }));
      const noi = d.images.slice(0, room).map((i) => ({ url: i.url, name: i.name }));
      if (noi.length) {
        setImages((prev) => [...prev, ...noi]);
        setFaraPozeConfirmat(false);
      }
      setNotice(mesajImportDocx(d, room));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nu am putut citi documentul Word.";
      reportUploadError("comanda/noua:docx", msg, { name: file.name, size: file.size, type: file.type });
      setError(`${msg} Poți lipi textul în casetă și urca pozele separat.`);
    } finally {
      setImporting(false);
    }
  }

  async function submit() {
    if (busy) return;
    const dupa = varianta === "dupa";
    const verificari: [boolean, string][] = [
      [f.companyCui.replace(/\D/g, "").length < 2, "Scrie CUI-ul firmei și apasă „Caută firma”."],
      [!firma && !anafManual, "Apasă „Caută firma”, ca să completăm datele de facturare de la ANAF."],
      [f.companyName.trim().length < 2, "Scrie denumirea firmei, pentru factură."],
      [f.companyAddress.trim().length < 5, "Scrie adresa de facturare."],
      [!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim()),
        "Scrie o adresă de email validă — acolo primești factura și raportul."],
      [f.contactPhone.replace(/\D/g, "").length < 9, "Scrie numărul de telefon."],
      [!dupa && varianta === "scrieti" && f.body.trim().length < 100,
        "Apasă „Scrie-mi articolul” și verifică textul — sau alege „Îl trimit după plată”."],
      [!dupa && f.body.trim().length < 100,
        "Articolul trebuie să aibă minimum 100 de caractere — sau alege „Îl trimit după plată”."],
      [!contentDeclaration, CONTENT_DECLARATION_ERROR],
      [fel !== null && !alegere, fel === "zona" ? "Alege zona în care vrei ziarele." : "Alege ziarul județean."],
    ];
    for (const [gresit, mesaj] of verificari) {
      if (gresit) {
        setError(mesaj);
        return;
      }
    }
    if (!dupa && images.length === 0 && !faraPozeConfirmat) {
      setFaraPozeConfirmat(true);
      setError(FARA_POZE_AVERTISMENT);
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
          ...(alegere ? { alegere } : {}),
          email: f.email.trim(),
          contactPhone: f.contactPhone,
          companyName: f.companyName,
          companyCui: f.companyCui,
          companyAddress: f.companyAddress,
          title: dupa ? TITLU_DE_PROPUS : f.title.trim() || TITLU_DE_PROPUS,
          body: dupa ? "" : f.body,
          siteUrl: f.siteUrl,
          linkNotes: f.linkNotes,
          images,
          featuredIndex: 0,
          facebookOptIn,
          uniquePerSite,
          ritm,
          contentDeclaration,
          fbBoostPaper,
          articolDupa: dupa,
          plata: "later",
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Eroare");
      trackGaEvent("add_payment_info", { value: price, currency: "RON" });
      window.location.href = `/comanda/plata/${j.ref}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
      setBusy(false);
    }
  }

  const label = "mb-1 block text-sm font-medium text-slate-700";
  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none";
  const tab = (activ: boolean) =>
    `flex flex-1 items-start gap-2 rounded-xl border-2 p-3 text-left transition ${
      activ ? "border-brand-red bg-red-50/60" : "border-slate-200 bg-white hover:border-slate-400"
    }`;

  return (
    <div className="space-y-8">
      {fel && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <AlegeZona fel={fel} valoare={alegere} onChange={setAlegere} />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">1. Firma ta</h2>
        <p className="mt-1 text-sm text-slate-600">
          Scrie CUI-ul și apasă „Caută firma” — numele și adresa le luăm de la ANAF.{" "}
          <strong>Factura se emite automat pe aceste date</strong>, deci verifică-le.
        </p>
        <div className="mt-4">
          <label className={label}>CUI *</label>
          <div className="flex gap-2">
            <input
              value={f.companyCui}
              onChange={(e) => {
                set("companyCui", e.target.value);
                setFirma(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void cautaFirma();
                }
              }}
              className={input}
              placeholder="ex. 12345678 sau RO12345678"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={cautaFirma}
              disabled={cautCui || f.companyCui.trim().length < 2}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {cautCui ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Caută firma
            </button>
          </div>
          {cuiEroare && <p className="mt-2 text-sm text-red-700">{cuiEroare}</p>}
          {firma && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-900">{firma.nume}</p>
                <p className="text-emerald-900/80">{firma.adresa}</p>
                {firma.inactiva && (
                  <p className="mt-1 text-amber-800">Atenție: ANAF arată firma ca inactivă fiscal.</p>
                )}
                <p className="mt-1 text-xs text-emerald-800/80">Date de la ANAF — așa apar pe factură.</p>
              </div>
            </div>
          )}
        </div>
        {anafManual && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Denumire firmă *</label>
              <input value={f.companyName} onChange={(e) => set("companyName", e.target.value)} className={input} placeholder="Firma Mea SRL" />
            </div>
            <div>
              <label className={label}>Adresă *</label>
              <input value={f.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} className={input} placeholder="Str., nr., oraș, județ" />
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Email *</label>
            <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={input} placeholder="nume@firma.ro" />
            <p className="mt-1 text-xs text-slate-500">Aici primești factura și raportul cu linkurile.</p>
          </div>
          <div>
            <label className={label}>Telefon *</label>
            <input type="tel" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={input} placeholder="07xx xxx xxx" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">2. Articolul</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className={tab(varianta === "am")} onClick={() => setVarianta("am")}>
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-navy" />
            <span>
              <span className="block text-sm font-bold text-brand-navy">Am articolul</span>
              <span className="block text-xs text-slate-600">îl lipesc sau încarc Word-ul</span>
            </span>
          </button>
          <button type="button" className={tab(varianta === "scrieti")} onClick={() => setVarianta("scrieti")}>
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
            <span>
              <span className="block text-sm font-bold text-brand-navy">Scrieți-l voi</span>
              <span className="block text-xs text-slate-600">din site-ul firmei, gata în 30 de secunde</span>
            </span>
          </button>
          <button type="button" className={tab(varianta === "dupa")} onClick={() => setVarianta("dupa")}>
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
            <span>
              <span className="block text-sm font-bold text-brand-navy">Îl trimit după plată</span>
              <span className="block text-xs text-slate-600">primești un link pe email</span>
            </span>
          </button>
        </div>

        {varianta === "dupa" && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            După plată primești pe email un link unde trimiți articolul și pozele — sau ni le
            trimiți pe WhatsApp la <strong>{SITE.phone}</strong>. Cele 12 ore pornesc de când avem articolul.
          </p>
        )}

        {varianta === "scrieti" && (
          <div className="mt-4 space-y-4">
            <div>
              <label className={label}>Site-ul firmei *</label>
              <input value={f.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} className={input} placeholder="firma.ro" />
            </div>
            <div>
              <p className={label}>Ce fel de articol?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {TIPURI.map((t) => (
                  <label key={t.id} className={`cursor-pointer rounded-lg border-2 p-2.5 text-sm ${tip === t.id ? "border-brand-navy bg-blue-50/50" : "border-slate-200"}`}>
                    <input type="radio" name="tip" className="sr-only" checked={tip === t.id} onChange={() => setTip(t.id)} />
                    <span className="block font-semibold text-brand-navy">{t.nume}</span>
                    <span className="block text-xs text-slate-600">{t.desc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>
                Cuvinte cheie <span className="font-normal text-slate-500">(opțional — pe ce vrei să te găsească în Google, separate prin virgulă)</span>
              </label>
              <input value={f.cuvinteCheie} onChange={(e) => set("cuvinteCheie", e.target.value)} className={input} placeholder="ex. creare site Botoșani, magazin online" />
              <p className="mt-1 text-xs text-slate-500">
                Scriem articolul în jurul lor și punem pe ele linkul site-ului tău. Dacă lași gol, le alegem noi și ți le arătăm.
              </p>
            </div>
            <div>
              <label className={label}>
                Ce vrei să transmită? <span className="font-normal text-slate-500">(opțional — o propoziție e de ajuns)</span>
              </label>
              <textarea rows={2} value={f.brief} onChange={(e) => set("brief", e.target.value)} className={input} placeholder="ex. am deschis un punct nou de lucru în Suceava" />
            </div>
            <div>
              <label className={label}>
                Linkurile dorite în articol <span className="font-normal text-slate-500">(opțional — până la 3, câte unul pe rând)</span>
              </label>
              <textarea
                rows={3}
                value={f.linkNotes}
                onChange={(e) => {
                  set("linkNotes", e.target.value);
                  setLinkuriAuto(false);
                }}
                className={`${input} ${linkuriAuto ? "border-emerald-400 bg-emerald-50/40" : ""}`}
                placeholder={"service auto Botoșani → https://firma.ro\nprogramare online → https://firma.ro/contact"}
              />
              {linkuriAuto && (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Am pus linkul site-ului tău pe aceste cuvinte cheie din articol. Ești de acord? Dacă nu, schimbă cuvintele sau adresele aici.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={genereaza}
              disabled={generez || generat >= 3}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto"
            >
              {generez ? <Loader2 className="h-4 w-4 animate-spin" /> : generat ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {generez ? "Citim site-ul și scriem articolul…" : generat ? `Scrie altă variantă (${3 - generat} rămase)` : "Scrie-mi articolul"}
            </button>
            {generat > 0 && (
              <p className="text-xs text-slate-500">
                Citește-l mai jos și modifică orice. Datele de contact de la final sunt luate de pe site — verifică-le.
              </p>
            )}
          </div>
        )}

        {varianta === "am" && (
          <label
            className={`mt-4 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition ${
              importing ? "border-slate-300 bg-slate-50" : "border-brand-navy/40 bg-blue-50/40 hover:border-brand-navy hover:bg-blue-50"
            }`}
          >
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={importing || uploading}
              onChange={(e) => {
                const fi = e.target.files?.[0];
                if (fi) void importDocx(fi);
                e.target.value = "";
              }}
            />
            {importing ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-navy" /> : <Upload className="h-5 w-5 shrink-0 text-brand-navy" />}
            <span>
              <span className="block text-sm font-semibold text-brand-navy">
                {importing ? "Citim documentul…" : "Ai articolul în Word? Încarcă fișierul .docx"}
              </span>
              <span className="block text-xs text-slate-600">Luăm din el textul, pozele și linkurile.</span>
            </span>
          </label>
        )}
        {notice && <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}

        {(varianta === "am" || (varianta === "scrieti" && generat > 0)) && (
          <div className="mt-4 space-y-4">
            <div>
              <label className={label}>
                Titlu <span className="font-normal text-slate-500">(opțional — dacă nu-l ai, îl propunem noi)</span>
              </label>
              <input value={f.title} onChange={(e) => set("title", e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Textul articolului *</label>
              <textarea
                rows={varianta === "scrieti" ? 16 : 10}
                value={f.body}
                onChange={(e) => set("body", e.target.value)}
                onPaste={(e) => prindeLinkuri(e.clipboardData.getData("text/html"))}
                className={input}
              />
              <p className="mt-1 text-xs text-slate-500">{f.body.length} caractere (minimum 100)</p>
            </div>
            {varianta === "am" && (
              <>
                <div>
                  <label className={label}>Site-ul firmei</label>
                  <input value={f.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} className={input} placeholder="firma.ro" />
                </div>
                <div>
                  <label className={label}>
                    Linkurile dorite <span className="font-normal text-slate-500">(opțional — până la 3)</span>
                  </label>
                  <textarea rows={3} value={f.linkNotes} onChange={(e) => set("linkNotes", e.target.value)} className={input} placeholder={"service auto Botoșani → https://firma.ro\nprogramare online → https://firma.ro/contact"} />
                </div>
              </>
            )}
          </div>
        )}

        {varianta !== "dupa" && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className={label}>Poze (maximum 3)</p>
            <p className="mb-2 text-xs text-slate-500">
              Logo, sediu, produs, echipă. N-ai poze la îndemână? Folosește o captură a site-ului tău.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-navy">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Se încarcă..." : "Adaugă poze"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading || images.length >= 3} onChange={(e) => { void handleUpload(e.target.files); e.target.value = ""; }} />
              </label>
              <button
                type="button"
                onClick={capturaSite}
                disabled={captura || images.length >= 3}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-navy disabled:opacity-50"
              >
                {captura ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {captura ? "Facem captura…" : "Captură din site-ul meu"}
              </button>
            </div>
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={img.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-24 w-36 rounded-lg border border-slate-200 object-cover" />
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Șterge poza" className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-slate-200 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-lg font-bold text-brand-navy">3. Publicarea</h2>
        <RitmSelect value={ritm} onChange={setRitm} className="mt-3" />
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={uniquePerSite} onChange={(e) => setUniquePerSite(e.target.checked)} className="mt-1" />
            <span className="text-slate-700">
              Publicați o variantă unică pe fiecare ziar (recomandat — fără conținut duplicat).
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={facebookOptIn} onChange={(e) => setFacebookOptIn(e.target.checked)} className="mt-1" />
            <span className="text-slate-700">Distribuiți articolul și pe paginile de Facebook asociate.</span>
          </label>
          {facebookOptIn && <FbBoostSelect value={fbBoostPaper} onChange={setFbBoostPaper} className="pt-2" />}
        </div>
      </section>

      <ContentDeclaration checked={contentDeclaration} onChange={setContentDeclaration} />

      <FormError message={error} className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" />

      <div>
        <button
          type="button"
          onClick={submit}
          disabled={busy || uploading || importing || generez || captura}
          className="w-full rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-red/90 disabled:opacity-60"
        >
          {busy
            ? "Se trimite..."
            : varianta !== "dupa" && images.length === 0 && faraPozeConfirmat
              ? "Trimite fără poze și alege plata"
              : "Trimite comanda și alege plata"}
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          La pasul următor alegi: card, ordin de plată sau WhatsApp. {price.toLocaleString("ro")} lei, preț final.
        </p>
      </div>
    </div>
  );
}
