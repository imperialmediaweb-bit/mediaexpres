# Teste

Rulate cu Node, fara framework de test — proiectul n-are unul, iar suitele
astea trebuie sa poata fi rulate de oricine, oricand, cu un singur `node`.

## Ce verifica fiecare

| Fisier | Verificari | Ce acopera |
|---|---|---|
| `unit.ts` | 100 | logica pura: termenul rulant al ofertei, preturi si pachete, emailul cu lista, cunostintele consultantului, generatoarele de .xlsx si .pdf (validate byte cu byte), integritatea datelor retelei |
| `api.mjs` | 37 | securitate (fiecare endpoint refuza fara sesiune/cheie) si validarea datelor de intrare |
| `pages.mjs` | 27 | fiecare pagina publica, de admin si de cont raspunde 200, fara erori JavaScript |
| `flows.mjs` | 30 | fluxurile reale in Chromium: comanda, pretul de cazino, pixelul, fluxul OP, mobil 390px, SEO |

## Cum le rulezi

Ai nevoie de serverul pornit local (`npm run build && npm run start`) pentru
toate in afara de `unit.ts`.

```bash
# 1. Unit (nu cere server) — se bundluieste cu esbuild din node_modules
node_modules/.bin/esbuild tests/unit.ts --bundle --platform=node --format=esm \
  --outfile=/tmp/unit.mjs --alias:@=./src && node /tmp/unit.mjs

# 2. Restul, cu serverul pornit pe :3000
node tests/api.mjs
node tests/pages.mjs
node tests/flows.mjs
```

`flows.mjs` cere Chromium (`/opt/pw-browsers/chromium`) si `playwright-core`.

## De ce sunt scrise asa

Cateva verificari par exagerate — de exemplu citirea tabelului central al
arhivei .xlsx sau validarea offset-urilor din xref-ul PDF-ului. Sunt acolo
pentru ca ambele formate sunt generate de mana, fara librarie: un fisier
"aproape corect" se deschide in Chromium si crapa in Excel. Verificarea la
nivel de structura e singura care prinde asta inainte de client.
