import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";

/**
 * 17.10.2026 — comanda trimisa din formularul nou, inainte de plata, are o
 * referinta `cmd_<uuid>` (sau `op_<uuid>` daca a ales transferul). Referinta
 * sta in coloana stripe_session_id pana la plata cu cardul, cand o inlocuim
 * cu sesiunea Stripe — exact ca la o comanda platita intai cu cardul.
 */
export function esteRefComanda(ref: string): boolean {
  return /^(cmd|op)_[0-9a-f-]{36}$/.test(ref);
}

export async function gasesteComanda(ref: string) {
  if (!esteRefComanda(ref)) return null;
  const [row] = await db
    .select()
    .from(orderSubmissions)
    .where(eq(orderSubmissions.stripeSessionId, ref))
    .limit(1);
  return row ?? null;
}
