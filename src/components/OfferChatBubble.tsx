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
  describeOrder,
  orderLabel,
  INTENT_LABEL,
  EMAIL_RE,
  type ChatOrder,
  type ReturnIntent,
} from "@/components/chat/return-flows";
import { SITE } from "@/data/site";
import {
  STEPS,
  EMPTY_ORDER,
  nextStepIndex,
  buildSubmission,
  priceOf,
  packageIdOf,
  type OrderData,
  type Step,
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

// "return" = clientul care a comandat deja si revine: dovada, articol, stare.
type Mode = "chat" | "order" | "sent" | "return";
type ReturnStep = "email" | "pick" | "proof" | "title" | "body" | "images" | "variant";

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

  // Drumurile clientului care revine. Pe WhatsApp, proprietarul facea asta cu
  // mana: cauta comanda dupa om, punea dovada sau articolul pe ea, raspundea
  // la „ce e cu comanda mea?". Aici chatul face acelasi lucru, pe email.
  const [intent, setIntent] = useState<ReturnIntent | null>(null);
  const [rstep, setRstep] = useState<ReturnStep>("email");
  const [remail, setRemail] = useState("");
  const [orders, setOrders] = useState<ChatOrder[]>([]);
  const [picked, setPicked] = useState<ChatOrder | null>(null);
  const [rtitle, setRtitle] = useState("");
  const [rbody, setRbody] = useState("");
  // Eticheta de actiune intoarsa de consultant dupa un raspuns liber: pune
  // butonul potrivit sub raspuns (comanda / dovada / articol / stare).
  const [lastAction, setLastAction] = useState<string | null>(null);

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
    setLastAction(null);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const dataRes = await res.json();
      if (!res.ok || !dataRes.ok) throw new Error(dataRes.error || "Eroare server");
      setMessages([...history, { role: "assistant", content: dataRes.answer }]);
      if (typeof dataRes.action === "string" && dataRes.action !== "niciuna") setLastAction(dataRes.action);
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
    if (mode === "return") return answerReturnChoice(value, label);
    const s = STEPS[step];
    echo(label);
    const d = { ...data };
    if (s.id === "casino") d.isCasino = value === "da";
    if (s.id === "method") d.method = value === "card" ? "card" : "op";
    if (s.id === "hasArticle") d.hasArticle = value === "am";
    if (s.id === "declaration") {
      if (value !== "da") {
        // Nu-l ducem mai departe si nu-i luam banii. Un „nu sunt sigur" aici
        // costa un email; acelasi „nu" descoperit dupa incasare costa o
        // retragere de pe 50 de site-uri si o restituire care nu se mai face.
        setData({ ...d, contentDeclaration: false });
        say(
          "Atunci hai să ne uităm pe text înainte de orice plată. Trimite-l pe " +
            `${SITE.email} sau pe WhatsApp la ${SITE.phone} și îți spunem în aceeași zi dacă îl putem publica. Nu-ți luăm banii până nu știm sigur.`,
        );
        return;
      }
      d.contentDeclaration = true;
    }
    setData(d);
    // La card, toti pasii de dupa email sunt marcati `skip` — Stripe cere el
    // datele de facturare, iar articolul se trimite dupa confirmarea platii,
    // ca la orice comanda cu cardul. Deci drumul se scurteaza singur.
    goToNext(step, d);
  }

  function submitText(raw: string) {
    if (mode === "return") return submitReturnText(raw);
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
    if (mode === "return") return skipReturn();
    echo("Sar peste");
    setInput("");
    goToNext(step, data);
  }

  async function upload(list: FileList | null, kind: "images" | "proof") {
    if (!list?.length) return;
    if (mode === "return") return uploadReturn(list, kind);
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
        "Am primit comanda ta. Îți trimitem factura fiscală pe email în aceeași zi lucrătoare și plătești pe baza ei. Imediat ce vedem încasarea în extras, publicăm în maximum 12 ore lucrătoare și primești pe email raportul cu toate linkurile.",
      );
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Eroare la trimitere");
    } finally {
      setLoading(false);
    }
  }

  // ——— Clientul care revine: dovada / articol / stare ———
  function startReturn(i: ReturnIntent) {
    setMode("return");
    setIntent(i);
    setStepError(null);
    setLastAction(null);
    setPicked(null);
    setOrders([]);
    echo(INTENT_LABEL[i]);
    // Emailul stiut din comanda facuta in aceeasi conversatie se refoloseste.
    const known = (data.email || remail).trim();
    if (EMAIL_RE.test(known)) {
      setRemail(known);
      void lookupOrders(known, i);
    } else {
      setRstep("email");
      say("Pe ce adresă de email ai făcut comanda?");
    }
  }

  async function lookupOrders(email: string, i: ReturnIntent) {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/comanda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find", email }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Eroare");
      const found = (j.orders as ChatOrder[]) || [];
      setOrders(found);
      if (!found.length) {
        setRstep("email");
        say(
          `Nu găsesc nicio comandă pe ${email}. Dacă ai comandat cu altă adresă, scrie-o aici. Dacă n-ai comandat încă, apasă „Comandă acum" și te iau pas cu pas.`,
        );
        return;
      }
      if (found.length === 1) {
        pickOrder(found[0], i, false);
      } else {
        setRstep("pick");
        say(`Am găsit ${found.length} comenzi pe adresa asta. Despre care e vorba?`);
      }
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Nu am putut căuta comanda acum.");
      setRstep("email");
    } finally {
      setLoading(false);
    }
  }

  function pickOrder(o: ChatOrder, i: ReturnIntent | null, echoIt: boolean) {
    if (echoIt) echo(orderLabel(o));
    setPicked(o);
    const info = describeOrder(o);
    const kind = i ?? intent;
    if (kind === "stare") {
      say(`${orderLabel(o)}.\n${info.urmatorul}`);
      setMode("chat");
      return;
    }
    if (kind === "dovada") {
      if (o.paymentMethod === "card") {
        say("Comanda asta e plătită cu cardul, prin Stripe — nu e nevoie de dovadă. " + info.urmatorul);
        setMode("chat");
        return;
      }
      if (o.publishedAt) {
        say("Comanda asta e deja publicată. " + info.urmatorul);
        setMode("chat");
        return;
      }
      setRstep("proof");
      say(
        `Comanda: ${orderLabel(o)}.\nÎncarcă dovada plății (captură din aplicația băncii sau PDF-ul ordinului). O pun pe comandă, o citesc și îi spun lui Ionuț să confirme încasarea.`,
      );
      return;
    }
    // articol
    if (o.publishedAt) {
      say("Comanda asta e deja publicată — pentru modificări scrie-ne pe WhatsApp la " + SITE.phone + ".");
      setMode("chat");
      return;
    }
    setRstep("title");
    setRtitle("");
    setRbody("");
    setImages([]);
    say(
      `Comanda: ${orderLabel(o)}.\nTitlul articolului — sau apasă „Sar" dacă vrei să-l propunem noi:`,
    );
  }

  function submitReturnText(raw: string) {
    const v = raw.trim();
    if (rstep === "email") {
      if (!EMAIL_RE.test(v)) {
        setStepError("Adresa nu pare validă. Mai încearcă o dată.");
        return;
      }
      echo(v);
      setInput("");
      setRemail(v);
      void lookupOrders(v, intent ?? "stare");
      return;
    }
    if (rstep === "title") {
      if (v.length < 5) {
        setStepError("Titlul e prea scurt — sau apasă „Sar”.");
        return;
      }
      echo(v);
      setInput("");
      setRtitle(v);
      setRstep("body");
      say("Lipește textul articolului (minimum 100 de caractere). Dacă vrei să-l scriem noi, descrie în câteva propoziții ce vrei comunicat.");
      return;
    }
    if (rstep === "body") {
      if (v.length < 40) {
        setStepError(`Mai scrie câteva cuvinte — minimum 40 de caractere pentru o temă, 100 pentru un articol. Acum are ${v.length}.`);
        return;
      }
      echo(v.length > 160 ? v.slice(0, 160) + "…" : v);
      setInput("");
      setRbody(v);
      setRstep("images");
      say("Ai poze pentru articol? Poți încărca până la 3. Dacă nu ai, publicăm fără.");
      return;
    }
  }

  function skipReturn() {
    if (rstep === "title") {
      echo("Sar — propuneți voi titlul");
      setInput("");
      setRtitle("");
      setRstep("body");
      say("Lipește textul articolului (minimum 100 de caractere). Dacă vrei să-l scriem noi, descrie în câteva propoziții ce vrei comunicat.");
    }
  }

  function returnImagesDone() {
    echo(images.length ? `${images.length} poze` : "Fără poze");
    setRstep("variant");
    say(
      "Ultima alegere: publicăm o variantă rescrisă unic pe fiecare ziar (recomandat — Google vede 50 de articole diferite, nu unul copiat de 50 de ori, și le indexează mult mai bine), sau textul tău identic peste tot (doar dacă e aprobat juridic și nu are voie schimbat)?",
    );
  }

  function answerReturnChoice(value: string, label: string) {
    if (rstep === "pick") {
      const o = orders.find((x) => x.id === value);
      if (o) pickOrder(o, intent, true);
      return;
    }
    if (rstep === "variant") {
      echo(label);
      void submitReturnArticle(value === "unic");
    }
  }

  async function uploadReturn(list: FileList, kind: "images" | "proof") {
    setStepError(null);
    setUploading(true);
    try {
      if (kind === "images") {
        const next = [...images];
        for (const file of Array.from(list)) {
          if (next.length >= 3) break;
          next.push(await signAndUpload(file));
        }
        setImages(next);
        return;
      }
      const up = await signAndUpload(list[0]);
      echo(`📎 ${up.name}`);
      if (!picked) return;
      setLoading(true);
      const res = await fetch("/api/chat/comanda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "proof", email: remail || data.email, orderId: picked.id, proof: up }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Nu am putut salva dovada.");
      const a = j.analiza as { potrivire: string; suma: string | null; data: string | null; beneficiar: string | null } | undefined;
      const citit =
        a && a.potrivire !== "necitit"
          ? ` Pe dovadă văd: ${[a.suma, a.data, a.beneficiar ? "către " + a.beneficiar : null].filter(Boolean).join(", ")}.` +
            (a.potrivire === "da"
              ? " Se potrivește cu comanda."
              : a.potrivire === "partial"
                ? " Ceva nu se potrivește exact — Ionuț verifică în extras."
                : " Nu pare o dovadă de plată — Ionuț se uită oricum.")
          : "";
      say(
        `Am pus dovada pe comanda ta.${citit} Imediat ce încasarea apare în extras, publicăm în maximum 12 ore lucrătoare și primești raportul cu toate linkurile pe email.`,
      );
      setMode("chat");
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Încărcarea a eșuat");
    } finally {
      setUploading(false);
      setLoading(false);
    }
  }

  async function submitReturnArticle(uniquePerSite: boolean) {
    if (!picked || loading) return;
    setLoading(true);
    setStepError(null);
    try {
      const res = await fetch("/api/chat/comanda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "article",
          email: remail || data.email,
          orderId: picked.id,
          title: rtitle,
          body: rbody,
          images,
          uniquePerSite,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Nu am putut salva articolul.");
      say(
        picked.status === "pending_payment" && !picked.hasProof
          ? "Am pus articolul pe comanda ta. Mai rămâne plata: factura e pe emailul tău, iar după ce vedem încasarea publicăm în maximum 12 ore lucrătoare și primești raportul cu linkurile."
          : "Am pus articolul pe comanda ta. Publicăm în maximum 12 ore lucrătoare și primești pe email raportul cu toate linkurile.",
      );
      setMode("chat");
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Trimiterea a eșuat");
    } finally {
      setLoading(false);
    }
  }

  /** Pasul de revenire, in forma pe care o intelege zona de jos a chatului. */
  function returnStep(): Step | null {
    if (mode !== "return") return null;
    switch (rstep) {
      case "email":
        return { id: "r-email", kind: "email", ask: () => "", placeholder: "email@firma.ro" };
      case "pick":
        return {
          id: "r-pick",
          kind: "choice",
          ask: () => "",
          choices: orders.map((o) => ({ label: orderLabel(o), value: o.id })),
        };
      case "proof":
        return { id: "r-proof", kind: "proof", ask: () => "" };
      case "title":
        return { id: "r-title", kind: "text", ask: () => "", placeholder: "Titlul articolului", skippable: true };
      case "body":
        return { id: "r-body", kind: "long", ask: () => "", placeholder: "Textul articolului sau tema..." };
      case "images":
        return { id: "r-images", kind: "images", ask: () => "" };
      case "variant":
        return {
          id: "r-variant",
          kind: "choice",
          ask: () => "",
          choices: [
            { label: "Rescris unic pe fiecare ziar (recomandat)", value: "unic" },
            { label: "Textul meu, identic peste tot", value: "identic" },
          ],
        };
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

  const current = mode === "order" && step < STEPS.length ? STEPS[step] : returnStep();

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
          {mode === "order" ? "comandă în curs" : mode === "return" ? "comandă existentă" : "online"}
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
            {/* Clientul care a comandat deja isi gaseste drumul din prima,
                fara sa scrie pe WhatsApp: dovada, articolul, starea comenzii. */}
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Ai comandat deja?
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(INTENT_LABEL) as ReturnIntent[]).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => startReturn(i)}
                    className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-medium leading-tight text-slate-700 transition hover:border-brand-navy hover:text-brand-navy"
                  >
                    {INTENT_LABEL[i]}
                  </button>
                ))}
              </div>
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

        {/* Consultantul a inteles ce vrea omul (comanda, dovada, articol,
            stare) si pune butonul potrivit chiar sub raspuns. */}
        {mode === "chat" && !loading && lastAction && (
          <button
            type="button"
            onClick={() => (lastAction === "comanda" ? startOrder() : startReturn(lastAction as ReturnIntent))}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-brand-red bg-red-50/60 px-3 py-2 text-sm font-bold text-brand-red transition hover:bg-red-50"
          >
            {lastAction === "comanda" ? "Comandă acum — 500 lei" : INTENT_LABEL[lastAction as ReturnIntent] ?? "Continuă"}
          </button>
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
            <Row k="Declarație" v={data.contentDeclaration ? "conținut fără tratamente medicale — confirmat" : "neconfirmată"} />
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
              onClick={() => (mode === "return" ? returnImagesDone() : goToNext(step, data))}
              disabled={uploading}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {images.length ? "Continuă" : "Fără poze"}
            </button>
          </div>
        ) : current?.kind === "proof" ? (
          <div className="grid gap-2">
            {mode !== "return" && (
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
            )}
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

        {/* Cat timp doar discuta, butonul de comanda ramane la vedere —
            si, mai discret, drumurile clientului care a comandat deja. */}
        {mode === "chat" && messages.length > 0 && (
          <>
            <button
              type="button"
              onClick={startOrder}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-red/90"
            >
              <ShoppingCart className="h-4 w-4" />
              Comandă acum
            </button>
            <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <span>Ai comandat deja?</span>
              {(Object.keys(INTENT_LABEL) as ReturnIntent[]).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => startReturn(i)}
                  className="rounded px-1.5 py-0.5 font-medium text-brand-navy underline-offset-2 hover:underline"
                >
                  {i === "dovada" ? "Dovada plății" : i === "articol" ? "Articolul" : "Starea comenzii"}
                </button>
              ))}
            </div>
          </>
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
