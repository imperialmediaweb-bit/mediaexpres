"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  CreditCard,
  Link2,
  Search,
  Newspaper,
  Facebook,
  FileText,
  ShieldCheck,
  Trophy,
  Clock,
  Loader2,
  MessageCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";
import { SITE } from "@/data/site";

const PACHET = "promo-50-cazino-pro";
const PRET = 2000;

type Cifre = {
  publicatii: number;
  articolePeZi: number;
  paginiFacebook: number;
  urmaritoriFacebook: number;
  botosaniAfisari: number;
};

/* ───────── numărătoare animată ───────── */
function Numar({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const vazut = useInView(ref, { once: true, margin: "-60px" });
  const mv = useMotionValue(0);
  const sp = useSpring(mv, { duration: 1800, bounce: 0 });
  const txt = useTransform(sp, (v) =>
    v.toLocaleString("ro-RO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
  );
  useEffect(() => {
    if (vazut) mv.set(to);
  }, [vazut, mv, to]);
  return <motion.span ref={ref}>{txt}</motion.span>;
}

/* ───────── fise și cărți care plutesc ───────── */
function Fisa({ x, y, d, culoare, size = 64 }: { x: string; y: string; d: number; culoare: string; size?: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute hidden rounded-full md:block"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 50%, ${culoare} 0 38%, #fff 38% 44%, ${culoare} 44% 100%)`,
        boxShadow: `0 0 0 4px ${culoare}55, 0 18px 40px -10px #000c`,
        border: "4px dashed #ffffffcc",
      }}
      initial={{ opacity: 0, y: 40, rotate: 0 }}
      animate={{ opacity: 1, y: [0, -18, 0], rotate: [0, 180, 360] }}
      transition={{ delay: d, duration: 6 + d * 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function Carte({ x, y, d, simbol, rosu }: { x: string; y: string; d: number; simbol: string; rosu?: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute hidden h-24 w-16 flex-col justify-between rounded-lg bg-white p-1.5 font-bold shadow-2xl md:flex"
      style={{ left: x, top: y, color: rosu ? "#d6203a" : "#111" }}
      initial={{ opacity: 0, rotate: -20 }}
      animate={{ opacity: 1, rotate: [-12, 8, -12], y: [0, -14, 0] }}
      transition={{ delay: d, duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="text-sm leading-none">A{simbol}</span>
      <span className="self-center text-3xl leading-none">{simbol}</span>
      <span className="rotate-180 text-sm leading-none">A{simbol}</span>
    </motion.div>
  );
}

/* ───────── ruleta din hero ───────── */
function Ruleta() {
  const sectoare = 18;
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className="h-full w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
      animate={{ rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      aria-hidden
    >
      <circle cx="100" cy="100" r="98" fill="#3b2a12" stroke="#e8c15a" strokeWidth="3" />
      {Array.from({ length: sectoare }).map((_, i) => {
        const a0 = (i / sectoare) * Math.PI * 2;
        const a1 = ((i + 1) / sectoare) * Math.PI * 2;
        const r = 86;
        const p = `M100,100 L${100 + r * Math.cos(a0)},${100 + r * Math.sin(a0)} A${r},${r} 0 0,1 ${100 + r * Math.cos(a1)},${100 + r * Math.sin(a1)} Z`;
        return <path key={i} d={p} fill={i === 0 ? "#0f9d58" : i % 2 ? "#c1121f" : "#111"} stroke="#e8c15a" strokeWidth="0.6" />;
      })}
      <circle cx="100" cy="100" r="46" fill="#5a3d16" stroke="#e8c15a" strokeWidth="2" />
      <circle cx="100" cy="100" r="30" fill="#e8c15a" />
      <circle cx="100" cy="100" r="10" fill="#5a3d16" />
      <circle cx="100" cy="22" r="5" fill="#fff" />
    </motion.svg>
  );
}

/* ───────── butoanele de comandă ───────── */
function Comanda({ mare }: { mare?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  const urmarire = (cum: string) => {
    trackPixelEvent("InitiateCheckout", { content_name: `Oferta cazino — ${cum}`, content_category: "promo", value: PRET, currency: "RON" });
    trackGaEvent("begin_checkout", { value: PRET, currency: "RON", payment_type: cum });
  };

  async function cardDirect() {
    if (loading) return;
    urmarire("card direct");
    setLoading(true);
    setEroare(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: PACHET, mode: "package" }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok || !body.url) throw new Error(body.error || "Eroare");
      window.location.href = body.url;
    } catch (e: unknown) {
      setEroare(e instanceof Error ? e.message : "Eroare necunoscută");
      setLoading(false);
    }
  }

  const wa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    `Bună ziua! Aș vrea oferta iGaming: articol în 50 de ziare (${PRET.toLocaleString("ro")} lei). Cum procedăm?`
  )}`;

  return (
    <div className={`flex flex-col items-center gap-3 ${mare ? "mt-8" : "mt-6"}`}>
      <motion.a
        href={`/comanda/noua?pachet=${PACHET}`}
        onClick={() => urmarire("formular")}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#f7d774] via-[#e8b23a] to-[#f7d774] px-8 py-4 text-lg font-extrabold text-[#2a1a00] shadow-[0_10px_40px_-5px_rgba(232,178,58,0.7)] sm:w-auto"
      >
        <span className="absolute inset-0 -translate-x-full animate-[stralucire_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <Trophy className="relative h-5 w-5" />
        <span className="relative">Comandă acum — {PRET.toLocaleString("ro")} lei</span>
      </motion.a>
      <button
        type="button"
        onClick={cardDirect}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60 sm:w-auto"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
        Plătesc acum cu cardul, trimit articolul după
      </button>
      <a
        href={wa}
        target="_blank"
        rel="noopener"
        onClick={() => trackPixelEvent("Contact", { content_name: "WhatsApp din oferta cazino" })}
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
      >
        <MessageCircle className="h-4 w-4" /> Sau scrie-ne pe WhatsApp
      </a>
      {eroare && <p className="text-sm text-red-300">{eroare}</p>}
    </div>
  );
}

/* ───────── păcănele: 3 role care se opresc pe 50 · 150 · 2.000 ───────── */
const SIMBOLURI = ["🍒", "💎", "7", "🔔", "⭐", "🍋", "BAR"];
function Rola({ final, intarziere }: { final: string; intarziere: number }) {
  const [rulez, setRulez] = useState(true);
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const vazut = useInView(ref, { once: true });
  useEffect(() => {
    if (!vazut) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % SIMBOLURI.length), 70);
    const s = window.setTimeout(() => {
      window.clearInterval(t);
      setRulez(false);
    }, 1400 + intarziere);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(s);
    };
  }, [vazut, intarziere]);
  return (
    <div ref={ref} className="flex h-24 w-[4.5rem] items-center justify-center overflow-hidden rounded-xl border-2 border-[#e8b23a]/60 bg-gradient-to-b from-white to-[#f3e7c8] shadow-inner md:h-36 md:w-32">
      <motion.span
        key={rulez ? idx : "final"}
        initial={{ y: rulez ? -30 : -60, opacity: rulez ? 0.6 : 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={rulez ? { duration: 0.06 } : { type: "spring", stiffness: 300, damping: 12 }}
        className={`font-serif font-extrabold ${rulez ? "text-4xl text-[#c1121f]" : "text-6xl text-[#d6203a] drop-shadow-[0_2px_0_#7a0f1c] md:text-7xl"}`}
      >
        {rulez ? SIMBOLURI[idx] : final}
      </motion.span>
    </div>
  );
}

function Pacanele() {
  const ref = useRef<HTMLDivElement>(null);
  const vazut = useInView(ref, { once: true });
  const [castig, setCastig] = useState(false);
  useEffect(() => {
    if (!vazut) return;
    const t = window.setTimeout(() => setCastig(true), 1400 + 3 * 450 + 300);
    return () => window.clearTimeout(t);
  }, [vazut]);
  return (
    <div ref={ref} className="relative mx-auto w-fit">
      <motion.div
        animate={castig ? { boxShadow: ["0 0 40px -10px rgba(232,178,58,0.8)", "0 0 90px 10px rgba(255,215,90,1)", "0 0 40px -10px rgba(232,178,58,0.8)"] } : {}}
        transition={{ duration: 1.2, repeat: castig ? Infinity : 0 }}
        className="relative rounded-[28px] border-4 border-[#e8b23a] bg-gradient-to-b from-[#7a0f1c] via-[#4a0812] to-[#2a050b] p-4 md:p-7"
      >
        <div className="mb-4 flex justify-center gap-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <motion.span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-[#f7d774]"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: castig ? 0.4 : 1, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </div>
        <div className="flex gap-1.5 md:gap-3">
          {[0, 1, 2, 3].map((k) => (
            <Rola key={k} final="7" intarziere={k * 450} />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: 20 }}
          animate={castig ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 260, damping: 12 }}
          className="mt-5 rounded-2xl bg-gradient-to-r from-[#f7d774] via-[#fff1b8] to-[#f7d774] px-4 py-3 text-center text-[#2a1a00]"
        >
          <p className="font-serif text-2xl font-extrabold tracking-wide md:text-3xl">7777 · JACKPOT!</p>
          <p className="mt-1 text-sm font-bold md:text-base">50 de ziare · 150 de linkuri · doar 2.000 lei</p>
        </motion.div>
      </motion.div>
      {castig && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-4 w-4 rounded-full"
              style={{ background: "radial-gradient(circle at 35% 35%, #fff6c8, #f7d774 40%, #b8860b 100%)" }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{
                x: Math.cos((i / 18) * Math.PI * 2) * (160 + (i % 3) * 40),
                y: Math.sin((i / 18) * Math.PI * 2) * (120 + (i % 3) * 30),
                opacity: 0,
                scale: 1.2,
              }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── monede care cad ───────── */
function Monede() {
  const monede = Array.from({ length: 14 }).map((_, i) => ({
    left: `${(i * 37) % 100}%`,
    d: (i % 7) * 1.1,
    dur: 6 + (i % 5),
    size: 14 + (i % 4) * 6,
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {monede.map((m, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: m.left,
            top: -40,
            width: m.size,
            height: m.size,
            background: "radial-gradient(circle at 35% 35%, #fff6c8, #f7d774 40%, #b8860b 100%)",
            boxShadow: "0 0 12px rgba(247,215,116,0.6)",
          }}
          animate={{ y: ["0vh", "120vh"], rotateY: [0, 720], opacity: [0, 1, 1, 0] }}
          transition={{ duration: m.dur, repeat: Infinity, delay: m.d, ease: "linear" }}
        />
      ))}
    </div>
  );
}

const DOVEZI = [
  { ziar: "Legio News", titlu: "La Napoleon Games, cel mai nou casino online din România…", url: "https://legionews.ro/monden/la-napoleon-games-cel-mai-nou-casino-online-din-romania-victoria-e-de-partea-ta" },
  { ziar: "Acu News", titlu: "De ce tot mai multe celebrități aleg platforma Don.ro…", url: "https://acunews.ro/monden/p-de-ce-tot-mai-multe-celebritati-aleg-sa-si-petreaca-timpul-liber-pe-platforma-don-ro-jocuri-casino" },
  { ziar: "Metro News", titlu: "Cele mai populare jocuri de live casino în 2026", url: "https://metronews.ro/monden/p-cele-mai-populare-jocuri-de-live-casino-in-2026" },
];

const INCLUS = [
  { icon: Newspaper, t: "50 de ziare online", d: "Articolul tău, în variantă unică pe fiecare ziar. Rămâne online permanent." },
  { icon: Link2, t: "3 linkuri dofollow pe articol", d: "Cu ancorele alese de tine, diferite pe fiecare ziar. 150 de linkuri spre site-ul tău." },
  { icon: Search, t: "Indexare grăbită în Google", d: "Trimitem toate linkurile la indexare și le retrimitem pe cele care întârzie." },
  { icon: Star, t: "7 zile pe prima pagină", d: "Articolul stă o săptămână pe prima pagină a fiecărui ziar." },
  { icon: Facebook, t: "Pe paginile de Facebook", d: "Postat pe paginile de Facebook ale ziarelor din rețea." },
  { icon: FileText, t: "Raport cu toate publicările", d: "Link de raport, live, cu fiecare articol — descărcabil PDF și Excel." },
];

const PASI = [
  { n: "1", t: "Comanzi", d: "Completezi formularul și plătești cu cardul sau prin OP. Factura vine automat." },
  { n: "2", t: "Trimiți articolul", d: "Textul, linkurile cu ancorele și 1–3 poze. N-ai articol? Îl scriem noi și ți-l arătăm." },
  { n: "3", t: "Publicăm eșalonat", d: "La 1, 3 sau 12 ore între ziare, sau pe 2 săptămâni — cum vrei." },
  { n: "4", t: "Primești raportul", d: "Toate cele 50 de linkuri, live, cu data și ora fiecărei publicări." },
];

const FAQ = [
  { q: "Ce operatori acceptați?", a: "Doar operatori licențiați ONJN. Ne trimiteți numărul licenței la comandă, iar articolul conține mențiunile obligatorii (18+, joc responsabil)." },
  { q: "Linkurile sunt dofollow?", a: "Da. Linkuri dofollow, permanente, cu ancorele alese de voi — până la 3 pe fiecare articol, pe fiecare din cele 50 de ziare." },
  { q: "Faceți și reclamă plătită pe Facebook?", a: "Nu, pentru iGaming Meta nu permite reclame fără autorizare specială. Articolul se postează însă pe paginile de Facebook ale ziarelor." },
  { q: "Pot plăti prin OP, cu factură?", a: "Da. Alegeți plata prin OP la comandă și primiți factura automat. Publicăm după confirmarea plății." },
  { q: "În cât timp se publică?", a: "Începem în 12 ore lucrătoare de la primirea articolului. Eșalonarea o alegeți voi." },
];

type Ziar = { nume: string; url: string; tip: string };

export function PaginaCazino({ ziare, cifre }: { ziare: Ziar[]; cifre: Cifre }) {
  const bandaZiare = [...ziare, ...ziare];
  return (
    <div className="relative overflow-hidden bg-[#07060d] pb-20 text-white md:pb-0">
      <style>{`@keyframes stralucire{0%{transform:translateX(-120%)}60%,100%{transform:translateX(120%)}}
@keyframes banda{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes roteste{to{transform:rotate(360deg)}}`}</style>

      {/* fundal: lumini */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#c1121f]/30 blur-[120px]" />
        <div className="absolute -right-40 top-40 h-[520px] w-[520px] rounded-full bg-[#7b2ff7]/25 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-[#e8b23a]/15 blur-[120px]" />
      </div>

      <Monede />
      {/* ───── HERO ───── */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-16 md:grid-cols-2 md:pt-24">
        <Fisa x="6%" y="10%" d={0} culoare="#c1121f" />
        <Fisa x="44%" y="78%" d={0.6} culoare="#111" size={52} />
        <Fisa x="88%" y="6%" d={1.2} culoare="#0f9d58" size={48} />
        <Carte x="40%" y="8%" d={0.3} simbol="♠" />
        <Carte x="2%" y="70%" d={0.9} simbol="♥" rosu />

        <div className="relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-4 py-1.5 text-sm font-semibold text-[#f7d774]"
          >
            <Sparkles className="h-4 w-4" /> Ofertă dedicată iGaming · operatori licențiați ONJN
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="mt-5 font-serif text-4xl font-extrabold leading-tight md:text-6xl"
          >
            Cazinoul tău în{" "}
            <span className="bg-gradient-to-r from-[#f7d774] via-[#e8b23a] to-[#ff6b6b] bg-clip-text text-transparent">
              50 de ziare
            </span>{" "}
            online
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 max-w-lg text-lg text-white/75"
          >
            Un articol unic pe fiecare ziar, <strong className="text-white">3 linkuri dofollow</strong> cu ancorele tale,
            indexare grăbită și o săptămână pe prima pagină. Într-o rețea care publică{" "}
            <strong className="text-white">peste {cifre.articolePeZi} de articole pe zi</strong>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45, type: "spring" }}
            className="relative mt-8 inline-flex items-end gap-4 overflow-hidden rounded-2xl px-6 py-4"
          >
            <span aria-hidden className="absolute inset-[-150%] animate-[roteste_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,#f7d774_60deg,#ff6b6b_120deg,transparent_180deg,transparent_360deg)]" />
            <span aria-hidden className="absolute inset-[2px] rounded-[14px] bg-[#120d1f]" />
            <div className="relative">
              <p className="whitespace-nowrap text-xs uppercase tracking-widest text-white/50">Preț normal</p>
              <p className="whitespace-nowrap font-serif text-xl font-bold text-white/40 line-through md:text-2xl">4.000 lei</p>
            </div>
            <div className="relative">
              <p className="text-xs uppercase tracking-widest text-[#f7d774]">Acum</p>
              <p className="whitespace-nowrap font-serif text-4xl font-extrabold text-[#f7d774] md:text-6xl">2.000 lei</p>
            </div>
          </motion.div>
          <p className="mt-2 text-sm text-white/55">
            = {Math.round(PRET / 150)} lei pe link · 150 de linkuri dofollow, permanente
          </p>
          <Comanda />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: "spring" }}
          className="relative mx-auto aspect-square w-full max-w-md"
        >
          <div className="absolute inset-6 rounded-full bg-[#e8b23a]/20 blur-3xl" />
          <Ruleta />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -bottom-4 left-1/2 w-[85%] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0d0b18]/90 p-4 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="text-sm">
                <p className="font-bold">Publicare începută în 12 ore lucrătoare</p>
                <p className="text-white/60">sau îți dăm banii înapoi</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ───── banda cu ziare ───── */}
      <div className="relative mt-10 border-y border-white/10 bg-white/[0.03] py-4">
        <div className="flex w-max animate-[banda_60s_linear_infinite] gap-8 whitespace-nowrap">
          {bandaZiare.map((z, i) => (
            <a key={i} href={z.url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-[#f7d774]">
              <Newspaper className="h-4 w-4 text-[#e8b23a]" /> {z.nume}
            </a>
          ))}
        </div>
      </div>

      {/* ───── jackpot ───── */}
      <section className="relative mx-auto max-w-5xl px-4 pt-20 text-center">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="font-serif text-3xl font-extrabold md:text-5xl"
        >
          <span className="bg-gradient-to-r from-[#f7d774] to-[#ff6b6b] bg-clip-text text-transparent">JACKPOT</span> pentru SEO
        </motion.h2>
        <p className="mx-auto mt-3 max-w-xl text-white/70">Patru de 7 la rând: 50 de ziare, 150 de linkuri dofollow, 2.000 de lei.</p>
        <div className="mt-10">
          <Pacanele />
        </div>
      </section>

      {/* ───── comparatie ───── */}
      <section className="relative mx-auto max-w-4xl px-4 pt-20">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-white/50">De obicei</p>
            <p className="mt-3 font-serif text-4xl font-bold text-white/40 line-through">300–1.000 lei</p>
            <p className="mt-1 text-white/60">pentru UN link dintr-un site de știri</p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border-2 border-[#e8b23a] bg-gradient-to-br from-[#e8b23a]/20 to-[#c1121f]/10 p-6 shadow-[0_0_40px_-10px_rgba(232,178,58,0.7)]"
          >
            <p className="text-sm font-bold uppercase tracking-widest text-[#f7d774]">La noi</p>
            <p className="mt-3 font-serif text-5xl font-extrabold text-[#f7d774]">13 lei</p>
            <p className="mt-1 text-white/80">pe link · 150 de linkuri dofollow, permanente</p>
          </motion.div>
        </div>
      </section>

      {/* ───── dovezi ───── */}
      <section className="relative mx-auto max-w-5xl px-4 pt-20">
        <h2 className="text-center font-serif text-3xl font-bold md:text-4xl">Operatorii iGaming publică deja la noi</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/65">Articole reale, live acum în rețea. Dă clic și vezi.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {DOVEZI.map((d, i) => (
            <motion.a
              key={d.url}
              href={d.url}
              target="_blank"
              rel="noopener"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -6, rotate: -0.5 }}
              className="group block rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e8b23a]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live · {d.ziar}
              </div>
              <p className="mt-3 font-semibold leading-snug group-hover:text-[#f7d774]">{d.titlu}</p>
              <p className="mt-3 text-sm text-white/50">Vezi articolul →</p>
            </motion.a>
          ))}
        </div>
      </section>

      {/* ───── cifre ───── */}
      <section className="relative mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center font-serif text-3xl font-bold md:text-4xl">O rețea de presă, nu un blog</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/65">
          Ziare locale în fiecare județ, plus ziare naționale, cu știri publicate zilnic și cititori reali.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { v: 100000, s: "+", l: "vizitatori unici pe lună", sub: "Google Analytics, toată rețeaua" },
            { v: 2.7, s: " mil.", l: "afișări pe lună", sub: "doar pagina de Facebook Botoșani Expres", dec: 1 },
            { v: cifre.publicatii, s: "", l: "ziare online", sub: "41 județene + 9 naționale" },
            { v: cifre.articolePeZi, s: "+", l: "articole pe zi", sub: "rețea activă, conținut proaspăt" },
          ].map((c, i) => (
            <motion.div
              key={c.l}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-6 text-center"
            >
              <p className="font-serif text-4xl font-extrabold text-[#f7d774]">
                <Numar to={c.v} suffix={c.s} decimals={c.dec ?? 0} />
              </p>
              <p className="mt-2 font-semibold">{c.l}</p>
              <p className="mt-1 text-xs text-white/50">{c.sub}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-white/50">
          {cifre.paginiFacebook} de pagini de Facebook, peste {cifre.urmaritoriFacebook.toLocaleString("ro-RO")} de urmăritori.
        </p>
      </section>

      {/* ───── ce primești ───── */}
      <section className="relative mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-serif text-3xl font-bold md:text-4xl">
          Totul inclus, la <span className="text-[#f7d774]">2.000 lei</span>
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {INCLUS.map((x, i) => (
            <motion.div
              key={x.t}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.12 }}
              whileHover={{ y: -6 }}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#e8b23a]/50 hover:bg-white/[0.07]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#e8b23a] to-[#c1121f] shadow-lg">
                <x.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{x.t}</h3>
              <p className="mt-2 text-sm text-white/65">{x.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───── eșalonare + rescriere ───── */}
      <section className="relative mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
          >
            <Clock className="h-8 w-8 text-[#f7d774]" />
            <h3 className="mt-3 text-xl font-bold">Publicare eșalonată, cum vrei tu</h3>
            <p className="mt-2 text-sm text-white/65">Alegi ritmul în care apar articolele pe cele 50 de ziare:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["la 1 oră", "la 3 ore", "la 12 ore", "pe 2 săptămâni", "cât timp vrei"].map((x) => (
                <span key={x} className="rounded-full border border-[#e8b23a]/50 bg-[#e8b23a]/10 px-3 py-1.5 text-sm font-semibold text-[#f7d774]">
                  {x}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
          >
            <Sparkles className="h-8 w-8 text-[#f7d774]" />
            <h3 className="mt-3 text-xl font-bold">Articol rescris pe fiecare ziar</h3>
            <p className="mt-2 text-sm text-white/65">
              Fiecare din cele 50 de ziare primește o variantă unică a articolului, nu același text copiat. Linkurile tale rămân exact unde le-ai pus, cu ancorele alese.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-5 rounded-2xl border-2 border-[#e8b23a]/50 bg-gradient-to-br from-[#e8b23a]/10 to-transparent p-6"
        >
          <h3 className="text-xl font-bold">Ce ne trimiți ca să începem</h3>
          <ul className="mt-4 grid gap-3 text-sm text-white/80 md:grid-cols-2">
            {[
              "Articolul (Word, PDF sau text) — sau doar site-ul și câteva informații, iar noi îl scriem și ți-l arătăm înainte",
              "Linkurile spre site-ul tău și ancorele dorite (până la 3 pe articol)",
              "1–3 poze, dintre care una principală",
              "Ritmul de publicare: 1 oră, 3 ore, 12 ore, 2 săptămâni sau cât vrei",
              "Numărul licenței ONJN",
              "Datele firmei (CUI) pentru factură",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* ───── pași ───── */}
      <section className="relative mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center font-serif text-3xl font-bold md:text-4xl">Cum funcționează</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {PASI.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e8b23a] bg-[#e8b23a]/10 font-serif text-2xl font-bold text-[#f7d774]">
                {p.n}
              </div>
              <h3 className="mt-4 font-bold">{p.t}</h3>
              <p className="mt-2 text-sm text-white/60">{p.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───── toate ziarele, cu linkuri ───── */}
      <section id="ziare" className="relative mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-serif text-3xl font-bold md:text-4xl">Verifică singur fiecare ziar</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/65">
          Toate cele 50 de ziare sunt online acum, cu știri publicate zilnic. Deschide oricare și vezi cu ochii tăi.
        </p>
        <div className="mt-6 text-center">
          <a
            href="https://botosaniexpres.ro/stare"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/20"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Starea rețelei, live: articole publicate azi
          </a>
        </div>
        {(["national", "local"] as const).map((tip) => (
          <div key={tip} className="mt-10">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#e8b23a]">
              {tip === "national" ? "Ziare naționale" : "Ziare județene"}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {ziare
                .filter((z) => (tip === "national" ? z.tip !== "local" : z.tip === "local"))
                .map((z) => (
                  <a
                    key={z.url}
                    href={z.url}
                    target="_blank"
                    rel="noopener"
                    className="group rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-[#e8b23a]/60 hover:bg-white/[0.07]"
                  >
                    <span className="block text-sm font-semibold text-white group-hover:text-[#f7d774]">{z.nume}</span>
                    <span className="block truncate text-xs text-white/45">{z.url.replace(/^https?:\/\//, "")}</span>
                  </a>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* ───── FAQ ───── */}
      <section className="relative mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center font-serif text-3xl font-bold">Întrebări frecvente</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <summary className="cursor-pointer list-none font-semibold">
                <span className="mr-2 text-[#e8b23a]">+</span>
                {f.q}
              </summary>
              <p className="mt-3 text-sm text-white/65">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───── final ───── */}
      <section className="relative mx-auto max-w-4xl px-4 pb-24 pt-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-[#e8b23a]/30 bg-gradient-to-br from-[#1a1030] via-[#120b1f] to-[#2a0c12] p-10"
        >
          <Clock className="mx-auto h-10 w-10 text-[#f7d774]" />
          <h2 className="mt-4 font-serif text-3xl font-extrabold md:text-4xl">150 de linkuri dofollow din presă, la 2.000 lei</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Un articol, 50 de ziare, 3 linkuri pe fiecare. Începem în 12 ore lucrătoare de la primirea articolului.
          </p>
          <Comanda mare />
          <p className="mt-6 text-xs text-white/40">
            Doar pentru operatori licențiați ONJN. Jocurile de noroc sunt interzise minorilor și pot crea dependență. 18+.
          </p>
        </motion.div>
      </section>
      {/* bara fixă de comandă pe telefon */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8b23a]/40 bg-[#0d0a17]/95 py-3 pl-3 pr-20 backdrop-blur md:hidden">
        <a
          href={`/comanda/noua?pachet=${PACHET}`}
          onClick={() => trackPixelEvent("InitiateCheckout", { content_name: "Oferta cazino — bara jos", value: PRET, currency: "RON" })}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f7d774] via-[#e8b23a] to-[#f7d774] py-3.5 font-extrabold text-[#2a1a00]"
        >
          <Trophy className="h-5 w-5" /> Comandă — 2.000 lei
        </a>
      </div>
    </div>
  );
}
