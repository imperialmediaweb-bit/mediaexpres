"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, Upload, Star } from "lucide-react";
import { STANDARD_PACKAGES, PROMO_PACKAGES } from "@/data/packages";
import { signAndUpload, type Uploaded } from "@/lib/upload-client";
import { importaDocx, mesajImportDocx } from "@/lib/docx-client";

/**
 * Comanda introdusa de noi, pentru cine a comandat pe WhatsApp sau la telefon.
 *
 * Inainte, singura cale era sa completam formularul public in locul clientului
 * — ceea ce ii trimitea LUI emailuri de confirmare pentru o intelegere pe care
 * o facusem deja la telefon, si declansa o facturare automata nedorita. Aici
 * nu pleaca nimic catre client: comanda apare in Materiale si mergem mai
 * departe normal.
 */
export function NewOrderForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 13.09.2026 — comenzile de pe WhatsApp veneau cu pozele pe telefon, iar
  // formularul asta nu avea unde sa le primeasca: scria `images: "[]"`. Deci
  // orice comanda luata pe WhatsApp ajungea pe ziare fara poza clientului.
  const [images, setImages] = useState<Uploaded[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [f, setF] = useState({
    packageId: "promo-50",
    count: "1",
    email: "",
    contactPhone: "",
    companyName: "",
    companyCui: "",
    companyAddress: "",
    title: "",
    body: "",
    siteUrl: "",
    linkNotes: "",
    paid: false,
  });

  const MAX_POZE = 3;

  async function urcaPoze(list: FileList | null) {
    if (!list?.length) return;
    setErr(null);
    setUploading(true);
    try {
      const next = [...images];
      for (const file of Array.from(list)) {
        if (next.length >= MAX_POZE) break;
        next.push(await signAndUpload(file));
      }
      setImages(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Încărcarea a eșuat");
    } finally {
      setUploading(false);
    }
  }

  /** Clientul a trimis articolul ca .docx pe WhatsApp sau pe email. */
  async function importDocx(file: File) {
    if (importing) return;
    setErr(null);
    setNotice(null);
    setImporting(true);
    try {
      const d = await importaDocx(file);
      const room = Math.max(0, MAX_POZE - images.length);
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
      if (noi.length) setImages((prev) => [...prev, ...noi]);
      setNotice(mesajImportDocx(d, room));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nu am putut citi documentul Word.");
    } finally {
      setImporting(false);
    }
  }

  const pachete = [...PROMO_PACKAGES, ...STANDARD_PACKAGES];
  const pkg = pachete.find((p) => p.id === f.packageId);
  const total = (pkg?.price ?? 0) * (Number(f.count) || 1);

  function set(k: keyof typeof f, v: string | boolean) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/comanda-noua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          count: Number(f.count) || 1,
          contactPhone: f.contactPhone || undefined,
          companyCui: f.companyCui || undefined,
          companyAddress: f.companyAddress || undefined,
          siteUrl: f.siteUrl || undefined,
          linkNotes: f.linkNotes || undefined,
          images: images.map((i) => ({ url: i.url })),
          featuredIndex: Math.min(featuredIndex, Math.max(0, images.length - 1)),
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      setOpen(false);
      setF({ ...f, title: "", body: "", email: "", companyName: "", linkNotes: "" });
      setImages([]);
      setFeaturedIndex(0);
      setNotice(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  }

  const inp =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none";
  const lab = "mb-1 block text-xs font-medium text-slate-600";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90"
      >
        <Plus className="h-4 w-4" />
        Comandă nouă (WhatsApp / telefon)
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-brand-red/30 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          Comandă nouă, introdusă de tine
        </h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="Închide">
          <X className="h-5 w-5 text-slate-400 hover:text-slate-700" />
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Pentru comenzile primite pe WhatsApp sau la telefon. Clientul nu primește niciun
        email de aici — comanda intră direct în listă.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={lab}>Pachet</label>
          <select value={f.packageId} onChange={(e) => set("packageId", e.target.value)} className={inp}>
            {pachete.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.price} lei
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lab}>Câte articole</label>
          <select value={f.count} onChange={(e) => set("count", e.target.value)} className={inp}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "articol" : "articole"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lab}>Email client *</label>
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={inp} placeholder="client@firma.ro" />
        </div>
        <div>
          <label className={lab}>Telefon</label>
          <input value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={inp} placeholder="07xx xxx xxx" />
        </div>
        <div>
          <label className={lab}>Denumire firmă *</label>
          <input value={f.companyName} onChange={(e) => set("companyName", e.target.value)} className={inp} placeholder="Firma SRL" />
        </div>
        <div>
          <label className={lab}>CUI</label>
          <input value={f.companyCui} onChange={(e) => set("companyCui", e.target.value)} className={inp} placeholder="RO12345678" />
        </div>
        <div className="sm:col-span-2">
          <label className={lab}>Adresă</label>
          <input value={f.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} className={inp} placeholder="Str., nr., oraș, județ" />
        </div>
        <div className="sm:col-span-2">
          <label className={lab}>Titlul articolului *</label>
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className={inp} />
        </div>
        <div className="sm:col-span-2">
          <label className={lab}>Articolul (sau tema, dacă îl scriem noi) *</label>
          <textarea rows={6} value={f.body} onChange={(e) => set("body", e.target.value)} className={inp} />
        </div>
        <div className="sm:col-span-2">
          <label className={lab}>Site-ul firmei</label>
          <input value={f.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} className={inp} placeholder="https://firma.ro" />
        </div>
        <div className="sm:col-span-2">
          <label className={lab}>Linkurile dorite (pe ce cuvinte → către ce adresă)</label>
          <textarea
            rows={2}
            value={f.linkNotes}
            onChange={(e) => set("linkNotes", e.target.value)}
            className={inp}
            placeholder={"showroom perdele Iași → https://firma.ro"}
          />
        </div>
      </div>

      {/* Pozele primite pe WhatsApp: le salvezi din telefon si le pui aici. */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className={lab}>
          Poze ({images.length}/{MAX_POZE}) — cele primite pe WhatsApp
        </p>
        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={img.url} className={`relative overflow-hidden rounded-lg border-2 ${i === featuredIndex ? "border-brand-red" : "border-slate-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-20 w-28 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImages(images.filter((_, j) => j !== i));
                    setFeaturedIndex((p) => (i === p ? 0 : i < p ? p - 1 : p));
                  }}
                  aria-label="Șterge poza"
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedIndex(i)}
                  className={`flex w-full items-center justify-center gap-1 py-0.5 text-[10px] font-semibold ${i === featuredIndex ? "bg-brand-red text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                >
                  <Star className={`h-2.5 w-2.5 ${i === featuredIndex ? "fill-current" : ""}`} />
                  {i === featuredIndex ? "Principală" : "Alege"}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {images.length < MAX_POZE && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-brand-navy">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Se încarcă..." : "Adaugă poze"}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { void urcaPoze(e.target.files); e.target.value = ""; }} />
            </label>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-navy/40 bg-white px-3 py-2 text-xs font-medium text-brand-navy hover:border-brand-navy">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Citim documentul..." : "Articolul e în Word (.docx)"}
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={importing}
              onChange={(e) => { const x = e.target.files?.[0]; if (x) void importDocx(x); e.target.value = ""; }}
            />
          </label>
        </div>
        {notice && <p className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{notice}</p>}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.paid} onChange={(e) => set("paid", e.target.checked)} className="h-4 w-4" />
        <span className="text-slate-700">
          Banii au intrat deja — marchează comanda ca încasată (publicarea se deblochează imediat)
        </span>
      </label>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || uploading || importing}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adaugă comanda — {total.toLocaleString("ro")} lei
        </button>
        <span className="text-xs text-slate-500">
          {Number(f.count) > 1
            ? `Se creează ${f.count} comenzi separate, câte una pentru fiecare articol.`
            : "Se creează o comandă."}
        </span>
      </div>
    </div>
  );
}
