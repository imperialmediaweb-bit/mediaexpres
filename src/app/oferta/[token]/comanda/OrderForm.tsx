"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderFormProps {
  token: string;
  prospectCompany: string;
}

const PACKAGES = [
  { id: "national", label: "Național 50 — 1500 RON (50 ziare, recomandat)" },
  { id: "regional", label: "Regional — 500 RON (10 ziare zonale)" },
  { id: "local", label: "Local — 150 RON (1 ziar județean)" },
  { id: "cazino-national", label: "Cazino Național — 2500 RON" },
  { id: "cazino-regional", label: "Cazino Regional — 900 RON" },
  { id: "cazino-local", label: "Cazino Local — 300 RON" },
];

export default function OrderForm({
  token,
  prospectCompany,
}: OrderFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(fd.entries());
    body.gdprConsent = fd.get("gdprConsent") === "on";

    const res = await fetch(`/api/oferta/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "A apărut o eroare. Încearcă din nou.");
      setSubmitting(false);
      return;
    }

    router.push(`/oferta/${token}/multumesc`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-slate-200 p-8 space-y-8"
    >
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      {/* 1. Pachet */}
      <div>
        <h3 className="font-serif text-xl font-bold text-brand-navy">
          1. Pachetul ales
        </h3>
        <select
          name="packageId"
          required
          defaultValue="national"
          className="mt-3 w-full rounded-md border border-slate-300 px-4 py-3 text-sm"
        >
          {PACKAGES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Date firma cumparatoare */}
      <div>
        <h3 className="font-serif text-xl font-bold text-brand-navy">
          2. Datele firmei (pentru factură)
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Aceste date apar pe factura fiscală pe care o primești după
          publicare.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            name="buyerCompanyName"
            label="Denumire firmă"
            required
            defaultValue={prospectCompany}
          />
          <Field
            name="buyerCui"
            label="CUI / CIF"
            required
            placeholder="RO12345678"
          />
          <Field
            name="buyerRegCom"
            label="Nr. Reg. Comerțului"
            placeholder="J40/1234/2024"
          />
          <Field name="buyerPhone" label="Telefon" placeholder="+40..." />
          <Field
            name="buyerEmail"
            label="Email factură"
            type="email"
            required
            wide
          />
          <Field
            name="buyerAddress"
            label="Adresă sediu social"
            required
            wide
            placeholder="Strada, număr, oraș, județ"
          />
        </div>
      </div>

      {/* 3. Articol */}
      <div>
        <h3 className="font-serif text-xl font-bold text-brand-navy">
          3. Articolul
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Trimite doar tematica — AI redactează articolul. Cu cât mai mult
          context, cu atât mai bun rezultatul.
        </p>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Tematica articolului <span className="text-red-500">*</span>
        </label>
        <textarea
          name="articleTopic"
          required
          rows={6}
          minLength={20}
          placeholder="Despre ce vrei să scriem? Ex: lansare produs nou, eveniment, parteneriat, rezultate anuale, campanie, etc. Include detalii utile (date, nume, beneficii)."
          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Link-uri către poze (opțional)
        </label>
        <textarea
          name="photoLinks"
          rows={2}
          placeholder="Lipește 2–3 link-uri Google Drive / Dropbox / WeTransfer"
          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Note suplimentare (opțional)
        </label>
        <textarea
          name="articleNotes"
          rows={2}
          placeholder="Brand voice, linkuri de inclus, evitări, etc."
          className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm"
        />
      </div>

      {/* GDPR */}
      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          name="gdprConsent"
          required
          className="mt-1 h-4 w-4"
        />
        <span>
          Sunt de acord cu prelucrarea datelor pentru emiterea facturii și
          livrarea serviciului.
        </span>
      </label>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-brand-gold px-6 py-4 font-semibold text-brand-navy hover:bg-brand-gold-light disabled:opacity-50"
      >
        {submitting
          ? "Trimit comanda..."
          : "Trimite comanda → raport + factură în 12 ore de la publicare"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Plata se face după publicare, pe baza facturii fiscale primite pe
        email. Fără plată în avans, fără proforma.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
  wide = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm"
      />
    </div>
  );
}
