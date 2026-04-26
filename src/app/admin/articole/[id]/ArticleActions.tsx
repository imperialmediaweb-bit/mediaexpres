"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  articleId: string;
  initialStatus: string;
  initialUrls: string[];
}

export function ArticleActions({ articleId, initialStatus, initialUrls }: Props) {
  const router = useRouter();
  const [urlsText, setUrlsText] = useState(initialUrls.join("\n"));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<null | "publish" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: "publish" | "reject") {
    setError(null);
    setLoading(action);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "publish") {
        const urls = urlsText
          .split(/\n+/)
          .map((u) => u.trim())
          .filter(Boolean);
        if (urls.length === 0) throw new Error("Adauga cel puțin un URL");
        body.publishedUrls = urls;
      }
      if (action === "reject") body.rejectionReason = reason;

      const res = await fetch(`/api/admin/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setLoading(null);
    }
  }

  if (initialStatus === "published") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <CheckCircle2 className="inline h-4 w-4 mr-1" />
        Articol publicat. Link-urile apar mai jos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-200 bg-white p-5">
        <h3 className="font-serif text-lg font-semibold text-brand-navy flex items-center gap-2">
          <Send className="h-5 w-5 text-green-600" />
          Marchează ca publicat
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Lipește toate URL-urile de publicare (câte unul pe linie). Client-ul
          primește email automat.
        </p>
        <div className="mt-3 space-y-1.5">
          <Label>URL-uri publicate</Label>
          <Textarea
            rows={8}
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={"https://ziar1.ro/articol/...\nhttps://ziar2.ro/articol/..."}
          />
        </div>
        <Button
          type="button"
          variant="accent"
          className="mt-4"
          onClick={() => call("publish")}
          disabled={loading !== null}
        >
          {loading === "publish" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Se publică...</>
          ) : (
            <><Send className="h-4 w-4" /> Publică & trimite email</>
          )}
        </Button>
      </div>

      <div className="rounded-xl border border-red-200 bg-white p-5">
        <h3 className="font-serif text-lg font-semibold text-brand-navy flex items-center gap-2">
          <X className="h-5 w-5 text-red-600" />
          Respinge
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Pune un motiv care să îl ajute pe client să ajusteze articolul.
        </p>
        <div className="mt-3 space-y-1.5">
          <Label>Motiv (optional dar recomandat)</Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: articolul menționează un produs de cazino neautorizat ONJN"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => call("reject")}
          disabled={loading !== null}
        >
          {loading === "reject" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Se respinge...</>
          ) : (
            <><X className="h-4 w-4" /> Respinge & trimite email</>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 p-3">{error}</p>
      )}
    </div>
  );
}
