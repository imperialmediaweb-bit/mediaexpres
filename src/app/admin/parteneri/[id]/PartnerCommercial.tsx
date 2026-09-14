"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, PauseCircle, PlayCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NIVELURI, ADAOS_PLASARE, pretClient, nivelDupaId } from "@/lib/niveluri-publicatii";

/**
 * Partea comerciala a unei publicatii partenere: nivelul, tariful, dofollow.
 *
 * 14.09.2026 — `PartnerActions` se inchide dupa prima decizie („aplicatia a
 * fost deja decisa"), deci dupa aprobare nu mai exista NICIUN loc in care sa
 * pui un pret. Fara pret, publicatia nu poate primi nicio plasare. Blocul
 * asta e vizibil la orice status si se poate schimba oricand: publicatia
 * creste si urca de nivel, sau incalca regulile si o suspenzi.
 */
export function PartnerCommercial({
  publisherId,
  status,
  tier,
  pricePerArticle,
  dofollowLinks,
  nivelSugerat,
}: {
  publisherId: string;
  status: string;
  tier: string | null;
  pricePerArticle: number | null;
  dofollowLinks: boolean | null;
  /** Nivelul propus din cifre, ca sa nu alegi pe ghicite. */
  nivelSugerat: string | null;
}) {
  const router = useRouter();
  const [nivel, setNivel] = useState(tier || nivelSugerat || "bronz");
  const [pret, setPret] = useState(
    String(pricePerArticle ?? nivelDupaId(tier || nivelSugerat)?.plata ?? NIVELURI[0].plata),
  );
  const [dofollow, setDofollow] = useState<boolean | null>(dofollowLinks);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function trimite(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/publishers/${publisherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      setMsg({ ok: true, text: "Salvat." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Eroare" });
    } finally {
      setBusy(null);
    }
  }

  const pretNum = Number(pret) || 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-serif text-lg font-semibold text-brand-navy">Nivel și tarif</h3>
      <p className="mt-1 text-xs text-slate-500">
        Se poate schimba oricând. Fără tarif, publicației nu i se poate trimite nicio plasare.
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Nivel</Label>
          <select
            value={nivel}
            onChange={(e) => {
              setNivel(e.target.value);
              const n = nivelDupaId(e.target.value);
              if (n) setPret(String(n.plata));
            }}
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {NIVELURI.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nume} — îi plătim {n.plata} lei, vindem cu {pretClient(n.plata)} lei
              </option>
            ))}
          </select>
          {nivelSugerat && nivelSugerat !== nivel && (
            <p className="text-xs text-amber-700">
              Din cifrele lui, nivelul propus e <strong>{nivelDupaId(nivelSugerat)?.nume}</strong>.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Tarif pe articol (lei)</Label>
          <Input type="number" value={pret} onChange={(e) => setPret(e.target.value)} />
          <p className="text-xs text-slate-500">
            Clientul plătește <strong>{pretNum + ADAOS_PLASARE} lei</strong>, nouă ne rămân{" "}
            <strong>{ADAOS_PLASARE} lei</strong>.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Linkurile rămân dofollow?</Label>
          <select
            value={dofollow === null ? "" : dofollow ? "da" : "nu"}
            onChange={(e) => setDofollow(e.target.value === "" ? null : e.target.value === "da")}
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— nu știm —</option>
            <option value="da">Da</option>
            <option value="nu">Nu (doar vizibilitate, nu SEO)</option>
          </select>
        </div>

        <Button
          type="button"
          variant="accent"
          onClick={() =>
            trimite("set_tier", {
              tier: nivel,
              pricePerArticle: pretNum,
              ...(dofollow === null ? {} : { dofollowLinks: dofollow }),
            })
          }
          disabled={busy !== null}
        >
          {busy === "set_tier" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvează
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {status === "suspended" ? (
          <Button type="button" variant="outline" onClick={() => trimite("reactivate")} disabled={busy !== null}>
            <PlayCircle className="h-4 w-4" /> Reactivează
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => trimite("suspend")} disabled={busy !== null}>
            <PauseCircle className="h-4 w-4" /> Suspendă
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => trimite("reset_token")} disabled={busy !== null}>
          <KeyRound className="h-4 w-4" /> Taie linkurile vechi
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Suspendarea nu șterge nimic: plasările publicate rămân, banii datorați rămân de plătit.
        Doar nu mai primește articole noi.
      </p>

      {msg && (
        <p className={`mt-3 rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
