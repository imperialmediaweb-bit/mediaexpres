"use client";

import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  Send,
  MessageCircle,
  X,
  Upload,
  CheckCircle2,
  ShoppingCart,
  Newspaper,
  FileCheck,
  Trash2,
} from "lucide-react";
import { signAndUpload, type Uploaded } from "@/lib/upload-client";
import {
  STEPS,
  EMPTY_ORDER,
  nextStepIndex,
  buildSubmission,
  priceOf,
  packageIdOf,
  type OrderData,
} from "@/components/chat/order-steps";

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
  "Salut! Sunt consultantul MediaExpres. Întreabă-mă orice despre ofertă — plată, factură, unde apare articolul, ce trebuie să trimiți. Sau comandă direct de aici, fără să pleci din conversație.";

type Mode = "chat" | "order" | "sent";

export function OfferChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<Mode>("chat");
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OrderData>(EMPTY_ORDER);
  const [images, setImages] = useState<Uploaded[]>([]);
  const [proof, setProof] = useState<Uploaded | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open, step, images, proof]);

  function say(content: string) {
    setMessages((m) => [...m, { role: "assistant", content }]);
  }
  function echo(content: string) {
    setMessages((m) => [...m, { role: "user", content }]);
  }

  // ——— Intrebari libere catre consultant ———
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
      const dataRes = await res.json();
      if (!res.ok || !dataRes.ok) throw new Error(dataRes.error || "Eroare server");
      setMessages([...history, { role: "assistant", content: dataRes.answer }]);
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

  // ——— Comanda pas cu pas ———
  function startOrder() {
    setMode("order");
    setStepError(null);
    const first = nextStepIndex(0, EMPTY_ORDER);
    setStep(first);
    say(STEPS[first].ask(EMPTY_ORDER));
  }

  function goToNext(afterIndex: number, d: OrderData) {
    const next = nextStepIndex(afterIndex + 1, d);
    setStep(next);
    setStepError(null);
    if (next < STEPS.length) say(STEPS[next].ask(d));
  }

  async function goToCard(d: OrderData) {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: packageIdOf(d),
          mode: "payment",
          email: d.email.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok || !j.url) throw new Error(j.error || "Eroare");
      say("Te duc la plata securizată Stripe. După plată revii automat și trimiți articolul.");
      window.location.href = j.url;
    } catch {
      setLoading(false);
      say(
        "Nu am putut deschide plata cu cardul acum. Alege transfer bancar mai jos, sau scrie-ne pe WhatsApp la +40 758 169 388.",
      );
      // Il lasam sa aleaga din nou metoda, ca sa nu ramana blocat.
      const methodIdx = STEPS.findIndex((s) => s.id === "method");
      setStep(methodIdx);
    }
  }

  function answerChoice(value: string, label: string) {
    const s = STEPS[step];
    echo(label);
    const d = { ...data };
    if (s.id === "casino") d.isCasino = value === "da";
    if (s.id === "method") d.method = value === "card" ? "card" : "op";
    if (s.id === "hasArticle") d.hasArticle = value === "am";
    setData(d);
    // La card, toti pasii de dupa email sunt marcati `skip` — Stripe cere el
    // datele de facturare, iar articolul se trimite dupa confirmarea platii,
    // ca la orice comanda cu cardul. Deci drumul se scurteaza singur.
    goToNext(step, d);
  }

  function submitText(raw: string) {
    const s = STEPS[step];
    const value = raw.trim();
    const err = s.validate?.(value, data) ?? null;
    if (err) {
      setStepError(err);
      return;
    }
    echo(value || "(sar peste)");
    const d = { ...data };
    // Pasul „theme" scrie tot in body — la trimitere e marcat ca temă de redactat.
    const field = s.id === "theme" ? "body" : (s.id as keyof OrderData);
    (d as Record<string, unknown>)[field] = value;
    setData(d);
    setInput("");

    // Cu cardul, dupa email mergem direct la Stripe.
    if (s.id === "email" && d.method === "card") {
      void goToCard(d);
      return;
    }
    goToNext(step, d);
  }

  function skipStep() {
    echo("Sar peste");
    setInput("");
    goToNext(step, data);
  }

  async function upload(list: FileList | null, kind: "images" | "proof") {
    if (!list?.length) return;
    setStepError(null);
    setUploading(true);
    try {
      if (kind === "proof") {
        const up = await signAndUpload(list[0]);
        setProof(up);
        echo(`📎 ${up.name}`);
        goToNext(step, data);
      } else {
        const next = [...images];
        for (const file of Array.from(list)) {
          if (next.length >= 3) break;
          next.push(await signAndUpload(file));
        }
        setImages(next);
      }
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Încărcarea a eșuat");
    } finally {
      setUploading(false);
    }
  }

  async function submitOrder() {
    if (loading) return;
    setLoading(true);
    setStepError(null);
    try {
      const res = await fetch("/api/comanda/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildSubmission(data),
          images,
          featuredIndex: 0,
          ...(proof ? { paymentProof: proof } : {}),
          facebookOptIn: true,
          uniquePerSite: true,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Eroare la trimitere");
      setMode("sent");
      say(
        "Am primit comanda ta. Verificăm încasarea în extras — de obicei câteva ore lucrătoare, în funcție de bancă. Imediat după confirmare publicăm în maximum 4 ore lucrătoare și primești pe email raportul cu toate linkurile și factura fiscală.",
      );
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Eroare la trimitere");
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

  const current = mode === "order" && step < STEPS.length ? STEPS[step] : null;

  return (
    <div
      data-chat="panel"
      // z-50, nu z-40: butonul flotant de WhatsApp e tot z-40 si sta fix in
      // dreapta-jos, adica exact peste butonul de trimitere al chatului pe
      // ecran de telefon. La egalitate de z-index castiga ce vine mai tarziu in
      // DOM, deci WhatsApp fura atingerea si omul nu poate trimite mesajul.
      className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:bottom-6 lg:right-auto lg:mx-0"
    >
      <div className="flex items-center gap-2 bg-brand-navy px-4 py-3 text-white">
        <MessageCircle className="h-5 w-5 text-brand-gold" />
        <p className="text-sm font-semibold">Consultant MediaExpres</p>
        <span className="ml-auto text-xs text-white/60">
          {mode === "order" ? "comandă în curs" : "online"}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Închide conversația"
          className="ml-2 text-white/70 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[50vh] min-h-[220px] space-y-3 overflow-y-auto bg-slate-50/60 p-4"
      >
        {messages.length === 0 ? (
          <>
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm">
              {GREETING}
            </div>
            <button
              type="button"
              onClick={startOrder}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-3 py-2.5 text-sm font-bold text-white transition hover:bg-brand-red/90"
            >
              <ShoppingCart className="h-4 w-4" />
              Comandă acum — 500 lei
            </button>
            <a
              href="/reteaua-noastra"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-navy hover:text-brand-navy"
            >
              <Newspaper className="h-4 w-4" />
              Vezi lista celor 50 de ziare
            </a>
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

        {/* Pozele incarcate raman vizibile cat timp esti pe pasul lor. */}
        {current?.kind === "images" && images.length > 0 && (
          <div className="space-y-1.5">
            {images.map((img, i) => (
              <div
                key={img.url}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              >
                <FileCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate">{img.name}</span>
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  aria-label={`Șterge ${img.name}`}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {current?.kind === "review" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <Row k="Pachet" v={`50 de ziare${data.isCasino ? " (cazino)" : ""} — ${priceOf(data)} lei`} />
            <Row k="Email" v={data.email} />
            <Row k="Telefon" v={data.contactPhone} />
            <Row k="Firmă" v={`${data.companyName} · ${data.companyCui}`} />
            <Row k="Adresă" v={data.companyAddress} />
            <Row k="Articol" v={data.hasArticle ? data.title : "îl redactăm noi din tema ta"} />
            {data.siteUrl && <Row k="Site" v={data.siteUrl} />}
            <Row k="Poze" v={images.length ? `${images.length} încărcate` : "fără"} />
            <Row k="Plata" v={proof ? `dovadă atașată: ${proof.name}` : "după factura primită pe email"} />
          </div>
        )}

        {stepError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{stepError}</p>
        )}
      </div>

      {/* ——— Zona de jos, care se schimba dupa pasul curent ——— */}
      <div className="border-t border-slate-200 p-3">
        {mode === "sent" ? (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Comandă trimisă
          </p>
        ) : current?.kind === "choice" ? (
          <div className="grid gap-2">
            {current.choices?.map((c) => (
              <button
                key={c.value}
                type="button"
                disabled={loading}
                onClick={() => answerChoice(c.value, c.label)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-red hover:bg-red-50/50 hover:text-brand-red disabled:opacity-50"
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : current?.kind === "images" ? (
          <div className="flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-brand-red hover:text-brand-red">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {images.length ? `Mai adaugă (${images.length}/3)` : "Alege pozele"}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={uploading || images.length >= 3}
                onChange={(e) => void upload(e.target.files, "images")}
              />
            </label>
            <button
              type="button"
              onClick={() => goToNext(step, data)}
              disabled={uploading}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {images.length ? "Continuă" : "Fără poze"}
            </button>
          </div>
        ) : current?.kind === "proof" ? (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                echo("Trimit comanda, plătesc după factură");
                goToNext(step, data);
              }}
              disabled={uploading}
              className="rounded-lg bg-brand-red px-3 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 disabled:opacity-60"
            >
              Trimit comanda, plătesc după factură
            </button>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-navy">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Am plătit deja — încarc dovada
              <input
                type="file"
                accept="image/*,application/pdf"
                hidden
                disabled={uploading}
                onChange={(e) => void upload(e.target.files, "proof")}
              />
            </label>
          </div>
        ) : current?.kind === "review" ? (
          <button
            type="button"
            onClick={() => void submitOrder()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-3 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Trimite comanda
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (current) submitText(input);
              else void send(input);
            }}
            // noValidate: pastram type="email"/"tel" pentru tastatura potrivita
            // pe telefon, dar oprim bula nativa a browserului — e in engleza si
            // apare peste conversatie. Verificarea o facem noi, iar mesajul
            // apare in chat, in romana, ca orice alt raspuns.
            noValidate
            className="flex gap-2"
          >
            {current?.kind === "long" ? (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                placeholder={current.placeholder}
                className="min-w-0 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
              />
            ) : (
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                type={current?.kind === "email" ? "email" : current?.kind === "tel" ? "tel" : "text"}
                placeholder={current?.placeholder ?? "Scrie întrebarea ta..."}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
              />
            )}
            {current?.skippable && (
              <button
                type="button"
                onClick={skipStep}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-500 hover:text-slate-800"
              >
                Sar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || (!current && !input.trim())}
              aria-label="Trimite"
              className="shrink-0 self-end rounded-lg bg-brand-navy px-3 py-2 text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Cat timp doar discuta, butonul de comanda ramane la vedere. */}
        {mode === "chat" && messages.length > 0 && (
          <button
            type="button"
            onClick={startOrder}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-red/90"
          >
            <ShoppingCart className="h-4 w-4" />
            Comandă acum
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-100 py-1 last:border-0">
      <span className="w-24 shrink-0 text-slate-500">{k}</span>
      <span className="min-w-0 flex-1 break-words font-medium text-slate-800">{v}</span>
    </div>
  );
}
