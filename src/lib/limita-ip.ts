import type { NextRequest } from "next/server";

/**
 * Limitare simpla pe IP, in memorie, pentru endpointurile publice din fluxul
 * de comanda (cautare CUI, articol generat, captura de site). Fiecare apelant
 * isi tine propriul Map, cu propria fereastra.
 */
export function ipDinCerere(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function creeazaLimita(max: number, fereastraMs: number) {
  const log = new Map<string, number[]>();
  return function depasit(cheie: string): boolean {
    const acum = Date.now();
    if (log.size > 5000) {
      for (const [k, v] of log) {
        if (v.every((t) => acum - t >= fereastraMs)) log.delete(k);
      }
    }
    const recente = (log.get(cheie) || []).filter((t) => acum - t < fereastraMs);
    recente.push(acum);
    log.set(cheie, recente);
    return recente.length > max;
  };
}
