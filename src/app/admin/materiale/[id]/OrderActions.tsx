"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2, FileSpreadsheet, Mail, Paperclip, X } from "lucide-react";

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
  const [invoiceName, setInvoiceName] = useState("");
  const invoiceRef = useRef<HTMLInputElement>(null);
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
      const inv = invoiceRef.current?.files?.[0];
      if (inv) fd.append("invoice", inv);
      const r = await fetch("/api/admin/raport", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      setMsg({
        kind: "ok",
        text: `Raport trimis către ${email} — ${linkCount} linkuri, cu PDF-ul și Excelul generate automat${invoiceRef.current?.files?.[0] ? " și factura atașată" : ""}. Apare și în contul clientului.`,
      });
      setLinks("");
      setInvoiceName("");
      if (invoiceRef.current) invoiceRef.current.value = "";
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Eroare" });
    } finally {
      setBusy(null);
    }
  }


  /**
   * Emailurile care se repeta la FIECARE comanda, gata scrise.
   *
   * Pana acum, casuta de mai jos pornea goala si trebuia compus de fiecare
   * data acelasi text — factura, apoi raportul — de obicei seara, pe telefon,
   * dupa o zi de munca. Sabloanele completeaza si subiectul, si mesajul; se
   * pot edita oricand inainte de trimitere.
   */
  const SABLOANE: { eticheta: string; subiect: string; text: string }[] = [
    {
      eticheta: "Factura",
      subiect: `Factura — ${articleTitle}`.slice(0, 120),
      text: [
        "Bună ziua,",
        "",
        `Vă mulțumim pentru comandă. Atașat aveți factura fiscală pentru publicarea articolului „${articleTitle}" în cele 50 de ziare din rețea.`,
        "",
        "Dacă ați efectuat deja transferul, nu mai aveți nimic de făcut — factura rămâne pentru evidența dumneavoastră contabilă.",
        "",
        "Publicăm în maximum 24 de ore lucrătoare, iar la final primiți pe email raportul complet cu toate linkurile.",
        "",
        "O zi bună,",
        "Echipa MediaExpres",
      ].join("\n"),
    },
    {
      eticheta: "Am publicat",
      subiect: `Articolul e publicat — ${articleTitle}`.slice(0, 120),
      text: [
        "Bună ziua,",
        "",
        `Articolul „${articleTitle}" este publicat pe toate cele 50 de ziare din rețea.`,
        "",
        "Vă trimitem separat raportul complet cu toate linkurile — puteți deschide și verifica fiecare publicare. Articolele rămân online permanent.",
        "",
        "Mulțumim pentru încredere!",
        "Echipa MediaExpres",
      ].join("\n"),
    },
    {
      eticheta: "Aștept plata",
      subiect: `Comanda ${articleTitle} — așteptăm confirmarea plății`.slice(0, 120),
      text: [
        "Bună ziua,",
        "",
        "Am primit comanda și materialele, mulțumim.",
        "",
        "Nu am identificat încă plata în extras. Dacă ați efectuat transferul, ne puteți trimite dovada tranzacției și demarăm publicarea pe loc, fără să mai așteptăm procesarea bancară.",
        "",
        "Publicăm în maximum 24 de ore lucrătoare de la confirmarea încasării.",
        "",
        "O zi bună,",
        "Echipa MediaExpres",
      ].join("\n"),
    },
  ];

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
              Factura s-a emis <strong>automat</strong> și a plecat la client — el plătește
              pe baza ei. Când vezi banii în extras, confirmă aici. (Dacă emiterea a
              eșuat, ai primit alertă pe email și o faci manual în StartCo.)
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
        {/*
          Factura, in acelasi email: pana acum raportul pleca de aici, iar
          factura din Trimite email sau din Gmail — trei taburi pentru o
          singura comanda. PDF-ul din StartCo se pune aici si clientul
          primeste raport + factura dintr-un singur mesaj.
        */}
        {invoiceName ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{invoiceName}</span>
            <button
              type="button"
              aria-label="Scoate factura"
              onClick={() => {
                setInvoiceName("");
                if (invoiceRef.current) invoiceRef.current.value = "";
              }}
              className="ml-auto text-emerald-700 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-navy">
            <Paperclip className="h-4 w-4" />
            Atașează factura PDF (opțional)
            <input
              ref={invoiceRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => setInvoiceName(e.target.files?.[0]?.name || "")}
            />
          </label>
        )}
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
            {linkCount > 0 ? `${linkCount} linkuri detectate` : "niciun link încă"} · raportul
            PDF + Excel se generează automat din linkuri
          </span>
        </div>
      </div>

      {/* 3. Email liber */}
      <div className={box}>
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          3. Scrie-i clientului
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Pleacă de pe adresa site-ului, ca mesaj personal. Alege un șablon și trimite —
          sau modifică textul înainte. Pentru factură ca atașament, folosește
          Emailuri → Răspunde clientului.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SABLOANE.map((t) => (
            <button
              key={t.eticheta}
              type="button"
              onClick={() => {
                setMailSubject(t.subiect);
                setMailBody(t.text);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-navy hover:text-brand-navy"
            >
              {t.eticheta}
            </button>
          ))}
        </div>
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
