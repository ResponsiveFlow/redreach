# Red Reach — Landing di prenotazione lotti (test di mercato)

## Contesto
Red Reach (playredreach.com) è uno strategico mobile alla Clash of Clans ambientato su Marte: ogni giocatore ha una base su una mappa condivisa, i vicini sono persone vere e puoi attaccare solo chi è nel raggio del tuo radar.
Il gioco NON esiste ancora. Questa landing serve solo a validare l'interesse: le persone arrivano dai video Instagram/TikTok, scelgono una zona di Marte, prenotano uno slot sulla mappa e lo condividono.
Mai promettere date di uscita. Si vende il lotto riservato e la community.

## Da dove parte questo codice
Il repository è una copia della landing di un altro progetto (Delibra). Prima di modificare, fai un piano: cosa resta, cosa cambia, cosa si elimina.

**Tenere (riadattando testi e colori):**
- Stack: Next.js + TypeScript + Tailwind, Supabase, Cloudflare Workers via @opennextjs/cloudflare
- Registrazione: email con codice OTP a 6 cifre come metodo principale; Google solo fuori dai browser in-app di Instagram/TikTok/Facebook (rilevati dallo user agent)
- Tracciamento sorgente (src, ref, ig) in cookie e sul profilo
- Link d'invito personale, carta condivisibile generata lato client (1080x1920), pagina /admin con metriche ed export CSV
- Privacy policy e cookie banner minimi

**Eliminare:**
- Nazioni Nord/Centro/Sud, comuni, lotti a scaglioni per città, voto della capitale, tutto ciò che riguarda Delibra

## Lingue
Due lingue: italiano e inglese (due profili social separati). Lingua da `?lang=it|en`, poi dalla lingua del browser, default inglese. Tutti i testi in un file di traduzioni, nessuna stringa fissa nei componenti.

## Flusso utente
1. **Landing**: hook ("2056. The first colony ship has landed on Mars. Claim your plot." / "2056. La prima nave coloniale è atterrata su Marte. Prenota il tuo lotto."), contatore live dei coloni per zona, CTA.
2. **Scelta della zona**: Ice / Metal / Sun (Ghiaccio / Metalli / Sole). Testo: ogni zona è più ricca di una risorsa, ma tutte le risorse esistono ovunque; altre si scopriranno con la tecnologia.
3. **Mappa della zona**: griglia di esagoni (SVG, zoom e pan su mobile).
   - Slot occupati: bandierina con lo username scelto dall'utente (o "Colonist #N").
   - Slot vicini ai giacimenti: evidenziati come più ricchi.
   - Slot liberi: toccabili; tocco = anteprima ("Slot 4-17 · 2 hex from deposit").
   - Lo slot scelto resta bloccato per 10 minuti mentre l'utente si registra.
4. **Registrazione** (OTP o Google) + scelta del nome da colono (unico, filtrato contro parolacce).
5. **Pagina colono**: "Colonist #N · <zona> · slot X-Y", carta condivisibile, link invito "Land next to me" che apre la mappa centrata sullo slot di chi invita, posizione sulla mappa con i vicini.

## Mappa e settori
- Ogni zona ha settori di esagoni (es. 30x40). Si apre un nuovo settore quando quello attivo supera una soglia di riempimento (configurabile in admin).
- Il numero totale di slot non si mostra mai.
- Ogni settore ha 1-3 giacimenti; la "ricchezza" di uno slot dipende dalla distanza dal giacimento più vicino.
- Coordinate stabili (zona, settore, q, r) perché diventeranno i lotti veri al lancio del gioco.

## Modello dati (indicativo)
- `colonists`: id (= auth user), email, colonist_name (unico), zone (ice|metal|sun), sector_id, q, r, colonist_number, ig_username, tiktok_username, ref_code (univoco), referred_by, source, lang, created_at
- `sectors`: id, zone, index, cols, rows, is_open, deposits (json)
- `slot_holds`: zone, sector_id, q, r, session_id, expires_at (blocco temporaneo)
- Vincolo unico su (sector_id, q, r). Assegnazione dello slot in transazione lato DB: niente doppie prenotazioni.
- Contatori e mappa pubblica (slot occupati + nome colono, senza email) tramite view o RPC in sola lettura. RLS: ognuno legge e scrive solo il proprio profilo.

## Admin
Iscritti per giorno, zona, sorgente e lingua; riempimento dei settori; inviti per utente; conversione visita → prenotazione; apertura manuale di un settore; export CSV (servirà anche per mostrare gli username dei coloni nei video).

## Design
Palette del logo: fondo #120B14, rosso Marte #E2522B / #C7401F / #A9351A / #7A2412, sabbia #FFD3A8, arancio #F4925A, radar #5EF2D2. Zone: ghiaccio #9ED8F5, metalli #B9C2D0, sole #FFC24B. Titoli in Chakra Petch 700, testi in Inter. Stile low-poly, mobile-first, pagine leggere (molti arrivano dalla webview di Instagram).

## Fuori scope
Gameplay, combattimenti, risorse, alleanze, app mobile. DM automatici su Instagram: si gestiscono esternamente con ManyChat.

## Ordine di lavoro
1. Piano delle modifiche rispetto al codice di Delibra
2. Pulizia di ciò che non serve + sistema di traduzioni IT/EN
3. Migrazioni SQL: colonists, sectors, slot_holds, vincoli, RLS, view/RPC, seed dei primi settori
4. Landing → zona → mappa esagonale → blocco slot → registrazione → nome colono
5. Pagina colono, carta condivisibile, link "Land next to me"
6. Admin
7. Deploy su Cloudflare e collegamento di playredreach.com
