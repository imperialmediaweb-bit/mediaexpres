"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles, MessageCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  prospectCompany?: string;
  prospectIndustry?: string;
  prospectCity?: string;
}

const SUGGESTIONS = [
  "Ce pachet pentru o firma locala dintr-un singur oras?",
  "Care e diferenta intre Regional si National 50?",
  "Pentru un magazin online national, ce recomanzi?",
  "Daca public lunar, e mai bun abonamentul?",
];

export function AdvisorChat({
  prospectCompany,
  prospectIndustry,
  prospectCity,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { role: "user", content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory,
          prospectCompany,
          prospectIndustry,
          prospectCity,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Eroare server");
      }
      setMessages([
        ...newHistory,
        { role: "assistant", content: data.answer },
      ]);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "eroare necunoscuta";
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: `Imi pare rau, am o problema tehnica acum (${errMsg}). Scrieti-ne direct la contact@mediaexpress.ro si va raspundem in cateva ore.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section bg-gradient-to-b from-slate-50 to-white">
      <div className="container max-w-3xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-semibold text-amber-800">
            <Sparkles className="h-3 w-3" />
            Consultant rapid
          </div>
          <h2 className="h2 mt-4">Nu stii ce pachet sa alegi? Intreaba.</h2>
          <p className="lead mt-3 text-slate-600">
            Agentul nostru te ajuta sa decizi - raspunsuri strict din portofoliul
            MediaExpres (50 publicatii, regiuni, pachete, abonamente).
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-brand-navy px-5 py-3 flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5 text-brand-gold" />
            <p className="text-sm font-semibold">Consultant MediaExpres</p>
            <span className="ml-auto text-xs text-white/60">online</span>
          </div>

          <div
            ref={scrollRef}
            className="p-5 min-h-[260px] max-h-[460px] overflow-y-auto space-y-4 bg-slate-50/50"
          >
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm">
                    Salut! Sunt consultantul retelei MediaExpres. Te ajut sa decizi
                    rapid ce pachet ti se potriveste. Spune-mi cateva detalii
                    despre firma ta sau alege una dintre intrebarile de mai jos.
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    Intrebari sugerate
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        disabled={loading}
                        className="text-left rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:border-brand-red hover:bg-red-50/50 hover:text-brand-red transition disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-brand-navy text-white rounded-tr-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                  Caut in portofoliul MediaExpres...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Scrie intrebarea ta - ex: 'Sunt cabinet stomato in Cluj, ce pachet?'"
                disabled={loading}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10 disabled:opacity-50"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-brand-red px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label="Trimite"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Consultantul raspunde strict despre pachetele si reteaua MediaExpres.
              Pentru intrebari personalizate scrie-ne pe contact@mediaexpress.ro.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
