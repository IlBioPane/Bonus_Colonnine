# Bonus Colonnine 2026 · IlBioPane

Dashboard non ufficiale sul **bonus colonnine domestiche** (contributo MIMIT gestito da Invitalia): fondi residui in tempo reale, previsione di esaurimento, configuratore dei casi d'installazione con preventivo per provincia, guida alla domanda e riferimenti normativi. Tutto in un'unica pagina HTML.

© IlBioPane. Tutti i diritti riservati.

## Link

- **Pagina online:** https://ilbiopane.github.io/Bonus_Colonnine/
- **Dashboard:** https://ilbiopane.github.io/Bonus_Colonnine/condividi/Bonus%20Colonnine%202026.html
- **Scarica il file HTML:** pulsante "Scarica il file HTML" nella pagina online, oppure https://github.com/IlBioPane/Bonus_Colonnine/raw/main/condividi/Bonus%20Colonnine%202026.html


## Cosa contiene la pagina

- **Fondi residui in tempo reale.** Il residuo dello sportello 2026 (dotazione netta 14.475.000 €) è il dato ufficiale pubblicato da Invitalia. La pagina lo rilegge all'apertura e poi ogni 10 minuti. Se il collegamento non riesce mostra l'ultima istantanea inclusa nel file, con data e ora.
- **Previsione di esaurimento.** Scenari interattivi basati sul ritmo giornaliero delle domande, confrontati con gli sportelli 2023–2025. Le previsioni sono stime di IlBioPane calcolate a partire dal dato ufficiale dei fondi rimanenti.
- **Configuratore "Cosa ti serve e quanto costa".** Chiede chi presenta la domanda (proprietario, inquilino, condominio), dove si installa (posto all'aperto, box, box o posto in autorimessa), superficie dell'autorimessa, contatore, potenza della wallbox, posa del cavo, eventuali vincoli e provincia. Restituisce:
  - adempimenti obbligatori e da verificare: delibera o comunicazione condominiale, pratica antincendio, progetto, dichiarazione di conformità, elenchi GSE, POD, vincoli. Ogni voce ha il suo riferimento normativo;
  - documenti da caricare nella domanda e da conservare;
  - **preventivo di massima IVA inclusa**, con imponibile e IVA separati per ogni voce, il contributo stimato (80% dell'imponibile ammissibile, entro 1.500 € o 8.000 €) e la spesa a carico;
  - l'elenco di tutte le casistiche (68 combinazioni), filtrabile.
- **Verifica della colonnina.** Ricerca per marca, modello o codice negli elenchi GSE dei dispositivi idonei (GDC e NO GDC), requisito obbligatorio del bonus. La sezione compare quando gli elenchi ufficiali sono stati importati (vedi sotto).
- **Guida, documenti, erogazione, normativa e prospettive 2027–2030.**

Grafica: tema scuro "Electric Trust" dall'export Stitch *Dashboard UI Redesign* (Plus Jakarta Sans, Space Grotesk, JetBrains Mono, schede luminose, indice a pillola con sezione attiva, accento ciano `#00D2FF`). Dal mockup Stitch sono stati presi solo layout e stile: i dati sono quelli ufficiali, non quelli d'esempio del mockup.

## Struttura del repository

| Percorso | Contenuto |
|---|---|
| `index.html` | Pagina di benvenuto per GitHub Pages, con i link per aprire e scaricare la dashboard. |
| `condividi/Bonus Colonnine 2026.html` | **File da condividere.** Codice offuscato, dati codificati, si aggiorna in tempo reale quando viene aperto. |
| `dashboard.html` | Versione statica: solo istantanea dei dati, senza codice di collegamento. |
| `dev/Bonus Colonnine 2026 (sviluppo).html` | Versione leggibile per le prove. **Non va condivisa.** |
| `src/page.html` | Struttura, stili e testi della pagina. |
| `src/core.js` | Indicatori, grafici e previsioni. |
| `src/configurator.js` | Configuratore: domande, motore delle regole, preventivo, elenco delle casistiche. |
| `src/live.js` | Lettura in tempo reale del dato ufficiale. |
| `src/protect.js` | Filigrana e firma IlBioPane, deterrenti alla copia, controllo d'integrità della firma. |
| `src/data/*.json` | Istantanea, storico degli sportelli, regole, costi e coefficienti provinciali. |
| `tools/genera_dati_configuratore.py` | Fonte leggibile di testi normativi, riferimenti, voci di costo e coefficienti delle 107 province: rigenera `cfg.json`, `costi.json` e `province.json`. |
| `src/colonnine.js` | Ricerca negli elenchi GSE dei dispositivi idonei. |
| `tools/importa_elenchi_gse.py` | Importa gli elenchi GSE ufficiali (Excel, PDF o CSV) in `src/data/gse.json`. |
| `aggiorna_dati.py` | Aggiorna l'istantanea dal dato ufficiale e rigenera le pagine. |
| `build.py` | Assembla, codifica e offusca le tre versioni. |

## Come rigenerare

Servono Python 3.9+ e Node.js con npm. Alla prima esecuzione `build.py` installa da solo `javascript-obfuscator` nella cartella `.obf/`, che git ignora.

```bash
python3 tools/genera_dati_configuratore.py   # solo se hai cambiato regole, costi o province
python3 aggiorna_dati.py                      # aggiorna l'istantanea e rigenera tutto
# oppure, senza aggiornare l'istantanea:
python3 build.py
```

Prima di salvare, `build.py` controlla che nei file da condividere non compaiano in chiaro riferimenti tecnici alla fonte. Se ne trova uno, si ferma con un errore.

## Aggiornare gli elenchi GSE delle colonnine

Scarica gli elenchi GDC e NO GDC dalla pagina [GSE · Documenti](https://www.gse.it/servizi-per-te/rinnovabili-per-i-trasporti/agevolazioni-per-la-ricarica-dei-veicoli-elettrici/documenti), poi:

```bash
pip install openpyxl pdfplumber
python3 tools/importa_elenchi_gse.py --data "ottobre 2026" P541_Elenco_dispositivi_idonei_alla_sperimentazione_GDC.pdf P541_Elenco_dispositivi_idonei_alla_sperimentazione_NO_GDC.pdf
python3 build.py
```

Lo script legge i PDF del GSE (una pagina per costruttore), oppure Excel e CSV riconoscendo le colonne dalle intestazioni, e capisce dal nome del file se l'elenco è GDC o NO GDC (si può forzare con `GDC=file` o `NOGDC=file`).

## Come sono calcolati i preventivi

- Prezzi indicativi di mercato 2026 per materiali e manodopera, espressi come media nazionale (minimo, tipico, massimo).
- La quota di manodopera di ogni voce è moltiplicata per il coefficiente della provincia (da 0,87 a 1,14). Il coefficiente è una stima basata sui prezzari regionali e sul costo orario degli installatori.
- IVA al 22% su forniture e lavori. Allacci e aumenti di potenza hanno IVA al 10%, i diritti VVF non hanno IVA. Le parcelle dei professionisti includono il contributo previdenziale del 4%.
- Contributo: 80% dell'imponibile delle sole spese ammesse dal DDG 4/8/2026, entro il massimale. Non sono coperti l'aumento di potenza, le pratiche antincendio o per la Soprintendenza e i diritti. Secondo le FAQ l'IVA non è una spesa ammessa.

## Avvertenze

Dashboard **non ufficiale**. Il dato dei fondi residui è quello ufficiale di Invitalia. Previsioni, regole del configuratore e preventivi sono stime di IlBioPane, ricavate da quel dato e dalle fonti normative citate nella pagina: non hanno valore ufficiale e non sostituiscono il parere di un tecnico abilitato o un preventivo reale. Per requisiti, scadenze e importi fanno fede solo i provvedimenti di MIMIT e Invitalia.

## Licenza

Tutti i diritti riservati © IlBioPane. Vietata la riproduzione, anche parziale, di testi, dati, codice ed elaborazioni senza autorizzazione dell'autore.

Stato attuale: importati gli elenchi GSE di ottobre 2026, GDC (604 dispositivi, 93 costruttori) e NO GDC (38 dispositivi, 15 costruttori).
