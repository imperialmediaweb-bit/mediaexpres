"use client";

import { useState } from "react";
import { Loader2, Check, AlertCircle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FormState {
  agencyName: string;
  cui: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  activeClients: string;
  monthlyVolume: string;
  message: string;
}

const INITIAL: FormState = {
  agencyName: "",
  cui: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  activeClients: "",
  monthlyVolume: "",
  message: "",
};

export function ApplicationForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (form.agencyName.length < 2) {
      setError("Numele agentiei este obligatoriu");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Email invalid");
      return;
    }
    if (form.cui.length < 3) {
      setError("CUI obligatoriu");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parteneri/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare server");
      setSuccess(true);
      setForm(INITIAL);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-8 text-center">
        <Check className="mx-auto h-12 w-12 text-green-600" />
        <h3 className="mt-4 font-serif text-2xl font-bold text-brand-navy">
          Aplicatie primita!
        </h3>
        <p className="mt-3 text-slate-700">
          Va contactam pe email in maxim 24h lucratoare cu fie aprobarea +
          credentialele de cont reseller, fie cu intrebari clarificatoare.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Daca nu ne vedeti email-ul in 24h, verificati folder-ul Spam sau
          scrieti la contact@mediaexpress.ro
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nume agentie *">
          <Input
            value={form.agencyName}
            onChange={(e) => update("agencyName", e.target.value)}
            placeholder="SC Agentia Voastra SRL"
          />
        </Field>
        <Field label="CUI *">
          <Input
            value={form.cui}
            onChange={(e) => update("cui", e.target.value)}
            placeholder="RO12345678"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Persoana contact">
          <Input
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            placeholder="Ion Popescu"
          />
        </Field>
        <Field label="Email *">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="contact@agentie.ro"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Telefon">
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+40 7XX XXX XXX"
          />
        </Field>
        <Field label="Site agentie">
          <Input
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://agentie.ro"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nr clienti activi">
          <Input
            value={form.activeClients}
            onChange={(e) => update("activeClients", e.target.value)}
            placeholder="Ex: 5-10"
          />
        </Field>
        <Field label="Volum lunar estimat (articole)">
          <Input
            value={form.monthlyVolume}
            onChange={(e) => update("monthlyVolume", e.target.value)}
            placeholder="Ex: 3-5 articole/luna"
          />
        </Field>
      </div>

      <Field label="Mesaj liber (opt)">
        <Textarea
          rows={3}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="Spuneti-ne pe scurt despre portofoliul vostru, ce industrii acoperiti, sau orice intrebare specifica."
        />
      </Field>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        variant="accent"
        size="lg"
        className="w-full"
        onClick={submit}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Se trimite...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Trimite aplicatia
          </>
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        Va raspundem in 24h lucratoare pe email-ul de mai sus.
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
