# Agenda Marzia

Un’agenda settimanale in italiano, pensata per iPhone e tablet. Questa versione presenta una grafica originale ispirata alle agende creative: carta avorio, dettaglio di rilegatura, etichetta decorativa e tre copertine selezionabili (Lavanda, Rosa, Salvia). Il richiamo a Zinnia è estetico: non include lo Studio, gli adesivi mobili o tutte le funzionalità di Zinnia. Nessuna installazione di dipendenze, nessun servizio a pagamento necessario per il codice dell’app.

## Utilizzo

- Vista completa da lunedì a domenica, con caselle dalle 09:00 alle 19:00. Gli appuntamenti sono mostrati nella casella dell’ora di inizio, non come blocchi proporzionali alla durata. Il dettaglio sotto la griglia mostra inizio e fine.
- Tocca una casella vuota per aggiungere un appuntamento. Tocca un appuntamento per aprire soltanto il suo foglio. Per aggiungere altri impegni a un’ora già occupata, seleziona il giorno e usa **Aggiungi**, impostando l’orario.
- Verde per lavoro, color pesca per personale.
- Scrivi con la tastiera oppure apri **Scrivi a mano** e usa il dito o la penna sul riquadro. La scrittura resta un disegno, non viene trascritta. Apple Pencil richiede un iPad compatibile, non funziona su iPhone.
- **Annulla ultimo tratto** riguarda solo il foglio aperto. **Salva** conferma le modifiche; **Annulla** mantiene la versione precedente.
- L’eliminazione richiede conferma e può essere annullata dalla notifica. Non sono presenti selezione multipla, trascinamento o pressione prolungata.
- È possibile indicare minuti e durata. L’ultimo orario di inizio è 19:00 e il termine massimo è 19:15; una durata che supera questo limite viene rifiutata.
- Gli appuntamenti sovrapposti richiedono una conferma e vengono mantenuti separati.

## Pubblicare su GitHub Pages

Nel pacchetto ZIP i file dell’app sono già nella cartella principale.

1. Estrai `agenda-marzia-github.zip`.
2. Su GitHub crea un repository, per esempio `agenda-marzia`.
3. Carica i file estratti nella cartella principale del repository: `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, le icone e il README. Non caricare soltanto lo ZIP.
4. Apri **Settings → Pages**.
5. In **Build and deployment**, scegli **Deploy from a branch**. Seleziona il ramo **main**, cartella **/(root)**, quindi **Save**.
6. Quando GitHub completa la pubblicazione, usa il link indicato nella pagina Pages.

La disponibilità di Pages per repository privati dipende dal piano GitHub. Un repository pubblico espone il codice dell’app, non gli appuntamenti che inserisci nel tuo browser. Non caricare i backup personali nel repository.

Se lavori invece con il progetto sorgente che contiene `dist/`, pubblica i contenuti di `dist/` nella root del repository GitHub o in `docs/` selezionando quella cartella nelle impostazioni Pages.

## Aprire su iPhone

Apri il link pubblicato con Safari. Dal menu **Condividi** scegli **Aggiungi alla schermata Home** e conferma. L’icona consentirà di riaprire l’agenda come una web app.

La settimana mantiene tutte e sette le colonne anche in verticale; i dettagli degli appuntamenti si leggono nella sezione del giorno sottostante. Ruota il dispositivo in orizzontale per avere più spazio.

## Contare le settimane

Nel riquadro **Parto da questo giorno** scegli la data iniziale. Puoi anche toccare il giorno nella settimana e premere **Usa giorno selezionato**.

- **Tra 3 settimane** porta allo stesso giorno 21 giorni dopo; **Tra 4 settimane** porta a 28 giorni dopo.
- I due pulsanti partono sempre dalla data indicata: premendoli ripetutamente non si sommano altre settimane.
- Le frecce della settimana sfogliano una pagina alla volta e mantengono lo stesso giorno della settimana. Il contatore mostra +1, +2, +3, +4 oppure le settimane precedenti con segno meno.
- **Torna alla partenza** riporta alla data iniziale. **Oggi** imposta la partenza alla data odierna.
- Il salto mette in evidenza il giorno e mostra gli appuntamenti già inseriti; non crea o sposta appuntamenti. Scegli una casella oppure **Aggiungi** per fissare il nuovo impegno.
- La data di partenza del conteggio vale per la sessione corrente; i tuoi appuntamenti restano salvati come prima.

## Dati e backup

Gli appuntamenti vengono salvati in `localStorage` su questo dispositivo e su questo indirizzo web. Non c’è un account dell’agenda né un server di sincronizzazione. Safari, la web app aggiunta alla Home e un altro browser possono avere archivi separati: scegli dove usare stabilmente l’agenda ed esporta un backup prima di passare a un’altra modalità.

Il menu **☰** permette di esportare un file JSON e importarlo su un altro dispositivo. L’importazione aggiunge gli identificativi nuovi e mantiene quelli già presenti, senza sovrascriverli; quindi non sincronizza le successive modifiche dello stesso appuntamento.

Cancellare i dati del browser, usare una sessione privata o cambiare indirizzo può rendere indisponibili i dati. Esporta backup regolari e conservali privatamente. Spostandoti dall’anteprima al sito GitHub devi esportare e importare il backup.

L’app include un service worker per conservare i file e consentire l’apertura offline dopo un primo caricamento riuscito su HTTPS. La disponibilità offline dipende anche dalla conservazione dei dati da parte del browser. Nessuna notifica o promemoria automatico è implementato.

## Verifiche

Sintassi JavaScript verificata. Verifiche logiche con ambiente DOM simulato: struttura della settimana, creazione, modifica isolata, eliminazione e ripristino, salvataggio di tratti, ricaricamento, limiti di orario e protezione da scritture concorrenti.

Non è stato effettuato un test visuale su browser né un test fisico su iPhone/iPad. Prima di affidarti all’agenda, prova sul tuo dispositivo un appuntamento di esempio, la chiusura e riapertura, una nota a mano e l’esportazione/importazione del backup.

## Riferimenti

- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Safari su iPhone: https://support.apple.com/guide/iphone/iphea86e5236/ios

## Struttura tecnica

HTML, CSS e JavaScript senza dipendenze. Tutti i percorsi sono relativi, quindi funzionano anche in un sottopercorso GitHub Pages. Per testare localmente, servi la cartella dell’app con un server HTTP; non aprire direttamente il file dal filesystem per verificare il service worker.
