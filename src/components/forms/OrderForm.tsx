"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { orderSchema, type OrderInput } from "@/lib/validators";
import { getAllPackages, SUBSCRIPTION_PLANS } from "@/data/packages";
import { formatPrice } from "@/lib/utils";

interface OrderFormProps {
  defaultPackageId?: string;
  onSuccess?: () => void;
}

export function OrderForm({ defaultPackageId, onSuccess }: OrderFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      packageId: defaultPackageId || "",
      gdprConsent: false as unknown as true,
    },
  });

  const onSubmit = async (data: OrderInput) => {
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error || "Eroare la trimitere");
      }
      setStatus("success");
      reset();
      onSuccess?.();
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Eroare necunoscută");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h3 className="font-serif text-2xl font-semibold text-brand-navy">
          Comandă primită!
        </h3>
        <p className="text-slate-600">
          Îți mulțumim! Echipa noastră te va contacta în maximum 2 ore (în timpul programului) cu
          detaliile de plată și confirmarea publicării.
        </p>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          Trimite altă comandă
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="text" {...register("website")} className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume complet *" error={errors.name?.message}>
          <Input {...register("name")} placeholder="Ion Popescu" />
        </Field>
        <Field label="Email *" error={errors.email?.message}>
          <Input type="email" {...register("email")} placeholder="ion@firma.ro" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefon *" error={errors.phone?.message}>
          <Input type="tel" {...register("phone")} placeholder="+40 721 234 567" />
        </Field>
        <Field label="Companie" error={errors.company?.message}>
          <Input {...register("company")} placeholder="opțional" />
        </Field>
      </div>

      <Field label="Alege pachetul *" error={errors.packageId?.message}>
        <select
          {...register("packageId")}
          className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
        >
          <option value="">— alege un pachet —</option>
          <optgroup label="Standard">
            {getAllPackages()
              .filter((p) => p.category === "standard")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.price)} RON
                </option>
              ))}
          </optgroup>
          <optgroup label="Cazino / iGaming">
            {getAllPackages()
              .filter((p) => p.category === "casino")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.price)} RON
                </option>
              ))}
          </optgroup>
          <optgroup label="Abonamente lunare">
            {SUBSCRIPTION_PLANS.map((p) => (
              <option key={`sub-${p.id}`} value={`sub-${p.id}`}>
                Abonament {p.name} — de la {formatPrice(p.priceStandard)} RON/lună
              </option>
            ))}
          </optgroup>
        </select>
      </Field>

      <Field label="Titlul articolului *" error={errors.articleTitle?.message}>
        <Input {...register("articleTitle")} placeholder="Titlul propus pentru articol" />
      </Field>

      <Field
        label="Textul articolului"
        error={errors.articleBody?.message}
        hint="Poți completa acum sau îl poți trimite ulterior pe email"
      >
        <Textarea {...register("articleBody")} rows={6} placeholder="Paragrafele articolului..." />
      </Field>

      <Field
        label="URL articol existent"
        error={errors.articleUrl?.message}
        hint="Dacă articolul e deja online, pune link-ul aici"
      >
        <Input type="url" {...register("articleUrl")} placeholder="https://..." />
      </Field>

      <Field label="Observații" error={errors.notes?.message}>
        <Textarea {...register("notes")} rows={3} placeholder="Preferințe, data dorită etc." />
      </Field>

      <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
        <Checkbox {...register("gdprConsent")} />
        <span>
          Sunt de acord cu{" "}
          <a href="/legal/gdpr" className="text-brand-red font-medium hover:underline">
            procesarea datelor personale
          </a>{" "}
          conform GDPR. *
        </span>
      </label>
      {errors.gdprConsent && (
        <p className="text-sm text-red-600">{errors.gdprConsent.message}</p>
      )}

      {status === "error" && errorMsg && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Se trimite...
          </>
        ) : (
          "Trimite comanda"
        )}
      </Button>
      <p className="text-xs text-slate-500 text-center">
        Nu reținem nimic pe card — te contactăm pentru facturare & plată.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
