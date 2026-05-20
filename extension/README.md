# MediaExpres — Extensie Chrome pentru LinkedIn

Capturează profile LinkedIn ca prospecți în MediaExpres și generează mesaje
de prim contact cu AI.

## Ce face

- **Pe un profil LinkedIn** (`linkedin.com/in/...`): buton „Salvează prospect" +
  „Generează mesaj AI". Profilul ajunge în `/admin/prospecti`, tab „Din LinkedIn".
- **Pe o căutare de persoane** (`linkedin.com/search/results/people/...`): buton
  „Salvează toți de pe pagină" — capturează toate cardurile vizibile dintr-o dată.
  Cuvintele cheie le tastezi direct în căutarea LinkedIn (ex. „agenție PR București").

## Instalare (unpacked)

1. Deschide Chrome → `chrome://extensions`
2. Activează **Developer mode** (sus dreapta)
3. Click **Load unpacked** → selectează folderul `extension/`
4. Click pe iconița extensiei → completează:
   - **Cheie API** = valoarea `EXTENSION_API_KEY` din variabilele de mediu ale site-ului
   - **URL site** = `https://mediaexpress.ro` (sau alt domeniu)
   - **Țintă zilnică** = recomandat max 25
5. Salvează setările.

## Configurare server

Pe Railway (sau unde rulează site-ul) setează variabila de mediu:

```
EXTENSION_API_KEY=<un secret aleator lung>
```

Aceeași valoare o pui în popup-ul extensiei. Endpoint-urile folosite:
- `POST /api/extension/prospects` — salvează profile capturate
- `POST /api/extension/message` — generează mesaj LinkedIn cu AI

## Important — limite și risc

- Extensia citește doar paginile pe care **tu le navighezi manual**. Nu navighează
  singură și nu trimite mesaje automat.
- Mesajele generate de AI le **revizuiești și le trimiți tu** (copy → paste în
  caseta Message din LinkedIn). Trimiterea automată în masă încalcă ToS LinkedIn
  și duce la restricționarea contului — de aceea nu este inclusă.
- Recomandat: maxim ~20-25 acțiuni noi pe zi ca să rămâi sub radarul LinkedIn.

## Mentenanță

LinkedIn își schimbă des structura paginii. Dacă extensia nu mai citește corect
nume/funcție, selectoarele din `content.js` (`extractCurrentProfile`,
`extractSearchResults`) trebuie actualizate.
