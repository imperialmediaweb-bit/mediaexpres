# Notițe reclame și decizii (actualizat 23.10.2026)

Citește asta la începutul fiecărei sesiuni noi.

## Reguli de lucru
- Nu schimba reclame, site-uri sau emailuri fără „da" explicit. Spune exact ce schimbi.
- Înainte de orice campanie nouă: arată ce urmărește, publicul și bugetul. După creare, verifică în Facebook/Google și arată.
- Răspunsuri scurte, în română. Mesajele pentru clienți: într-un bloc de cod, gata de copiat, cu „dumneavoastră".
- Imaginile pentru clienți: fără sume și bugete.

## Conturi
- Contul de reclame 1177839782858400 (…8400) e al Parohiei „Sf. Cuv. Teodora de la Sihla" – Botoșani, plătit cu cardul Revolut al parohiei. DOAR reclame pentru parohie. Niciodată Sarami, MediaExpres, clienți sau alte pagini.
- 24.10: reclama parohiei (ad 120251969497140623) e OPRITĂ de Facebook: „Numărul de WhatsApp este obligatoriu". S-a oprit după ce Claude a schimbat publicul (setările vechi au fost puse înapoi). claude-ads NU are acces la pagina parohiei (147207128482281), deci nu o poate repara: trebuie debifat WhatsApp din reclamă în Ads Manager de cineva cu acces la pagină, sau aprobată cererea Legio de acces la pagină de un admin al portofoliului parohiei. Nu mai modifica nimic la ea fără „da".
- Facebook: cont reclame act_1111402126360867, pixel 1200982607382394 (MediaExpres, Sarami, Media Chief). Utilizatorul de sistem „claude-ads" are nevoie de acces la fiecare pagină ca să creeze reclame.
- Google Ads prin Supermetrics (plătit, Starter, echipa „Team aionitoaie.ionut31"): 7420901091 (MediaExpres) și 6730806837 (Savyn / Clinica Sf. Gheorghe).
- Search Console prin Supermetrics (botosaniexpres@gmail.com): toate ziarele + mediaexpress.ro.

## MediaExpres
- Facebook: rulează „mediaexpres" cu reclama „Oferta 500 — direct pe formular" (comanda/noua?pachet=promo-50), 35 lei/zi.
- WhatsApp (campania 120251006942640297): OPRITĂ. A adus 2 clienți pe ~19 lei (cel mai bun rezultat). Oprită pentru că mesajele vin pe numărul personal. De mutat WhatsApp-ul paginii pe 0758 169 388, apoi de repornit.
- Google: căutarea „mediaexpres" oprită. Bannere „Display Bannere 500 lei": plafon 3 lei/clic, grupul „Optimizat Google – fără cuvinte cheie" OPRIT (clicuri din jocuri). Grupul cu cuvinte cheie rulează, dar ~1.800 clicuri, 0 comenzi. De decis: excludere aplicații (manual în Google Ads) sau oprire.
- Pagina Oferta 500: scoasă căsuța DA/PA Moz (commit d5fd651 pe claude/setup-resend-email-YUOys). De confirmat că a apărut live.
- Vânzarea din 19.10 (SEO Digital, 500 lei) a venit din Google organic. Stripe salvează sursa în metadata „sursa".
- Linkul de raport admin (/api/admin/comenzi?...) cere parolă (401), nu se trimite clienților. Raportul public are forma /raport/<token>?tot=1.

## Media Chief
- Nu rulează nimic. Facebook (vizite, apoi comenzi) și Google SUA: 0 vânzări, oprite.
- În cod: plata întâi și articolul întâi au fost încercate amândouă, niciuna n-a vândut.

## Sarami
- Reclama duce direct pe sarami.ro/oferta-video/brief/. Data de final mutată la 31.10.
- WhatsApp a mai fost încercat la Sarami și n-a mers.
- Idee în lucru: audit gratuit al canalului (YouTube/TikTok/Instagram/Facebook); creare + editare video; la Premium, clipul e promovat într-un articol în 50 de ziare. De ales: audit manual pe WhatsApp sau pagină automată sarami.ro/audit. Formular în Facebook (recomandat) sau pe site.

## EXPO BT (Botoșani Expres)
- Campania nouă pe acoperire, tot județul, 17 interese + patroni și administratori de pagini, buton „Sună acum", 25 lei/zi până pe 30.10. Cea veche (pe apeluri) e oprită.

## Clienți promovați pe România Expres
- OpticShop: postare promovată 3 zile, 7 lei/zi, până pe 25.10. Din 50 de articole, doar 1 publicat; restul se programează (~5/săpt.).
- Paula Seling / Sublime Events (comanda #47): postare promovată 3 zile, până pe 26.10, București, Timișoara, Brașov, Sibiu. Promovarea se trece în comandă doar din formularul admin.

## Clinica Sf. Gheorghe (contul Savyn)
- ~20 clicuri/zi, ~2,3 lei/clic. Butonul „Sună" există; Google n-a numărat apeluri.
- Codul de credit 1.500 lei aplicat; trebuie cheltuiți 1.500 lei până pe 18.12.2026.

## Alte lucruri deschise
- Contul OpenAI (Imperial Media): ~$12/zi, $231 în octombrie față de limita de $10 (doar alertă). De pus limită fixă și de aflat cine consumă (probabil rescrierea articolelor în rețea).
