"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2, FileSpreadsheet, Mail } from "lucide-react";

/**
 * Toate actiunile unei comenzi, pe acelasi ecran cu materialele ei.
 * Inainte, adminul trebuia sa sara intre Materiale (ca sa vada articolul),
 * Raport publicare (ca sa trimita linkurile) si Trimite email (ca sa scrie
 * clientului) — copiind manual adresa si titlul intre ele.
 */
export function OrderActions({
  id,
  email,
  clientName,
  articleTitle,
  isPublished,
  awaitingPayment,
}: {
  id: string;
  email: string;
  clientName: string;
  articleTitle: string;
  isPublished: boolean;
  awaitingPayment: boolean;
}) {
  const router = useRouter();
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState<null | "publish" | "confirm" | "report" | "mail">(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [mailSubject, setMailSubject] = useState(`Comanda ta — ${articleTitle}`.slice(0, 120));
  const [mailBody, setMailBody] = useState("");

  // Numaram doar liniile care chiar sunt linkuri, ca sa nu promitem clientului
  // un numar gresit de publicatii cand lista contine si titluri.
  const linkCount = links
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\/\S+$/i.test(l)).length;

  async function patch(action: "publish" | "confirm_payment", busyKey: "publish" | "confirm") {
    setBusy(busyKey);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/materiale/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Eroare" });
    } finally {
      setBusy(null);
    }
  }
  const markPublished = () => patch("publish", "publish");
  const confirmPayment = () => patch("confirm_payment", "confirm");

  async function sendReport() {
    if (linkCount === 0) {
      setMsg({ kind: "err", text: "Lipesc linkurile articolelor publicate (unul pe rând)." });
      return;
    }
    setBusy("report");
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("clientName", clientName);
      fd.append("articleTitle", articleTitle);
      fd.append("links", links);
      const r = await fetch("/api/admin/raport", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      setMsg({
        kind: "ok",
        text: `Raport trimis către ${email} — ${linkCount} linkuri, cu Excelul atașat. Apare și în contul clientului.`,
      });
      setLinks("");
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Eroare" });
    } finally {
      setBusy(null);
    }
  }

  async function sendMail() {
    if (mailBody.trim().length < 10) {
      setMsg({ kind: "err", text: "Scrie mesajul (minim 10 caractere)." });
      return;
    }
    setBusy("mail");
    setMsg(null);
    try {
      const r = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [email],
          subject: mailSubject.trim(),
          body: mailBody.trim(),
          template: "personal",
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      setMsg({ kind: "ok", text: `Email trimis către ${email}.` });
      setMailBody("");
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Eroare" });
    } finally {
      setBusy(null);
    }
  }

  const box = "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <div className="space-y-5">
      {msg && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* 1. Publicare */}
      <div className={box}>
        <h2 className="font-serif text-lg font-bold text-brand-navy">1. Publicare</h2>
        {isPublished ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Marcată ca publicată.
          </p>
        ) : awaitingPayment ? (
          <>
            {/* Comanda OP neincasata: publicarea e blocata pana confirmi banii.
                Fara asta, 50 de articole permanente puteau pleca pe o comanda
                neplatita, dintr-un singur click grabit. */}
            <p className="mt-1 text-sm text-slate-600">
              Clientul plătește <strong>după ce îi trimiți factura</strong> — emite-o în
              StartCo pe datele din alertă. Când vezi banii în extras, confirmă aici.
            </p>
            <button
              type="button"
              onClick={confirmPayment}
              disabled={busy !== null}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmă plata — am văzut banii în extras
            </button>
            <button
              type="button"
              disabled
              title="Se deblochează după confirmarea plății"
              className="mt-3 ml-2 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marchează publicat
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">
              După ce ai publicat articolul în rețea, marchează comanda aici.
            </p>
            <button
              type="button"
              onClick={markPublished}
              disabled={busy !== null}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-60"
            >
              {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Marchează publicat
            </button>
          </>
        )}
      </div>

      {/* 2. Raportul */}
      <div className={box}>
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          2. Trimite raportul cu linkurile
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Lipește linkurile articolelor publicate — unul pe rând. Poți lipi și perechi
          titlu + link, exact cum le dă campania; titlurile rămân în raport.
        </p>
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          rows={8}
          placeholder={"Titlul articolului\nhttps://clujexpres.ro/...\n\nAlt titlu\nhttps://iasiexpres.ro/..."}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-navy focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={sendReport}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-60"
          >
            {busy === "report" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Trimite raportul către {email}
          </button>
          <span className="text-xs text-slate-500">
            {linkCount > 0 ? `${linkCount} linkuri detectate` : "niciun link încă"} · Excelul se
            generează și se atașează automat
          </span>
        </div>
      </div>

      {/* 3. Email liber */}
      <div className={box}>
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          3. Scrie-i clientului
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Pleacă de pe adresa site-ului, ca mesaj personal. Pentru factură ca atașament,
          folosește Emailuri → Răspunde clientului.
        </p>
        <input
          value={mailSubject}
          onChange={(e) => setMailSubject(e.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
        <textarea
          value={mailBody}
          onChange={(e) => setMailBody(e.target.value)}
          rows={6}
          placeholder="Bună ziua,&#10;&#10;..."
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        />
        <button
          type="button"
          onClick={sendMail}
          disabled={busy !== null}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-brand-navy hover:border-brand-navy disabled:opacity-60"
        >
          {busy === "mail" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Trimite emailul
        </button>
      </div>
    </div>
  );
}
