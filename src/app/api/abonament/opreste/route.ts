import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { verificaOprire, dataRo, sumaAbonament } from "@/lib/abonament-reamintire";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Oprirea abonamentului din linkul din email. Doar POST, din butonul de pe
 * /abonament/opreste: un GET ar fi oprit abonamentul cand scannerul de
 * linkuri al clientului deschide emailul. Abonamentul se opreste la
 * sfarsitul perioadei platite (cancel_at_period_end), nu pe loc.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("t") || "");
  const ok = verificaOprire(token);
  const inapoi = (stare: string) => NextResponse.redirect(new URL(`/abonament/opreste?t=${encodeURIComponent(token)}&stare=${stare}`, SITE.url), 303);
  if (!ok) return inapoi("invalid");
  const stripe = getStripe();
  if (!stripe) return inapoi("eroare");
  try {
    const sub = await stripe.subscriptions.update(ok.subId, { cancel_at_period_end: true });
    const data = dataRo(sub.current_period_end * 1000);
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Abonament oprit de client: ${ok.email}`,
      html: wrapEmail("Abonament oprit", `<p><strong>${ok.email}</strong> și-a oprit abonamentul (${sumaAbonament(sub)}/lună) din emailul de reamintire.</p><p>Nu se mai face nicio plată. Abonamentul rămâne activ până pe ${data}.</p>`),
    });
    if (ok.email) {
      await sendEmail({
        to: ok.email,
        subject: "Abonamentul MediaExpres a fost oprit",
        html: wrapEmail("Abonament oprit", `<p>Am oprit abonamentul. Nu se mai face nicio plată.</p><p>Până pe <strong>${data}</strong> rămâi cu tot ce ai plătit deja.</p><p>Dacă te răzgândești, scrie-ne și îl repornim. Mulțumim că ai lucrat cu noi!</p><p>Echipa MediaExpres</p>`),
        replyTo: ADMIN_EMAIL,
      });
    }
    return inapoi("oprit");
  } catch (e) {
    console.error("[abonament/opreste]", e);
    return inapoi("eroare");
  }
}
