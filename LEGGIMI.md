# Giappone 2026 — l’app del viaggio

Questa è una nuova app costruita dal programma di Roberto. Contiene 16 giornate dal 28 ottobre al 12 novembre 2026, 148 voci del programma, 28 prenotazioni e il budget originale a persona (2.828,49 €). Fonte: il foglio «Copia di Giappone 2026 - programma», letto il 2 ottobre 2026.

La grafica è originale. Il sito e le schermate di riferimento non sono stati leggibili dall’ambiente di lavoro, quindi non viene dichiarata una replica identica dell’app dell’amico.

## Provarla subito dal computer

Estrai questo ZIP e apri `index.html` nel browser. La copia separata `Giappone_2026.html` contiene l’app intera in un unico file: puoi aprirla senza estrarre cartelle.

## Modificare il programma

1. Premi **Modifica**, in alto.
2. Nella giornata scelta premi **Aggiungi** oppure **Modifica o sposta** sotto un’attività.
3. Cambia titolo, ora, giornata, note e collegamenti, poi premi **Salva modifiche**.
4. Puoi modificare anche titolo e note delle giornate, prenotazioni, budget e informazioni generali.
5. Il menu **⋯ → Annulla ultima modifica** recupera l’ultima modifica della sessione. Per eliminazioni e importazioni viene chiesta conferma nell’app.

Le modifiche sono salvate nel browser del dispositivo. Non si sincronizzano automaticamente con altri dispositivi né con Google Sheets. Cancellare i dati del browser può rimuoverle. La navigazione privata può non conservarle.

Per conservare le modifiche premi **⋯ → Esporta una copia del programma**. Otterrai un file JSON. Per portarle su un altro telefono o computer apri l’app e premi **Importa un programma**, scegliendo quella copia. L’importazione viene verificata prima di sostituire il programma locale.

Se condividi il link dell’app, gli amici vedono il programma iniziale pubblicato: le tue modifiche locali non cambiano il loro programma. Puoi condividere una copia JSON da importare. Una sincronizzazione comune richiede un servizio online aggiuntivo.

## Pubblicarla su GitHub Pages

1. Accedi a GitHub e crea un nuovo repository chiamato ad esempio `giappone-2026`.
2. Carica **tutti i file di questa cartella**, incluso `index.html`, nella radice del repository. Non caricare lo ZIP; non caricare solo il file HTML separato.
3. Apri **Settings → Pages**.
4. Nella sezione di pubblicazione scegli **Deploy from a branch**, poi il ramo **main** e la cartella **/(root)**. Salva.
5. Attendi la pubblicazione: GitHub mostrerà il link dell’app nella stessa pagina.

I nomi dei menu possono cambiare; guida ufficiale: https://docs.github.com/en/pages/quickstart

Quando pubblichi con GitHub Pages, chi ha accesso al sito può leggere programma, alloggi e budget inclusi. Il pacchetto non contiene password, credenziali, voucher privati o numeri di prenotazione.

## Usarla come app sull’iPhone

Dopo la pubblicazione apri il link in Safari, premi **Condividi → Aggiungi alla schermata Home**. Apri l’app almeno una volta con connessione: il programma e i file dell’app vengono memorizzati per la consultazione offline. Mappe, video e piattaforme di prenotazione richiedono internet. L’installazione da Home e Safari possono gestire archivi separati: importa la tua copia nell’app installata se necessario.

## Cose da verificare nel programma

- Volo di andata: 14:55 nel riepilogo, 15:05 nella griglia.
- Arrivo a Tokyo: 10:25 nel riepilogo, 11:20 nella griglia.
- Bus Takayama–Fuji: compaiono sia 08:30 sia 08:40; verifica il voucher.
- Bus Kanazawa–Shirakawa-go del 4 novembre: la nota dice prenotazione il 5 ottobre; verifica la data di apertura.
- Alloggio Takayama: tre notti nel budget valgono 125 € a persona, mentre Prenotazioni indica 174,14 €. I dati non sono stati sostituiti arbitrariamente.

Le date associate alle prenotazioni sono ricavate dalla posizione nel programma quando disponibili. Attività come Villa Katsura e «Tempio Sahioji» non hanno una giornata definita nel foglio: sono conservate tra le prenotazioni senza inventarne la collocazione.

Gli orari visualizzati sono gli slot della griglia originale. Quando il testo della voce contiene un orario più preciso o diverso, quel testo è conservato. Modifica l’orario dell’attività quando lo confermi dal biglietto.

Il budget usa i valori numerici completi del foglio, per evitare errori dovuti all’arrotondamento delle singole celle. Modificare una prenotazione non aggiorna automaticamente il budget previsto: le due sezioni descrivono aspetti diversi.

## Contenuto e verifiche

Il programma proviene dal foglio di Roberto. I collegamenti originali sono conservati; i pulsanti «Cerca su Maps» eseguono una ricerca testuale, senza fingere che il luogo sia stato verificato. Il cambio yen/euro è quello di riferimento del foglio e non è aggiornato in tempo reale. L’illustrazione di viaggio è un’immagine originale generata per questa app.

Verifiche effettuate: aggiunta/modifica/spostamento attività, salvataggio dopo ricaricamento, rifiuto URL non sicuri, modifica prenotazioni, filtri e ricerca, ricalcolo budget, conversione yen/euro, esportazione/importazione, rifiuto importazioni non valide, adattamento a 320 e 390 pixel, assenza di errori JavaScript. L’installazione reale su iPhone e il salvataggio offline dopo pubblicazione restano da verificare sul sito online.
