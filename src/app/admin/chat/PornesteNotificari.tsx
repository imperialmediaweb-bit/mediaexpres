"use client";

import { useEffect, useState } from "react";

function cheieUint8(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** 24.11.2026 — un buton: telefonul acesta primeste notificare la fiecare mesaj nou din chat. */
export function PornesteNotificari() {
  const [stare, setStare] = useState<"?" | "nesuportat" | "pornit" | "oprit" | "lucru" | "refuzat">("?");
  const [eroare, setEroare] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStare("nesuportat");
      return;
    }
    if (Notification.permission === "denied") return setStare("refuzat");
    navigator.serviceWorker
      .getRegistration("/sw-admin.js")
      .then((r) => r?.pushManager.getSubscription())
      .then((s) => setStare(s ? "pornit" : "oprit"))
      .catch(() => setStare("oprit"));
  }, []);

  async function porneste() {
    setStare("lucru");
    setEroare("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setStare("refuzat");
      const reg = await navigator.serviceWorker.register("/sw-admin.js");
      await navigator.serviceWorker.ready;
      const { publicKey } = await fetch("/api/admin/push").then((r) => r.json());
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cheieUint8(publicKey).buffer as ArrayBuffer }));
      const r = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setStare("pornit");
    } catch (e) {
      setEroare(e instanceof Error ? e.message : String(e));
      setStare("oprit");
    }
  }

  if (stare === "?") return null;
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm">
      {stare === "pornit" ? (
        <p className="text-emerald-700">🔔 Notificările sunt pornite pe acest dispozitiv. Le poți porni și pe alt telefon, din aceeași pagină.</p>
      ) : stare === "nesuportat" ? (
        <p className="text-slate-600">Browserul acesta nu suportă notificări. Pe telefon folosește Chrome.</p>
      ) : stare === "refuzat" ? (
        <p className="text-amber-700">Notificările sunt blocate pentru site. Deblochează-le din setările browserului (iconița lacăt de lângă adresă), apoi reîncarcă pagina.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void porneste()}
            disabled={stare === "lucru"}
            className="rounded-lg bg-brand-red px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {stare === "lucru" ? "Se pornește…" : "🔔 Pornește notificările pe acest telefon"}
          </button>
          <span className="text-slate-500">Primești notificare la fiecare mesaj nou din chat, ca la WhatsApp.</span>
        </div>
      )}
      {eroare && <p className="mt-2 text-red-600">{eroare}</p>}
    </div>
  );
}
