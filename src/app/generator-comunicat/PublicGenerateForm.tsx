"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Newspaper,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FormValues {
  companyName: string;
  announcement: string;
  type:
    | "lansare"
    | "eveniment"
    | "parteneriat"
    | "rezultate"
    | "extindere"
    | "premii"
    | "altceva";
  contactName: string;
  contactEmail: string;
  city: string;
}

interface Result {
  title: string;
  body: string;
}

export function PublicGenerateForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { type: "lansare" },
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (data: FormValues) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/generate-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Eroare");
      setResult({ title: body.title, body: body.body });
      setStatus("idle");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    }
  };

  function copyAll() {
    if (!result) return;
    const text = `${result.title}\n\n${result.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4" />
            Comunicat generat cu succes
          </div>
          <p className="mt-1 text-xs">
            Îl poți copia, edita și folosi gratuit oriunde. Nu uita: un comunicat e cu adevărat
            valoros doar dacă ajunge la cititori.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold text-brand-navy">
            {result.title}
          </h2>
          <pre className="mt-5 whitespace-pre-wrap text-sm font-sans text-slate-700 leading-relaxed">
            {result.body}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={copyAll}>
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copiat!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiază tot textul
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setResult(null);
              setStatus("idle");
            }}
          >
            Generează altul
          </Button>
        </div>

        <div className="mt-6 rounded-2xl bg-brand-navy p-6 md:p-8 text-white">
          <div className="flex items-start gap-4">
            <Newspaper className="h-10 w-10 shrink-0 text-brand-gold" />
            <div className="flex-1">
              <p className="eyebrow text-brand-gold">Următorul pas</p>
              <h3 className="mt-2 font-serif text-2xl font-bold">
                Publică-l pe 50 de ziare în 24h
              </h3>
              <p className="mt-2 text-sm text-white/80">
                Pachetul Național — articolul tău apare pe 41 ziare locale + 9
                naționale, distribuit pe 50 pagini Facebook. Plătești o singură
                dată, rămâne online permanent.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="gold" size="lg" asChild>
                  <a href="/pachete">Vezi pachetele — de la 150 RON</a>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/40 text-white hover:bg-white hover:text-brand-navy"
                  asChild
                >
                  <a href="/oferta">Solicită lista ziarelor (gratuit)</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Numele firmei *" error={errors.companyName?.message}>
          <Input
            {...register("companyName", {
              required: "Obligatoriu",
              minLength: { value: 2, message: "Prea scurt" },
            })}
            placeholder="SC Exemplu SRL"
          />
        </Field>
        <Field label="Orașul">
          <Input {...register("city")} placeholder="Cluj-Napoca" />
        </Field>
      </div>

      <Field label="Tipul anunțului *">
        <select
          {...register("type")}
          className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="lansare">Lansare produs / serviciu</option>
          <option value="eveniment">Eveniment / conferință</option>
          <option value="parteneriat">Parteneriat strategic</option>
          <option value="rezultate">Rezultate financiare / operaționale</option>
          <option value="extindere">Extindere / locație nouă</option>
          <option value="premii">Premiu / distincție</option>
          <option value="altceva">Altceva</option>
        </select>
      </Field>

      <Field
        label="Ce anunți? *"
        error={errors.announcement?.message}
        hint="Spune în 2-3 propoziții ce vrei să comunici. Cu cât oferi mai multe detalii, cu atât textul e mai bun."
      >
        <Textarea
          rows={5}
          {...register("announcement", {
            required: "Obligatoriu",
            minLength: { value: 10, message: "Prea scurt — adaugă mai multe detalii" },
          })}
          placeholder="Ex: Firma noastra de consultanta fiscala lanseaza un nou serviciu de externalizare contabilitate pentru IMM-uri, cu preturi de la 350 RON/luna. Avem 10 ani experienta si peste 200 clienti activi in Cluj si zona Transilvaniei."
        />
      </Field>

      <div className="pt-2 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Opțional — adaugă datele de contact ale persoanei pentru presă (apar
          la finalul comunicatului).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Persoană contact presă">
          <Input {...register("contactName")} placeholder="Ana Popescu" />
        </Field>
        <Field label="Email contact">
          <Input
            type="email"
            {...register("contactEmail")}
            placeholder="presa@firma.ro"
          />
        </Field>
      </div>

      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Se generează (≈10 secunde)...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Generează comunicatul gratuit
          </>
        )}
      </Button>
      <p className="text-center text-xs text-slate-500">
        100% gratuit • fără cont • 5 generări / oră / IP
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
