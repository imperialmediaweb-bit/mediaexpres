# Migrări de bază de date

## Regula

**Nu rulăm `drizzle-kit push` automat, nici la pornire, nici ca pre-deploy.**

Motivul, dintr-un incident real (25 august 2026): comanda a blocat pornirea
serverului așteptând un răspuns la o întrebare pe care nimeni nu o vedea —

```
❯ No, add the constraint without truncating the table
  Yes, truncate the table
```

Healthcheck-ul a picat, aplicația n-a mai pornit deloc. Iar varianta „rezolvă-o
cu `--force`" e mai rea decât problema: pe o astfel de întrebare, force alege
singur, iar una dintre opțiuni **golește tabela**. Într-o bază cu comenzi și
clienți reali, asta e pierdere de date, nu o inconveniență.

## Cum se face, în schimb

Migrările sunt explicite și idempotente, în `/api/admin/fix-db`. Fiecare
folosește `IF NOT EXISTS` sau e prinsă în try/catch, deci poate fi rulată
oricând, de câte ori e nevoie, fără efect secundar.

**După un deploy care adaugă tabele sau coloane:**

```bash
curl -X POST https://mediaexpress.ro/api/admin/fix-db \
  -H "x-api-key: $EXTENSION_API_KEY"
```

Răspunsul listează fiecare pas cu `OK` sau cu mesajul de eroare.

**Alternativ, direct în Railway** → Postgres → tab Database → Query: lipești
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`. Merge instant, fără redeploy —
util când site-ul e picat și nu vrei să aștepți un build.

## Când adaugi ceva în `src/db/schema.ts`

Adaugă și migrarea corespunzătoare în `src/app/api/admin/fix-db/route.ts`, în
aceeași schimbare. Altfel codul nou ajunge în producție înaintea coloanei pe
care o folosește, iar paginile care o ating crapă — exact ce s-a întâmplat.

## Local

Acolo `drizzle-kit push --force` e în regulă, baza e de test:

```bash
DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/mediaexpres" \
  npx drizzle-kit push --force
```
