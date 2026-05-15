import { createHash, randomUUID } from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}

export interface CapiEvent {
  eventName:
    | "PageView"
    | "Lead"
    | "CompleteRegistration"
    | "InitiateCheckout"
    | "AddPaymentInfo"
    | "Purchase"
    | "Contact"
    | "Subscribe"
    | string;
  eventId?: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  user: CapiUserData;
  customData?: Record<string, unknown>;
}

export interface CapiResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  eventId?: string;
}

export async function sendCapiEvent(e: CapiEvent): Promise<CapiResult> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[meta-capi] disabled (lipseste NEXT_PUBLIC_META_PIXEL_ID sau META_CAPI_ACCESS_TOKEN)");
    }
    return { ok: false, skipped: true };
  }

  const userData: Record<string, unknown> = {};
  if (e.user.email) userData.em = [sha256(e.user.email)];
  if (e.user.phone) {
    const digits = e.user.phone.replace(/[^0-9]/g, "");
    if (digits) userData.ph = [sha256(digits)];
  }
  if (e.user.firstName) userData.fn = [sha256(e.user.firstName)];
  if (e.user.lastName) userData.ln = [sha256(e.user.lastName)];
  if (e.user.city) userData.ct = [sha256(e.user.city)];
  if (e.user.ip) userData.client_ip_address = e.user.ip;
  if (e.user.userAgent) userData.client_user_agent = e.user.userAgent;
  if (e.user.fbp) userData.fbp = e.user.fbp;
  if (e.user.fbc) userData.fbc = e.user.fbc;

  const eventId = e.eventId || randomUUID();

  const eventPayload: Record<string, unknown> = {
    event_name: e.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: userData,
  };
  if (e.eventSourceUrl) eventPayload.event_source_url = e.eventSourceUrl;
  if (e.value !== undefined || e.customData) {
    eventPayload.custom_data = {
      ...(e.value !== undefined
        ? { value: e.value, currency: e.currency || "RON" }
        : {}),
      ...(e.customData || {}),
    };
  }

  const body: Record<string, unknown> = { data: [eventPayload] };
  if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[meta-capi]", res.status, text.slice(0, 300));
      return { ok: false, error: `${res.status}: ${text.slice(0, 200)}`, eventId };
    }
    return { ok: true, eventId };
  } catch (err) {
    console.error("[meta-capi] network error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err), eventId };
  }
}

export function extractRequestUserData(req: Request): {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
} {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const userAgent = req.headers.get("user-agent") || undefined;
  const cookie = req.headers.get("cookie") || "";
  const fbp = cookie.match(/_fbp=([^;]+)/)?.[1];
  const fbc = cookie.match(/_fbc=([^;]+)/)?.[1];
  return { ip, userAgent, fbp, fbc };
}

export function splitName(fullName: string): { firstName?: string; lastName?: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
