"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, AlertCircle, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface FormValues {
  siteName: string;
  siteUrl: string;
  county: string;
  region: string;
  facebookUrl: string;
  monthlyTraffic?: number;
  articlesPerMonth?: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  payoutIban: string;
  payoutCompany: string;
  notes: string;
  gdprConsent: boolean;
}

export function PartnerApplyForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormValues) => {
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          monthlyTraffic: data.monthlyTraffic ? Number(data.monthlyTraffic) : undefined,
          articlesPerMonth: data.articlesPerMonth ? Number(data.articlesPerMonth) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Eroare la trimitere");
      setStatus("success");
      reset();
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h3 className="font-serif text-2xl font-semibold text-brand-navy">
          Aplicație primită!
        </h3>
        <p className="text-slate-600 max-w-md">
          Îți mulțumim. Echipa MediaExpres analizează cererea și te contactăm în
          maximum 3 zile lucrătoare cu răspunsul.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-2 text-brand-red">
        <Users className="h-5 w-5" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Aplicație ziar partener
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Numele site-ului *" error={errors.siteName?.message}>
          <Input {...register("siteName", { required: "Obligatoriu", minLength: 2 })} placeholder="Ziarul de Cluj" />
        </Field>
        <Field label="URL site *" error={errors.siteUrl?.message}>
          <Input type="url" {...register("siteUrl", { required: "Obligatoriu" })} placeholder="https://ziaruldecluj.ro" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Județ"><Input {...register("county")} placeholder="Cluj" /></Field>
        <Field label="Regiune">
          <select {...register("region")} className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">— alege —</option>
            <option value="Național">Național</option>
            <option value="Moldova">Moldova</option>
            <option value="Transilvania">Transilvania</option>
            <option value="Muntenia">Muntenia</option>
            <option value="Banat">Banat / Oltenia</option>
          </select>
        </Field>
      </div>

      <Field label="Pagină Facebook">
        <Input type="url" {...register("facebookUrl")} placeholder="https://facebook.com/..." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trafic lunar estimativ">
          <Input type="number" {...register("monthlyTraffic")} placeholder="50000" />
        </Field>
        <Field label="Câți advertoriali acceptați / lună">
          <Input type="number" {...register("articlesPerMonth")} placeholder="20" />
        </Field>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <h3 className="font-serif text-lg font-semibold text-brand-navy">Persoană de contact</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume complet *" error={errors.contactName?.message}>
          <Input {...register("contactName", { required: "Obligatoriu", minLength: 2 })} placeholder="Ion Popescu" />
        </Field>
        <Field label="Email contact *" error={errors.contactEmail?.message}>
          <Input type="email" {...register("contactEmail", { required: "Obligatoriu" })} placeholder="contact@ziar.ro" />
        </Field>
      </div>

      <Field label="Telefon">
        <Input type="tel" {...register("contactPhone")} placeholder="+40 721 234 567" />
      </Field>

      <div className="pt-4 border-t border-slate-200">
        <h3 className="font-serif text-lg font-semibold text-brand-navy">Date pentru plată (decontarea articolelor)</h3>
        <p className="mt-1 text-xs text-slate-500">Le completezi acum sau mai târziu, după aprobarea aplicației.</p>
      </div>

      <Field label="IBAN"><Input {...register("payoutIban")} placeholder="RO49AAAA1B31007593840000" /></Field>
      <Field label="Denumire companie (pentru factură)"><Input {...register("payoutCompany")} placeholder="SC ZIARUL SRL" /></Field>
      <Field label="Observații / detalii suplimentare">
        <Textarea rows={4} {...register("notes")} placeholder="Spune-ne ce face site-ul tău diferit, ce audiență aveți..." />
      </Field>

      <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
        <Checkbox {...register("gdprConsent", { required: true })} />
        <span>
          Sunt de acord cu{" "}
          <a href="/legal/gdpr" target="_blank" className="text-brand-red font-medium hover:underline">
            procesarea datelor personale
          </a>{" "}
          conform GDPR. *
        </span>
      </label>
      {errors.gdprConsent && (
        <p className="text-sm text-red-600">Trebuie să accepți procesarea datelor</p>
      )}

      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={status === "submitting"}>
        {status === "submitting" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Se trimite...</>
        ) : (
          "Trimite aplicația"
        )}
      </Button>
      <p className="text-xs text-slate-500 text-center">Răspundem la toate aplicațiile în maximum 3 zile lucrătoare.</p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
