"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle, Send, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";
import { AIGenerateForm } from "./AIGenerateForm";

interface Props {
  articleId?: string;
  initial?: { title: string; body: string; existingUrl: string; notes: string };
  initialPhotos?: UploadedPhoto[];
  canGenerate: boolean;
  defaultCategory: "standard" | "casino";
  readOnly?: boolean;
}

type Status = "idle" | "saving" | "submitting" | "success" | "submitted" | "error";

export function ArticleEditor({
  articleId: initialId,
  initial = { title: "", body: "", existingUrl: "", notes: "" },
  initialPhotos = [],
  canGenerate,
  defaultCategory,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [id, setId] = useState<string | undefined>(initialId);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [existingUrl, setExistingUrl] = useState(initial.existingUrl);
  const [notes, setNotes] = useState(initial.notes);
  const [aiUsed, setAiUsed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function createOrSave(action: "save" | "submit") {
    setError(null);
    setStatus(action === "submit" ? "submitting" : "saving");
    try {
      if (!id) {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, existingUrl, notes, aiGenerated: aiUsed }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
        setId(data.id);
        if (action === "save") {
          router.replace(`/cont/articole/${data.id}`);
          setStatus("success");
          return;
        }
        const res2 = await fetch(`/api/articles/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        });
        const d2 = await res2.json();
        if (!res2.ok || !d2.ok) throw new Error(d2.error || "Eroare la trimitere");
        setStatus("submitted");
        setTimeout(() => router.push("/cont/articole"), 1200);
        return;
      }

      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, existingUrl, notes, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      setStatus(action === "submit" ? "submitted" : "success");
      if (action === "submit") {
        setTimeout(() => router.push("/cont/articole"), 1200);
      } else {
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    }
  }

  return (
    <div className="space-y-6">
      {canGenerate && !readOnly && (
        <AIGenerateForm
          defaultCategory={defaultCategory}
          onGenerated={(t, b) => {
            setTitle(t);
            setBody(b);
            setAiUsed(true);
          }}
        />
      )}

      <div className="space-y-1.5">
        <Label>Titlu articol *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titlul propus pentru articol"
          disabled={readOnly}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Textul articolului</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder="Scrie paragrafele articolului aici..."
          disabled={readOnly}
        />
        <p className="text-xs text-slate-500">
          Minim 300 cuvinte recomandat. Poti lasa gol daca pui un URL de articol existent mai jos.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>URL articol existent (optional)</Label>
        <Input
          type="url"
          value={existingUrl}
          onChange={(e) => setExistingUrl(e.target.value)}
          placeholder="https://..."
          disabled={readOnly}
        />
        <p className="text-xs text-slate-500">
          Daca articolul e deja publicat pe site-ul tau, pune link-ul aici — il preluam ca referinta.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Observatii (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Preferinte, data dorita, cuvinte cheie etc."
          disabled={readOnly}
        />
      </div>

      {id ? (
        <PhotoUploader articleId={id} initial={initialPhotos} />
      ) : (
        <p className="text-xs text-slate-500">Salveaza articolul ca draft inainte sa adaugi poze.</p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {status === "success" && (
        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Draft salvat.</span>
        </div>
      )}
      {status === "submitted" && (
        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Articol trimis spre publicare. Redirectionare...</span>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => createOrSave("save")}
            disabled={status === "saving" || status === "submitting" || title.length < 3}
          >
            {status === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salveaza...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Salveaza ca draft
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={() => createOrSave("submit")}
            disabled={status === "saving" || status === "submitting" || title.length < 3}
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Se trimite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Trimite spre publicare
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
