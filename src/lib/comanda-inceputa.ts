import { sql } from "drizzle-orm";
import { db } from "@/db";
import { sendEmail, wrapEmail, escapeHtml as esc } from "@/lib/email";
import { SITE } from "@/data/site";
import { findPackageById } from "@/data/packages";

/**
 * 30.10.2026 — cine scrie emailul si telefonul in formularul de comanda si nu
 * termina. Proprietarul nu vrea sa sune pe nimeni: dupa o ora, clientul
 * primeste singur UN email „Comanda dumneavoastra va asteapta", cu linkul
 * inapoi la formular si WhatsApp-ul. Daca intre timp a venit o comanda sau o
 * plata pe acelasi email, nu pleaca nimic.
 *
 * Tabelul se creeaza singur (CREATE TABLE IF NOT EXISTS), un rand pe email.
 */

const WHATSAPP = "40741970247";

let gata: Promise<unknown> | null = null;
function asiguraTabel() {
  if (!gata) {
    gata = db.execute(sql`CREATE TABLE IF NOT EXISTS "comanda_inceputa" (
      "email" text PRIMARY KEY,
      "phone" text NOT NULL,
      "package_id" text,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "reamintire_at" timestamp
    )`);
    gata.catch(() => (gata = null));
  }
  return gata;
}

export async function salveazaComandaInceputa(email: string, phone: string, packageId?: string) {
  await asiguraTabel();
  const e = email.trim().toLowerCase();
  // Daca a mai inceput o data si a primit deja emailul, nu-l mai primeste.
  await db.execute(sql`INSERT INTO "comanda_inceputa" ("email", "phone", "package_id")
    VALUES (${e}, ${phone}, ${packageId || null})
    ON CONFLICT ("email") DO UPDATE SET "phone" = EXCLUDED."phone", "package_id" = EXCLUDED."package_id"
    WHERE "comanda_inceputa"."reamintire_at" IS NULL`);
}

/** Rulat din cronul de la 5 minute (materiale-lipsa). Intoarce cate emailuri au plecat. */
export async function trimiteReamintiriComandaInceputa(): Promise<number> {
  await asiguraTabel();
  // Doar ultimele 2 zile: cine a inceput acum o saptamana nu mai primeste nimic.
  const r = await db.execute(sql`SELECT c."email", c."package_id" FROM "comanda_inceputa" c
    WHERE c."reamintire_at" IS NULL AND c."created_at" < now() - interval '1 hour' AND c."created_at" > now() - interval '2 days'
      AND NOT EXISTS (SELECT 1 FROM "order" o WHERE lower(o."email") = c."email" AND o."created_at" > c."created_at" - interval '1 day')
      AND NOT EXISTS (SELECT 1 FROM "order_submission" s WHERE lower(s."email") = c."email" AND s."created_at" > c."created_at" - interval '1 day')
    LIMIT 20`);
  type Rand = { email: string; package_id: string | null };
  const randuri = (r as unknown as { rows?: Rand[] }).rows ?? (r as unknown as Rand[]);

  let trimise = 0;
  for (const row of randuri) {
    // Marcam intai: un email care cade nu se repeta la fiecare 5 minute.
    await db.execute(sql`UPDATE "comanda_inceputa" SET "reamintire_at" = now() WHERE "email" = ${row.email}`);
    const pachet = row.package_id || "promo-50";
    const nume = findPackageById(pachet)?.name || "Oferta 50 de ziare";
    const link = `${SITE.url}/comanda/noua?pachet=${encodeURIComponent(pachet)}&email=${encodeURIComponent(row.email)}`;
    try {
      await sendEmail({
        to: row.email,
        subject: "Comanda dumneavoastră vă așteaptă",
        html: wrapEmail(
          "Comanda dumneavoastră vă așteaptă",
          `<p>Bună ziua,</p>
          <p>Ați început o comandă pe MediaExpres (<strong>${esc(nume)}</strong>), dar nu a fost finalizată. Am păstrat-o pentru dumneavoastră.</p>
          <p style="margin:24px 0;"><a href="${link}" style="background:#0f172a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Finalizez comanda</a></p>
          <p>Puteți plăti acum cu cardul și trimite articolul după, când este gata.</p>
          <p>Aveți întrebări? Scrieți-ne pe <a href="https://wa.me/${WHATSAPP}">WhatsApp: 0741 970 247</a> sau răspundeți la acest email.</p>
          <p>Cu stimă,<br/>Echipa MediaExpres</p>`,
        ),
      });
      trimise++;
    } catch (e) {
      console.error("[comanda-inceputa]", row.email, e);
    }
  }
  return trimise;
}
