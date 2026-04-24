"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ProfileInitial {
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  companyCui: string | null;
  companyRegNo: string | null;
  companyAddress: string | null;
}

interface FormValues {
  name: string;
  phone: string;
  companyName: string;
  companyCui: string;
  companyRegNo: string;
  companyAddress: string;
}

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: initial.name || "",
      phone: initial.phone || "",
      companyName: initial.companyName || "",
      companyCui: initial.companyCui || "",
      companyRegNo: initial.companyRegNo || "",
      companyAddress: initial.companyAddress || "",
    },
  });
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormValues) => {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Eroare");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume complet">
          <Input {...register("name")} placeholder="Ion Popescu" />
        </Field>
        <Field label="Email">
          <Input value={initial.email || ""} disabled />
        </Field>
      </div>

      <Field label="Telefon">
        <Input type="tel" {...register("phone")} placeholder="+40 721 234 567" />
      </Field>

      <div className="pt-4 border-t border-slate-200">
        <h3 className="font-serif text-lg font-semibold text-brand-navy">
          Date firma (pentru factura fiscala)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Daca factura se emite catre o firma, completeaza datele de aici. Daca platesti
          ca persoana fizica, le poti lasa goale.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume firma">
          <Input {...register("companyName")} placeholder="SC Exemplu SRL" />
        </Field>
        <Field label="CUI">
          <Input {...register("companyCui")} placeholder="RO12345678" />
        </Field>
      </div>

      <Field label="Nr. reg. comertului">
        <Input {...register("companyRegNo")} placeholder="J40/1234/2020" />
      </Field>

      <Field label="Adresa firmei">
        <Textarea {...register("companyAddress")} rows={3} placeholder="Strada, nr., oras, judet" />
      </Field>

      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {status === "success" && (
        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Datele au fost salvate.</span>
        </div>
      )}

      <Button type="submit" variant="accent" size="lg" disabled={status === "saving"}>
        {status === "saving" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Se salveaza...
          </>
        ) : (
          "Salveaza datele"
        )}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
