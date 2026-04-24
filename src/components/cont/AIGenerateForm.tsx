"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  onGenerated: (title: string, body: string) => void;
  defaultCategory?: "standard" | "casino";
}

export function AIGenerateForm({ onGenerated, defaultCategory = "standard" }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<"neutru" | "promotional" | "informativ">("informativ");
  const [category, setCategory] = useState<"standard" | "casino">(defaultCategory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keyPoints, audience, tone, category }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Eroare");
      onGenerated(body.title, body.body);
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" />
        Genereaza cu AI
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 space-y-4">
      <div className="flex items-center gap-2 text-purple-900">
        <Sparkles className="h-5 w-5" />
        <h3 className="font-semibold">Generare articol cu AI</h3>
      </div>

      <div className="space-y-1.5">
        <Label>Tema / subiect *</Label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="ex: Lansarea unui nou serviciu de consultanta fiscala in Cluj"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Puncte cheie (optional)</Label>
        <Textarea
          rows={3}
          value={keyPoints}
          onChange={(e) => setKeyPoints(e.target.value)}
          placeholder="- 10 ani experienta&#10;- clienti din IT, retail&#10;- primul abonament gratuit"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Ton</Label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="informativ">Informativ</option>
            <option value="neutru">Neutru</option>
            <option value="promotional">Promotional</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Categorie</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="standard">Standard</option>
            <option value="casino">Cazino / iGaming</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-1">
          <Label>Public tinta</Label>
          <Input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="antreprenori"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="accent"
          onClick={generate}
          disabled={loading || topic.length < 3}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Genereaza...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Genereaza acum
            </>
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Anuleaza
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Rezultatul apare in campurile de titlu si text — il poti edita inainte sa il trimiti.
      </p>
    </div>
  );
}
