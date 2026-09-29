"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, ShieldCheck } from "lucide-react";

type Expeditor = "client" | "partener" | "admin";

interface Mesaj {
  id: string;
  sender: Expeditor;
  body: string;
  blocked: string | null;
  createdAt: string;
}

const MOTIV: Record<string, string> = {
  telefon: "telefon",
  email: "email",
  link: "adresă de site",
  aplicatie: "WhatsApp / altă aplicație",
};

/**
 * Chatul client–partener dupa comanda. Cine esti o decide serverul din
 * token (`t`) sau din sesiunea de admin; `eu` e doar pentru afisare.
 */
export function ChatPlasare({
  t,
  p,
  eu,
  nume,
}: {
  t?: string;
  p?: string;
  eu: Expeditor;
  /** Cum apare fiecare parte in fir. */
  nume: Record<Expeditor, string>;
}) {
  const [mesaje, setMesaje] = useState<Mesaj[] | null>(null);
  const [text, setText] = useState("");
  const [trimite, setTrimite] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const jos = useRef<HTMLDivElement>(null);
  const qs = new URLSearchParams({ ...(t ? { t } : {}), ...(p ? { p } : {}) }).toString();

  const incarca = useCallback(async () => {
    try {
      const r = await fetch(`/api/mesaje-plasare?${qs}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setMesaje(j.mesaje);
      else setEroare(j.error);
    } catch {
      /* reincercam la urmatorul ciclu */
    }
  }, [qs]);

  useEffect(() => {
    void incarca();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void incarca();
    }, 15000);
    return () => clearInterval(id);
  }, [incarca]);

  useEffect(() => {
    const el = jos.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mesaje?.length]);

  async function trimiteMesaj() {
    if (!text.trim() || trimite) return;
    setTrimite(true);
    setEroare(null);
    try {
      const r = await fetch("/api/mesaje-plasare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t, p, text }),
      });
      const j = await r.json();
      if (!j.ok) {
        setEroare(j.error || "Mesajul n-a plecat.");
        if (eu === "admin") void incarca();
        return;
      }
      setText("");
      setMesaje((m) => [...(m || []), j.mesaj]);
    } catch {
      setEroare("Mesajul n-a plecat. Verifică internetul și încearcă din nou.");
    } finally {
      setTrimite(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="max-h-96 min-h-[8rem] space-y-3 overflow-y-auto p-4">
        {mesaje === null && <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />}
        {mesaje?.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            Niciun mesaj încă. Dacă ai o întrebare despre articol, scrie aici.
          </p>
        )}
        {mesaje?.map((m) => {
          const alMeu = m.sender === eu;
          return (
            <div key={m.id} className={`flex ${alMeu ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.blocked
                    ? "border border-red-300 bg-red-50 text-red-900"
                    : alMeu
                      ? "bg-brand-navy text-white"
                      : m.sender === "admin"
                        ? "border border-amber-200 bg-amber-50 text-slate-800"
                        : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className={`text-[11px] font-semibold ${alMeu && !m.blocked ? "text-white/70" : "text-slate-500"}`}>
                  {nume[m.sender]} ·{" "}
                  {new Date(m.createdAt).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {m.blocked && ` · OPRIT (${MOTIV[m.blocked] || m.blocked})`}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={jos} />
      </div>

      <div className="border-t border-slate-100 p-3" data-nu-acoperi="1">
        {eroare && <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">{eroare}</p>}
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void trimiteMesaj();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Scrie un mesaj…"
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void trimiteMesaj()}
            disabled={trimite || !text.trim()}
            aria-label="Trimite"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-red px-4 text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {trimite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        {eu !== "admin" && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            Discuția are loc doar aici și e văzută și de echipa MediaExpres. Telefoanele, emailurile și
            alte date de contact nu sunt transmise.
          </p>
        )}
      </div>
    </div>
  );
}
