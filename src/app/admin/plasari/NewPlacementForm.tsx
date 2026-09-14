"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, Upload, Send } from "lucide-react";
import { signAndUpload, type Uploaded } from "@/lib/upload-client";
import { importaDocx, mesajImportDocx } from "@/lib/docx-client";
import { ADAOS_PLASARE } from "@/lib/niveluri-publicatii";

export interface PartenerRand {
  id: string;
  nume: string;
  judet: string | null;
  tier: string | null;
  tarif: number;
  dofollow: boolean | null;
}

/**
 * Trimite un articol catre una sau mai multe publicatii partenere.
 *
 * Textul e editabil inainte de trimitere, si asta nu e un moft: materialul
 * clientului contine des numele firmei si datele lui, iar publicatia nu are
 * voie sa afle cine e clientul. Ce scrii aici se copiaza pe plasare; comanda
 * clientului ramane neatinsa.
 */
export function NewPlacementForm({ parteneri }: { parteneri: PartenerRand[] }) {
  const router = useRouter();
  const [deschis, setDeschis] = useState(false);
  const [alese, setAlese] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [images, setImages] = useState<Uploaded[]>([]);
  const [urca, setUrca] = useState(false);
  const [importa, setImporta] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectate = parteneri.filter((p) => alese.includes(p.id));
  const platim = selectate.reduce((s, p) => s + p.tarif, 0);
  const incasam = selectate.reduce((s, p) => s + p.tarif + ADAOS_PLASARE, 0);

  function comuta(id: string) {
    setAlese((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function trimite() {
    if (busy) return;
    setErr(null);
    if (alese.length === 0) return setErr("Alege cel puțin o publicație.");
    if (title.trim().length < 5) return setErr("Articolul are nevoie de titlu.");
    if (body.trim().length < 100) return setErr("Textul e prea scurt (minim 100 de caractere).");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherIds: alese,
          title: title.trim(),
          body,
          images: images.map((i) => ({ url: i.url })),
          featuredIndex: 0,
          linkNotes: linkNotes.trim() || undefined,
          clientLabel: clientLabel.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      setDeschis(false);
      setAlese([]);
      setTitle("");
      setBody("");
      setLinkNotes("");
      setClientLabel("");
      setImages([]);
      setNota(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none";
  const lab = "mb-1 block text-xs font-medium text-slate-600";

  if (!deschis) {
    return (
      <button
        type="button"
        onClick={() => setDeschis(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90"
      >
        <Plus className="h-4 w-4" />
        Trimite un articol la publicații partenere
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-brand-red/30 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-brand-navy">Articol nou către publicații</h2>
        <button type="button" onClick={() => setDeschis(false)} aria-label="Închide">
          <X className="h-5 w-5 text-slate-400 hover:text-slate-700" />
        </button>
      </div>

      <div className="mt-4">
        <p className={lab}>Publicațiile ({alese.length} alese)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {parteneri.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${
                alese.includes(p.id) ? "border-brand-red bg-red-50/40" : "border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={alese.includes(p.id)}
                onChange={() => comuta(p.id)}
                className="mt-0.5 h-4 w-4 accent-brand-red"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-brand-navy">{p.nume}</span>
                <span className="block text-xs text-slate-500">
                  {p.judet ? `${p.judet} · ` : ""}
                  {p.tier || "fără nivel"} · îi plătim {p.tarif} lei · vindem cu {p.tarif + ADAOS_PLASARE}
                  {p.dofollow === false ? " · nofollow" : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
        {alese.length > 0 && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {alese.length} {alese.length === 1 ? "publicație" : "publicații"} — plătim{" "}
            <strong>{platim} lei</strong>, încasăm <strong>{incasam} lei</strong>, ne rămân{" "}
            <strong>{incasam - platim} lei</strong>.
          </p>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-brand-navy/40 bg-blue-50/40 p-3">
        <input
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          disabled={importa}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setImporta(true);
            setErr(null);
            try {
              const d = await importaDocx(f);
              if (d.title && !title.trim()) setTitle(d.title);
              if (d.body) setBody(d.body);
              if (d.linkNotes) setLinkNotes((p) => (p.trim() ? `${p.trim()}\n${d.linkNotes}` : d.linkNotes));
              const noi = d.images.slice(0, 3 - images.length).map((i) => ({ url: i.url, name: i.name }));
              if (noi.length) setImages((p) => [...p, ...noi]);
              setNota(mesajImportDocx(d, Math.max(0, 3 - images.length)));
            } catch (e2) {
              setErr(e2 instanceof Error ? e2.message : "Nu am putut citi documentul Word.");
            } finally {
              setImporta(false);
            }
          }}
        />
        {importa ? <Loader2 className="h-5 w-5 animate-spin text-brand-navy" /> : <Upload className="h-5 w-5 text-brand-navy" />}
        <span className="text-sm font-semibold text-brand-navy">
          {importa ? "Citim documentul…" : "Articolul e în Word? Încarcă .docx"}
        </span>
      </label>
      {nota && <p className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{nota}</p>}

      <div className="mt-4 space-y-3">
        <div>
          <label className={lab}>Titlu *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lab}>Textul articolului *</label>
          <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className={inp} />
          <p className="mt-1 text-xs text-amber-700">
            Scoate de aici numele firmei clientului dacă nu vrei ca publicația să-l afle. Ce e în
            casetă se trimite exact așa; comanda clientului rămâne neatinsă.
          </p>
        </div>
        <div>
          <label className={lab}>Linkurile de păstrat (ancoră → adresă)</label>
          <textarea
            rows={2}
            value={linkNotes}
            onChange={(e) => setLinkNotes(e.target.value)}
            className={inp}
            placeholder={"perdele la comandă Iași → https://firma.ro"}
          />
        </div>
        <div>
          <label className={lab}>Etichetă internă (nu o vede nimeni în afară de tine)</label>
          <input
            value={clientLabel}
            onChange={(e) => setClientLabel(e.target.value)}
            className={inp}
            placeholder="ART JUNKIE — septembrie"
          />
        </div>

        <div>
          <p className={lab}>Poze ({images.length}/3)</p>
          {images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {images.map((im, i) => (
                <div key={im.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="h-16 w-24 rounded border border-slate-200 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    aria-label="Șterge"
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < 3 && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:border-brand-navy">
              {urca ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {urca ? "Se încarcă..." : "Adaugă poze"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={urca}
                onChange={async (e) => {
                  const list = e.target.files;
                  e.target.value = "";
                  if (!list?.length) return;
                  setUrca(true);
                  setErr(null);
                  try {
                    const next = [...images];
                    for (const f of Array.from(list)) {
                      if (next.length >= 3) break;
                      next.push(await signAndUpload(f));
                    }
                    setImages(next);
                  } catch (e2) {
                    setErr(e2 instanceof Error ? e2.message : "Încărcarea a eșuat");
                  } finally {
                    setUrca(false);
                  }
                }}
              />
            </label>
          )}
        </div>
      </div>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <button
        type="button"
        onClick={trimite}
        disabled={busy || urca || importa}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Trimite la {alese.length || "—"} {alese.length === 1 ? "publicație" : "publicații"}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Fiecare publicație primește un email cu articolul și cu propriul link. Refuz în 2 zile
        lucrătoare, publicare în 3.
      </p>
    </div>
  );
}
