import {
  createInvoice,
  recordInvoicePayment,
  isStartcoConfigured,
  listSeries,
  STARTCO_SERIES,
  StartcoError,
  INVOICE_PRODUCT_NAME,
} from "@/lib/startco";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export interface IssueInvoiceInput {
  email: string | null;
  customerName?: string | null;
  /** CUI/CIF al clientului. Fara el nu putem emite automat. */
  cui?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  /** Suma incasata, in RON (nu bani). */
  amount: number;
  packageLabel: string;
  stripeSessionId: string;
}

/** Alerta catre admin cand factura trebuie emisa de mana. */
async function alertManualInvoice(input: IssueInvoiceInput, reason: string) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `⚠️ Factura de emis manual — ${input.customerName || input.email || "client"}`,
    html: wrapEmail(
      "Factura nu a putut fi emisa automat",
      `
      <p style="color:#b91c1c;"><strong>Motiv:</strong> ${reason}</p>
      <p>Plata a intrat, dar factura trebuie emisa manual in StartCo.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${kv("Client", input.customerName || "—")}
        ${kv("Email", input.email || "—")}
        ${kv("CUI", input.cui || "— (lipseste)")}
        ${kv("Adresa", input.address || "—")}
        ${kv("Suma", `${input.amount.toFixed(2)} RON`)}
        ${kv("Serviciu", INVOICE_PRODUCT_NAME)}
        ${kv("Pachet", input.packageLabel)}
        ${kv("Stripe session", input.stripeSessionId)}
      </table>
      `,
    ),
    replyTo: input.email || undefined,
  });
}

/**
 * Emite factura in StartCo pentru o plata Stripe reusita si trimite clientului
 * linkul permanent catre ea.
 *
 * Best-effort prin design: orice esec devine o alerta catre admin, niciodata o
 * exceptie aruncata in webhook — plata e deja incasata, nu are rost sa cada
 * procesarea din cauza facturarii.
 */
export async function issueInvoiceForOrder(
  input: IssueInvoiceInput,
): Promise<void> {
  try {
    if (!isStartcoConfigured()) {
      await alertManualInvoice(input, "StartCo nu este configurat (STARTCO_TOKEN lipseste).");
      return;
    }

    // Fara CUI nu putem construi clientul: `identifier` e obligatoriu la StartCo.
    if (!input.cui?.trim()) {
      await alertManualInvoice(
        input,
        "Clientul nu a completat CUI-ul la checkout, deci nu stim pe cine facturam.",
      );
      return;
    }

    const invoice = await createInvoice({
      client: {
        identifier: input.cui.trim(),
        type: "business",
        name: input.customerName || undefined,
        address: input.address || undefined,
        city: input.city || undefined,
        email: input.email || undefined,
        phone: input.phone || undefined,
      },
      amount: input.amount,
      mentions: `Achitat online cu cardul. Ref: ${input.stripeSessionId}`,
    });

    // Marcarea ca incasata e separata de emitere: daca esueaza, factura ramane
    // valida si o marcam manual, in loc sa fie stearsa prin rollback.
    let paymentRecorded = true;
    try {
      await recordInvoicePayment({
        invoiceId: invoice.id,
        amount: input.amount,
        reference: input.stripeSessionId,
      });
    } catch (err) {
      paymentRecorded = false;
      console.error("[invoicing] nu am putut inregistra plata:", err);
    }

    if (input.email && invoice.shareUrl) {
      await sendEmail({
        to: input.email,
        subject: `Factura ${invoice.series} ${invoice.number} — MediaExpres`,
        html: wrapEmail(
          "Factura ta",
          `
          <p>Salut,</p>
          <p>Ai mai jos factura pentru <strong>${INVOICE_PRODUCT_NAME}</strong> — ${input.amount.toFixed(2)} RON.</p>
          <p style="margin-top:16px;">
            <a href="${invoice.shareUrl}" style="background:#E4002B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Vezi factura</a>
          </p>
          <p style="margin-top:16px;color:#64748b;font-size:13px;">Linkul e permanent — il poti da contabilitatii oricand.</p>
          <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
          `,
        ),
      });
    }

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Factura ${invoice.series} ${invoice.number} emisa — ${input.amount.toFixed(2)} RON`,
      html: wrapEmail(
        "Factura emisa automat",
        `
        <table style="width:100%;border-collapse:collapse;">
          ${kv("Numar", `${invoice.series} ${invoice.number}`)}
          ${kv("Client", input.customerName || input.email || "—")}
          ${kv("CUI", input.cui)}
          ${kv("Total", `${invoice.total} ${invoice.currency}`)}
          ${kv("Status", paymentRecorded ? "Incasata" : "⚠️ Emisa — marcheaz-o incasata manual")}
          ${kv("Link", invoice.shareUrl || "—")}
        </table>
        ${!input.email ? '<p style="color:#b91c1c;">Clientul nu are email — factura nu i-a fost trimisa.</p>' : ""}
        ${!invoice.shareUrl ? '<p style="color:#b91c1c;">StartCo nu a returnat shareUrl — trimite factura manual.</p>' : ""}
        <p style="margin-top:16px;"><a href="${SITE.url}/admin/comenzi">Vezi comenzile</a></p>
        `,
      ),
    });
  } catch (err) {
    let reason =
      err instanceof StartcoError
        ? `StartCo a refuzat factura: ${err.message} (cod ${err.code})`
        : `Eroare neasteptata: ${err instanceof Error ? err.message : String(err)}`;

    // Auto-diagnostic: cel mai frecvent motiv de refuz e seria gresita
    // (STARTCO_SERIES trebuie sa fie NUMELE unei serii de facturi din cont,
    // nu numele tokenului). La orice refuz, punem in alerta seriile reale,
    // ca emailul sa spuna singur care e valoarea corecta.
    if (err instanceof StartcoError && err.code !== "NO_TOKEN") {
      try {
        const all = await listSeries();
        const invoiceSeries = all.filter((s) => s.type === "invoice").map((s) => s.series);
        const match = invoiceSeries.some(
          (n) => n.trim().toLowerCase() === STARTCO_SERIES.trim().toLowerCase(),
        );
        reason += ` — Seria configurata: "${STARTCO_SERIES}". Serii de facturi existente in cont: ${
          invoiceSeries.length ? invoiceSeries.map((n) => `"${n}"`).join(", ") : "niciuna"
        }.${match ? "" : " SERIA CONFIGURATA NU EXISTA — seteaza STARTCO_SERIES in Railway pe una din seriile de mai sus."}`;
      } catch {
        // daca nici listarea seriilor nu merge, ramane motivul de baza
      }
    }

    console.error("[invoicing] emitere esuata:", err);
    await alertManualInvoice(input, reason).catch((e) =>
      console.error("[invoicing] nici alerta nu a plecat:", e),
    );
  }
}
