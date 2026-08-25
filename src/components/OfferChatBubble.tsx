"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, MessageCircle, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Intrebarile pe care le pune omul CHIAR INAINTE de plata. Nu "ce pachet aleg"
// (aici a ales deja), ci nesiguranta care il opreste din a apasa butonul:
// cum platesc, primesc factura, unde apare, ce trimit, cand.
const SUGGESTIONS = [
  "Cum plătesc și primesc factură?",
  "Pot plăti prin transfer bancar (OP)?",
  "Unde exact se publică articolul?",
  "Cât durează până apare?",
  "Ce trebuie să trimit după plată?",
  "Nu am articol scris — mă ajutați?",
];

const GREETING =
  "Salut! Sunt consultantul MediaExpres. Întreabă-mă orice despre ofertă înainte să comanzi — plată, factură, unde apare articolul, ce trebuie să trimiți. Răspund pe loc.";

export function OfferChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare server");
      setMessages([...history, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages([
        ...history,
        {
          role: "assistant",
          content:
            "Am o problemă tehnică acum. Scrie-ne pe WhatsApp la +40 758 169 388 și îți răspundem imediat.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Deasupra barei fixe de comanda pe mobil, la stanga butonului de WhatsApp.
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full bg-brand-navy px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-navy/90 lg:bottom-6"
      >
        <MessageCircle className="h-5 w-5 text-brand-gold" />
        Ai o întrebare?
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:bottom-6 lg:right-auto lg:mx-0">
      <div className="flex items-center gap-2 bg-brand-navy px-4 py-3 text-white">
        <MessageCircle className="h-5 w-5 text-brand-gold" />
        <p className="text-sm font-semibold">Consultant MediaExpres</p>
        <span className="ml-auto text-xs text-white/60">online</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Închide conversația"
          className="ml-2 text-white/70 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="max-h-[50vh] min-h-[220px] space-y-3 overflow-y-auto bg-slate-50/60 p-4">
        {messages.length === 0 ? (
          <>
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm">
              {GREETING}
            </div>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={loading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-brand-red hover:bg-red-50/50 hover:text-brand-red disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm shadow-sm ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-brand-red text-white"
                    : "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrie întrebarea ta..."
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Trimite"
          className="rounded-lg bg-brand-navy px-3 py-2 text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
