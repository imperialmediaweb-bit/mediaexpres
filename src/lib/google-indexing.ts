import { createSign } from "node:crypto";

/**
 * Google Indexing API — anunta Google direct, fara sa astepti crawlerul.
 *
 * Implementat fara nicio dependenta noua: token-ul OAuth se obtine semnand un
 * JWT cu cheia privata a contului de serviciu (RS256, din node:crypto) si
 * schimbandu-l pe un access token. Alternativa ar fi fost pachetul googleapis,
 * 50+ MB pentru doua apeluri HTTP.
 *
 * DE SPUS PE FATA: oficial, Indexing API e documentat pentru JobPosting si
 * BroadcastEvent. Pentru pagini obisnuite functioneaza in practica si nu strica
 * nimic, dar Google nu garanteaza indexarea — de aceea ramane obligatoriu si
 * sitemap-ul in Search Console. Aici e un accelerator, nu un inlocuitor.
 *
 * Configurare (o singura data):
 *   1. Google Cloud Console -> proiect nou -> activeaza "Indexing API"
 *   2. Creeaza un Service Account, genereaza cheie JSON
 *   3. In Search Console -> Settings -> Users and permissions -> adauga
 *      emailul contului de serviciu ca OWNER
 *   4. Pune JSON-ul intreg in GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON (Railway)
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Semneaza un JWT RS256 si il schimba pe un access token OAuth2. */
async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = base64url(signer.sign(sa.private_key));
  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token || null;
}

export interface GoogleIndexResult {
  ok: boolean;
  submitted: number;
  failed: number;
  error?: string;
  configured: boolean;
}

/**
 * Anunta Google pentru fiecare adresa. Cota implicita e 200 de adrese pe zi,
 * asa ca taiem lista la 200 si spunem cate au ramas pe dinafara.
 * Trimitem in grupuri de 10 in paralel: 200 de apeluri secventiale ar depasi
 * limita de timp a functiei.
 */
export async function submitToGoogle(urls: string[]): Promise<GoogleIndexResult> {
  const raw = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;
  if (!raw) return { ok: false, submitted: 0, failed: 0, configured: false };

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(raw) as ServiceAccount;
    if (!sa.client_email || !sa.private_key) throw new Error("JSON incomplet");
  } catch (err) {
    return {
      ok: false,
      submitted: 0,
      failed: 0,
      configured: true,
      error: `Cheia de serviciu nu e validă: ${err instanceof Error ? err.message : err}`,
    };
  }

  let token: string | null;
  try {
    token = await getAccessToken(sa);
  } catch (err) {
    return {
      ok: false,
      submitted: 0,
      failed: 0,
      configured: true,
      error: `Autentificare eșuată: ${err instanceof Error ? err.message : err}`,
    };
  }
  if (!token) {
    return {
      ok: false,
      submitted: 0,
      failed: 0,
      configured: true,
      error: "Google a refuzat autentificarea — verifică dacă contul de serviciu e Owner în Search Console",
    };
  }

  const list = urls.slice(0, 200);
  let submitted = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i += 10) {
    const batch = list.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const r = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ url, type: "URL_UPDATED" }),
            signal: AbortSignal.timeout(8000),
          });
          return r.ok;
        } catch {
          return false;
        }
      }),
    );
    submitted += results.filter(Boolean).length;
    failed += results.filter((x) => !x).length;
  }

  return { ok: submitted > 0, submitted, failed, configured: true };
}
