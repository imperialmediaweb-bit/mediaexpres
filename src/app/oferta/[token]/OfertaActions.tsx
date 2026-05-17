"use client";

import { useState } from "react";
import { Rocket, MessageCircle, Clock } from "lucide-react";
import Link from "next/link";

interface Props {
  token: string;
  firstName: string;
}

type View = "main" | "question" | "later" | "sent";

export function OfertaActions({ token, firstName }: Props) {
  const [view, setView] = useState<View>("main");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendQuestion() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/fb-lead/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, question }),
      });
    } finally {
      setLoading(false);
      setView("sent");
    }
  }

  if (view === "sent") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-3xl">✅</p>
        <h3 className="mt-3 font-serif text-xl font-bold text-brand-navy">
          Întrebarea a fost trimisă, {firstName}!
        </h3>
        <p className="mt-2 text-slate-600">Îți răspundem pe email în câteva ore.</p>
      </div>
    );
  }

  if (view === "later") {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center">
        <p className="text-3xl">💙</p>
        <h3 className="mt-3 font-serif text-xl font-bold text-brand-navy">
          Nicio problemă, {firstName}!
        </h3>
        <p className="mt-2 text-slate-600">
          Această pagină rămâne activă 90 de zile. Revino când ești gata.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Îți trimitem câteva informații utile pe email în zilele următoare.
        </p>
      </div>
    );
  }

  if (view === "question") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <h3 className="font-serif text-xl font-bold text-brand-navy">Scrie întrebarea ta</h3>
        <p className="mt-1 text-sm text-slate-500">Îți răspundem pe email în câteva ore.</p>
        <textarea
          className="mt-4 min-h-[120px] w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand-red focus:outline-none"
          placeholder="Ex: Pot trimite un articol în engleză? Ce ziare acoperă Clujul? Pot plăti în rate?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={sendQuestion}
            disabled={loading || !question.trim()}
            className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-50"
          >
            {loading ? "Se trimite..." : "Trimite întrebarea"}
          </button>
          <button
            onClick={() => setView("main")}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm text-slate-600 hover:bg-slate-50"
          >
            Înapoi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="mb-6 text-center font-serif text-xl font-bold text-brand-navy">
        Ce faci mai departe?
      </h2>

      <Link
        href={`/materiale/${token}`}
        className="flex items-center gap-4 rounded-2xl border-2 border-brand-red bg-brand-red p-5 text-white shadow-lg transition hover:bg-brand-red/90"
      >
        <Rocket className="h-8 w-8 flex-shrink-0" />
        <div>
          <p className="text-lg font-bold">Public ACUM</p>
          <p className="text-sm text-red-100">
            Completezi datele firmei + articolul → publicăm în 24h
          </p>
        </div>
      </Link>

      <button
        onClick={() => setView("question")}
        className="flex w-full items-center gap-4 rounded-2xl border-2 border-brand-navy bg-white p-5 text-brand-navy shadow transition hover:bg-slate-50"
      >
        <MessageCircle className="h-8 w-8 flex-shrink-0" />
        <div className="text-left">
          <p className="text-lg font-bold">Am o întrebare</p>
          <p className="text-sm text-slate-500">Scrie-ne și îți răspundem pe email</p>
        </div>
      </button>

      <button
        onClick={() => setView("later")}
        className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 transition hover:bg-slate-50"
      >
        <Clock className="h-8 w-8 flex-shrink-0" />
        <div className="text-left">
          <p className="font-semibold">Mă gândesc</p>
          <p className="text-sm text-slate-400">Pagina rămâne activă 90 de zile</p>
        </div>
      </button>
    </div>
  );
}
