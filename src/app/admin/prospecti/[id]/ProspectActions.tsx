"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = [
  { value: "new", label: "Nou" },
  { value: "contacted", label: "Contactat" },
  { value: "replied", label: "A răspuns" },
  { value: "interested", label: "Interesat" },
  { value: "converted", label: "Convertit" },
  { value: "declined", label: "Refuzat" },
  { value: "bounced", label: "Email invalid" },
];

export function ProspectActions({
  prospectId,
  currentStatus,
  email,
}: {
  prospectId: string;
  currentStatus: string;
  email: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState(currentStatus);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function generate() {
    setGenLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      setSubject(data.subject);
      setBody(data.body);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setGenLoading(false);
    }
  }

  async function send() {
    if (!subject || !body) {
      setError("Generează sau scrie subject + body întâi");
      return;
    }
    setSendLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", subject, body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      showSuccess("Email trimis. Status mutat la contacted.");
      setStatus("contacted");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setSendLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    setStatusLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      setStatus(newStatus);
      showSuccess(`Status: ${newStatus}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Label className="text-xs">Status</Label>
        <select
          value={status}
          onChange={(e) => updateStatus(e.target.value)}
          disabled={statusLoading}
          className="mt-1.5 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
        <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-700" />
          Email outreach AI
        </h3>
        <p className="mt-1 text-xs text-slate-500">Trimite la: <strong>{email}</strong></p>

        <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={generate} disabled={genLoading || sendLoading}>
          {genLoading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> AI scrie...</>) : (<><Sparkles className="h-3.5 w-3.5" /> Generează cu AI</>)}
        </Button>

        <div className="mt-4 space-y-2">
          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Subiectul email-ului" />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 font-mono text-xs" placeholder="Textul email-ului..." />
          </div>
        </div>

        <Button type="button" variant="accent" size="sm" className="mt-3 w-full" onClick={send} disabled={sendLoading || genLoading || !subject || !body}>
          {sendLoading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Se trimite...</>) : (<><Send className="h-3.5 w-3.5" /> Trimite cu Resend</>)}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-xs text-green-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
