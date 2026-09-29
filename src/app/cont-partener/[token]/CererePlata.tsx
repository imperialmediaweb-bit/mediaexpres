"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ibanValid } from "@/lib/decont";

/**
 * „Cere plata" — IBAN-ul se cere ABIA AICI, la prima retragere, nu la
 * inscriere (acelasi principiu ca la foto-contribuitorii din retea: nimeni
 * nu-si da contul bancar unui site inainte sa aiba ce incasa).
 */
export function CererePlata({
  token,
  suma,
  ibanSalvat,
  firmaSalvata,
}: {
  token: string;
  suma: number;
  ibanSalvat: string;
  firmaSalvata: string;
}) {
  const router = useRouter();
  const [iban, setIban] = useState(ibanSalvat);
  const [titular, setTitular] = useState(firmaSalvata);
  const [cui, setCui] = useState("");
  const [factura, setFactura] = useState("");
  const [trimit, setTrimit] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  async function trimite(e: React.FormEvent) {
    e.preventDefault();
    if (!ibanValid(iban)) {
      setEroare("IBAN-ul nu pare corect. Verifică-l — o cifră greșită trimite banii în altă parte.");
      return;
    }
    setTrimit(true);
    setEroare(null);
    try {
      const r = await fetch("/api/partener/retragere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, iban, accountHolder: titular, cui, invoiceNumber: factura }),
      });
      const d = await r.json();
      if (!d.ok) {
        setEroare(d.error || "Nu am putut trimite cererea.");
        setTrimit(false);
        return;
      }
      router.refresh();
    } catch {
      setEroare("Conexiunea a căzut. Încearcă din nou.");
      setTrimit(false);
    }
  }

  return (
    <form onSubmit={trimite} className="space-y-3">
      <p className="text-sm text-slate-700">
        Ai <strong className="text-brand-red">{suma} lei</strong> de încasat. Scrie unde îți trimitem banii:
      </p>
      <input
        required
        value={iban}
        onChange={(e) => setIban(e.target.value)}
        placeholder="IBAN — RO49 AAAA 1B31 0075 9384 0000"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-red"
      />
      <input
        required
        value={titular}
        onChange={(e) => setTitular(e.target.value)}
        placeholder="Titularul contului (firma sau numele tău)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-red"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={cui}
          onChange={(e) => setCui(e.target.value)}
          placeholder="CUI (dacă facturezi ca firmă)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-red"
        />
        <input
          value={factura}
          onChange={(e) => setFactura(e.target.value)}
          placeholder="Nr. facturii (poți s-o trimiți și după)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-red"
        />
      </div>
      <Button type="submit" variant="accent" size="lg" disabled={trimit} className="w-full sm:w-auto">
        {trimit ? "Se trimite…" : `Cere plata — ${suma} lei`}
      </Button>
      {eroare && <p className="text-sm font-medium text-brand-red">{eroare}</p>}
    </form>
  );
}
