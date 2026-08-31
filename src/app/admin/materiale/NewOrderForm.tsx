"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { STANDARD_PACKAGES, PROMO_PACKAGES } from "@/data/packages";

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
    paid: false,
  });

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
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      setOpen(false);
      setF({ ...f, title: "", body: "", email: "", companyName: "" });
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
          disabled={busy}
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
