import crypto from "crypto";

/**
 * Acces pentru publicatiile partenere, fara cont si fara parola.
 *
 * 14.09.2026 — un partener primeste cateva articole pe luna. Un cont cu parola
 * pentru trei click-uri pe luna se transforma in „am uitat parola", adica in
 * emailuri catre noi. Acelasi tipar care merge deja la clientul platitor
 * (`order-token.ts`, `/articol/[token]`): link semnat, trimis pe email.
 *
 * Doua domenii, acelasi semnatar:
 *   - `plasare` — un articol: accepta, refuza, lipeste linkul. 45 de zile.
 *   - `panou`   — publicatia: istoricul, soldul, deconturile. 400 de zile.
 *
 * Payload-ul contine DOAR id-ul si versiunea. Restul se citeste din baza la
 * fiecare deschidere, deci pagina arata mereu starea reala si un link vechi
 * nu poate ingheta un pret. `tokenVersion`, crescut pe rand, invalideaza
 * linkurile scurse fara sa tinem un tabel de sesiuni.
 */

const SEP = "|";
const ZILE: Record<Scope, number> = { plasare: 45, panou: 400 };

export type Scope = "plasare" | "panou";

export interface PlasareToken {
  scope: Scope;
  /** id-ul plasarii (scope „plasare") sau al publicatiei (scope „panou"). */
  id: string;
  v: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Aici NU tolerăm lipsa secretului nici macar in dezvoltare tacut: un
    // email trimis partenerului cu un link care nu merge e mai rau decat o
    // eroare vazuta de noi in admin.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET lipseste — linkurile pentru parteneri nu pot fi semnate");
    }
    return "dev-secret-change-in-production-please-32-chars";
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function semneazaToken(d: PlasareToken): string {
  const expira = Date.now() + ZILE[d.scope] * 24 * 60 * 60 * 1000;
  const payload = [d.scope, d.id, String(d.v), String(expira)].join(SEP);
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verificaToken(token: string | undefined, scope?: Scope): PlasareToken | null {
  if (!token) return null;
  const [b64, semnatura] = token.split(".");
  if (!b64 || !semnatura) return null;

  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString();
  } catch {
    return null;
  }

  const asteptat = sign(payload);
  if (
    asteptat.length !== semnatura.length ||
    !crypto.timingSafeEqual(Buffer.from(asteptat), Buffer.from(semnatura))
  ) {
    return null;
  }

  const [s, id, vStr, expiraStr] = payload.split(SEP);
  if (!s || !id || !vStr || !expiraStr) return null;
  if (s !== "plasare" && s !== "panou") return null;
  if (scope && s !== scope) return null;

  const expira = parseInt(expiraStr, 10);
  if (!Number.isFinite(expira) || Date.now() > expira) return null;

  const v = parseInt(vStr, 10);
  if (!Number.isFinite(v)) return null;

  return { scope: s, id, v };
}
