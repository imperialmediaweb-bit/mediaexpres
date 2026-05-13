// Wrapper subțire peste Resend REST API pentru list emails.
// SDK-ul resend v4 nu expune `.list()`, așa că lovim direct REST.
// Endpoint disponibil pe planurile Pro/Scale ale Resend (nu Free).

export interface ResendEmailItem {
  id: string;
  from: string;
  to: string[] | string;
  subject: string;
  created_at: string;
  last_event:
    | "sent"
    | "delivered"
    | "delivery_delayed"
    | "opened"
    | "clicked"
    | "bounced"
    | "complained"
    | "failed"
    | string;
}

export interface ListEmailsResult {
  ok: boolean;
  data: ResendEmailItem[];
  error?: string;
  hint?: string;
  // Cate emailuri RAW a returnat Resend inainte de filtrare per-domeniu.
  // Ajuta utilizatorul sa inteleaga daca limit-ul e atins inainte de filtrare.
  totalFetched?: number;
  fromDomain?: string;
}

// Resend API key e shared pe tot contul, deci /emails returneaza ABSOLUT TOATE
// emailurile din toate proiectele/domeniile. Filtram client-side dupa domeniul
// FROM_EMAIL ca sa nu vezi emailuri de la alte branduri (ex: Asociatii Happy)
// in dashboard-ul MediaExpres.
function getFromDomain(): string {
  const raw = process.env.FROM_EMAIL || "noreply@mediaexpress.ro";
  const match = raw.match(/@([^>\s]+)/);
  return match ? match[1].toLowerCase() : "mediaexpress.ro";
}

export async function listResendEmails(limit = 100): Promise<ListEmailsResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      data: [],
      error: "RESEND_API_KEY lipsește din env",
      hint: "Setează RESEND_API_KEY în Railway / .env.local",
    };
  }

  const fromDomain = getFromDomain();

  try {
    const res = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let hint: string | undefined;
      if (res.status === 401) hint = "API key invalid sau revocat.";
      else if (res.status === 403)
        hint =
          "Endpoint-ul list emails e disponibil pe planurile Pro+ Resend. Verifică planul tău.";
      else if (res.status === 404)
        hint = "Endpoint inexistent — versiunea API Resend s-a schimbat.";
      return {
        ok: false,
        data: [],
        error: `Resend API ${res.status}: ${body.slice(0, 200)}`,
        hint,
        fromDomain,
      };
    }

    const json = (await res.json()) as { data?: ResendEmailItem[] };
    const raw = json.data ?? [];
    const filtered = raw.filter((e) =>
      typeof e.from === "string" && e.from.toLowerCase().includes(fromDomain),
    );
    return {
      ok: true,
      data: filtered,
      totalFetched: raw.length,
      fromDomain,
    };
  } catch (err) {
    return {
      ok: false,
      data: [],
      error: err instanceof Error ? err.message : String(err),
      fromDomain,
    };
  }
}

export interface EmailStats {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

// Resend `last_event` e cumulativ: dacă a fost click, va apărea "clicked" (a trecut prin opened înainte).
// Calculăm rate-urile contra emailurilor livrate (nu contra trimiterilor totale, ca să nu fie penalizate de bounces).
export function aggregateStats(emails: ResendEmailItem[]): EmailStats {
  const total = emails.length;
  const delivered = emails.filter((e) =>
    ["delivered", "opened", "clicked"].includes(e.last_event),
  ).length;
  const opened = emails.filter((e) =>
    ["opened", "clicked"].includes(e.last_event),
  ).length;
  const clicked = emails.filter((e) => e.last_event === "clicked").length;
  const bounced = emails.filter((e) => e.last_event === "bounced").length;
  const complained = emails.filter((e) => e.last_event === "complained").length;

  return {
    total,
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
    clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
    bounceRate: total > 0 ? (bounced / total) * 100 : 0,
  };
}
