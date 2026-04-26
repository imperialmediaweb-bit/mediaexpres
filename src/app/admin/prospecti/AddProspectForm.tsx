"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FormState {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  city: string;
  website: string;
  notes: string;
}

const INITIAL: FormState = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  industry: "",
  city: "",
  website: "",
  notes: "",
};

export function AddProspectForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (form.companyName.length < 2 || !form.email.includes("@")) {
      setError("Companie + email obligatoriu");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      setForm(INITIAL);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2.5 text-sm">
      <Field label="Companie *">
        <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="SC Exemplu SRL" />
      </Field>
      <Field label="Email *">
        <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="contact@firma.ro" />
      </Field>
      <Field label="Persoană contact">
        <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Ion Popescu" />
      </Field>
      <Field label="Industrie">
        <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="Real estate, IT, retail..." />
      </Field>
      <Field label="Oraș">
        <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Cluj-Napoca" />
      </Field>
      <Field label="Site web">
        <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://firma.ro" />
      </Field>
      <Field label="Telefon">
        <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+40..." />
      </Field>
      <Field label="Note (pt. AI)">
        <Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Lansează un produs nou luna asta, găsit pe Google..." />
      </Field>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="button" variant="accent" size="sm" className="w-full" onClick={submit} disabled={loading}>
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Se adaugă...</>
        ) : (
          <><Plus className="h-3.5 w-3.5" /> Adaugă</>
        )}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
