#!/usr/bin/env python3
"""Genera i dati del configuratore: src/data/cfg.json, costi.json, province.json.

Testi normativi, riferimenti, voci di costo e coefficienti provinciali stanno qui, in chiaro,
così si possono rivedere e rigenerare. Poi: python3 build.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data")
NX = "https://www.normattiva.it/uri-res/N2Ls?urn:nir:"

# ---------------------------------------------------------------- riferimenti
REFS = {
    "dpcm2026": {"t": "DPCM 10/6/2026, art. 6", "n": "contributo 80%, massimali 1.500 € e 8.000 €",
                 "url": "https://www.mimit.gov.it/it/normativa/altri-atti-amministrativi/decreto-del-presidente-del-consiglio-dei-ministri-10-giugno-2026-nuovo-piano-incentivi-per-le-imprese-della-filiera-automotive"},
    "ddg0408": {"t": "DDG MIMIT 4/8/2026", "n": "spese ammissibili, documenti, erogazione",
                "url": "https://www.mimit.gov.it/it/normativa/decreti-direttoriali/decreto-direttoriale-4-agosto-2026-bonus-colonnine-domestiche-contributi-per-le-infrastrutture-di-ricarica"},
    "ddg1109": {"t": "DDG MIMIT 11/9/2026", "n": "apertura dello sportello 2026",
                "url": "https://www.mimit.gov.it/images/stories/normativa/DECRETO_APERTURA_COLONNINE_2026_signed-nf.pdf"},
    "faq": {"t": "FAQ MIMIT bonus colonnine domestiche", "n": "chiarimenti ufficiali",
            "url": "https://www.mimit.gov.it/it/assistenza/domande-frequenti/bonus-colonnine-domestiche-risposte-alle-domande-frequenti-faq"},
    "dm37": {"t": "DM 22/1/2008 n. 37, artt. 5 e 7", "n": "progetto e dichiarazione di conformità",
             "url": NX + "stato:decreto.ministeriale:2008-01-22;37"},
    "cc1122bis": {"t": "Codice civile, art. 1122-bis", "n": "ricarica del singolo condomino, preventiva notizia all'amministratore",
                  "url": NX + "stato:regio.decreto:1942-03-16;262~art1122bis"},
    "dl83": {"t": "DL 83/2012, art. 17-quinquies", "n": "maggioranze e diritto di installare in condominio",
             "url": NX + "stato:decreto.legge:2012-06-22;83~art17quinquies"},
    "cc1136": {"t": "Codice civile, artt. 1136 e 1137", "n": "maggioranze assembleari e impugnazione delle delibere",
               "url": NX + "stato:regio.decreto:1942-03-16;262~art1136"},
    "dpr151": {"t": "DPR 1/8/2011 n. 151, attività 75", "n": "autorimesse oltre 300 m² soggette ai controlli VVF",
               "url": NX + "presidente.repubblica:decreto:2011-08-01;151"},
    "vvf2018": {"t": "Circolare VVF DCPREV n. 2 del 5/11/2018 (testo coordinato 2022)", "n": "linee guida per le infrastrutture di ricarica",
                "url": "https://www.vigilfuoco.it/servizi-le-aziende-e-i-professionisti/prevenzione-incendi/testi-coordinati-di-prevenzione"},
    "dm2020": {"t": "DM 15/5/2020", "n": "regola tecnica antincendio delle autorimesse (RTV V.6)",
               "url": "https://www.gazzettaufficiale.it/eli/id/2020/05/26/20A02797/sg"},
    "cei648": {"t": "Norma CEI 64-8, sezione 722", "n": "alimentazione dei veicoli elettrici", "url": None},
    "cei61851": {"t": "Norma CEI EN 61851-1", "n": "sistemi di ricarica conduttiva (modo 3)", "url": None},
    "arera541": {"t": "Delibera ARERA 541/2020/R/eel, art. 4", "n": "requisiti dei dispositivi di ricarica",
                 "url": "https://www.arera.it/atti-e-provvedimenti/dettaglio/20/541-20"},
    "gse": {"t": "Elenchi GSE dei dispositivi idonei", "n": "elenchi GDC e NO GDC",
            "url": "https://www.gse.it/servizi-per-te/news/mobilita-elettrica-pubblicati-gli-elenchi-aggiornati-dei-dispositivi-di-ricarica-idonei-alla-sperimentazione-arera"},
    "arera_tic": {"t": "ARERA, TIC (Testo integrato connessioni)", "n": "contributi per nuove connessioni e aumenti di potenza",
                  "url": "https://www.arera.it/consumatori/elettricita"},
    "dpr380": {"t": "DPR 380/2001, art. 6", "n": "edilizia libera",
               "url": NX + "presidente.repubblica:decreto:2001-06-06;380~art6"},
    "dlgs257": {"t": "D.Lgs. 257/2016, art. 15", "n": "semplificazioni per i punti di ricarica",
                "url": NX + "stato:decreto.legislativo:2016-12-16;257~art15"},
    "dlgs42": {"t": "D.Lgs. 42/2004, artt. 21 e 146", "n": "beni culturali e paesaggio",
               "url": NX + "stato:decreto.legislativo:2004-01-22;42"},
    "dpr31": {"t": "DPR 31/2017", "n": "interventi esclusi o semplificati per l'autorizzazione paesaggistica",
              "url": NX + "presidente.repubblica:decreto:2017-02-13;31"},
}

def p(*xs): return "".join("<p>%s</p>" % x for x in xs)

# ---------------------------------------------------------------- testi delle regole
TESTI = {
    "delibera": {"t": "Delibera dell'assemblea condominiale",
        "d": p("L'installazione sulle parti comuni va approvata in assemblea, in prima o seconda convocazione, con la maggioranza dell'art. 1136, comma 2, c.c.: maggioranza degli intervenuti e almeno metà del valore dell'edificio.",
               "Per il bonus va caricata la delibera con la dichiarazione che non è stata impugnata entro i termini dell'art. 1137 c.c."),
        "r": ["dl83", "cc1136", "ddg0408"]},
    "comunicazione": {"t": "Preventiva notizia all'amministratore",
        "d": p("Il singolo condomino può installare a sue spese un punto di ricarica a uso privato, anche se i lavori interessano le parti comuni (passaggio di cavi, canaline). Deve però avvisare prima l'amministratore, che ne riferisce all'assemblea.",
               "Se servono opere sulle parti comuni e il condominio non delibera entro tre mesi dalla richiesta scritta, il condomino può procedere da solo. Non può prelevare corrente dal contatore condominiale senza un accordo: di solito si usa il contatore del proprio appartamento o un nuovo contatore dedicato."),
        "r": ["cc1122bis", "dl83"]},
    "inquilino": {"t": "Disponibilità dell'area se sei in affitto",
        "d": p("Il bonus richiede che il posto auto sia nella tua piena disponibilità. Tieni a portata di mano il contratto di locazione o comodato registrato, che comprenda il box o il posto auto.",
               "Conviene avere anche il consenso scritto del proprietario ai lavori, perché l'impianto resta nell'immobile. In condominio la preventiva notizia all'amministratore resta necessaria."),
        "r": ["dpcm2026", "faq"]},
    "vvf_a": {"t": "Autorimessa soggetta ai Vigili del Fuoco (categoria {cat})",
        "d": p("Oltre 300 m² l'autorimessa è l'attività 75 del DPR 151/2011, categoria A fino a 1.000 m². Le linee guida VVF del 2018 considerano un punto di ricarica realizzato secondo le loro indicazioni una modifica che non aggrava il rischio di incendio.",
               "In quel caso non serve una nuova SCIA. Un tecnico abilitato deve però verificare e attestare il rispetto delle linee guida, e l'amministratore conserva questa documentazione con il fascicolo antincendio. Se le linee guida non si possono rispettare, serve un aggiornamento della SCIA."),
        "r": ["dpr151", "vvf2018", "dm2020"]},
    "vvf_bc": {"t": "Autorimessa soggetta ai Vigili del Fuoco (categoria {cat})",
        "d": p("Sopra i 1.000 m² l'autorimessa è attività 75 in categoria B (fino a 3.000 m²) o C (oltre). Per queste categorie le modifiche che aggravano il rischio richiedono la valutazione del progetto da parte del Comando VVF prima dei lavori, poi la SCIA.",
               "Un impianto conforme alle linee guida VVF del 2018 di norma non aggrava il rischio. Serve comunque una valutazione firmata da un tecnico antincendio, da concordare con l'amministratore. Ogni nuova colonnina va inserita nel fascicolo e nel registro dei controlli."),
        "r": ["dpr151", "vvf2018", "dm2020"]},
    "vvf_noscia": {"t": "Prima va messa in regola l'autorimessa",
        "d": p("Un'autorimessa oltre 300 m² senza SCIA o CPI valido non è in regola. Installare punti di ricarica senza prima regolarizzarla espone a sanzioni e a problemi assicurativi.",
               "Chiedi all'amministratore di avviare la pratica: SCIA per la categoria A, valutazione del progetto e poi SCIA per le categorie B e C. Tempi e costi della regolarizzazione non sono compresi nel preventivo."),
        "r": ["dpr151", "dm2020"]},
    "vvf_misure": {"t": "Misure antincendio per la colonnina",
        "d": p("Ricarica in modo 3, con wallbox fissa conforme alla CEI EN 61851-1: niente presa domestica. Serve un comando di sgancio d'emergenza segnalato e facile da raggiungere, di solito vicino all'accesso dell'autorimessa, che tolga tensione a tutti i punti di ricarica.",
               "Il punto di ricarica non va posizionato lungo le vie d'esodo e va protetto dagli urti. Servono cartellonistica e un'eventuale integrazione dei mezzi di estinzione, secondo la valutazione del tecnico."),
        "r": ["vvf2018", "cei61851"]},
    "vvf_verifica": {"t": "Verifica la superficie dell'autorimessa",
        "d": p("Gli adempimenti dipendono dalla superficie coperta complessiva dell'autorimessa, comprese corsie e box: fino a 300 m² non è soggetta ai controlli VVF, oltre sì.",
               "Chiedi all'amministratore la superficie e se esiste la SCIA o il CPI antincendio, poi aggiorna la risposta qui sopra."),
        "r": ["dpr151"]},
    "vvf_le300": {"t": "Antincendio: nessuna pratica, ma buone regole",
        "d": p("Fino a 300 m² l'autorimessa non è soggetta ai controlli dei Vigili del Fuoco. Conviene comunque seguire le linee guida VVF del 2018: wallbox fissa in modo 3, protezione dagli urti, sgancio facile da raggiungere."),
        "r": ["dpr151", "vvf2018"]},
    "vvf_no": {"t": "Antincendio: nessun adempimento",
        "d": p("Posti all'aperto e box con accesso diretto dall'esterno, non collegati a un'autorimessa comune, di norma non rientrano nell'attività 75 del DPR 151/2011."),
        "r": ["dpr151"]},
    "progetto_inst": {"t": "Progetto a cura dell'installatore",
        "d": p("Sotto le soglie del DM 37/2008, art. 5, comma 2, il progetto lo redige il responsabile tecnico dell'impresa installatrice. Non serve un professionista iscritto all'albo."),
        "r": ["dm37"]},
    "progetto_prof": {"t": "Progetto firmato da un professionista",
        "d": "<p>Il progetto dell'impianto va redatto da un ingegnere o perito industriale iscritto all'albo (DM 37/2008, art. 5, comma 2). La spesa di progettazione rientra tra quelle ammesse al bonus.",
        "cond": "Lo prevede la lettera a) per tutte le utenze condominiali.</p>",
        "rischio": "Lo prevede la lettera d): un'autorimessa soggetta ai controlli VVF è un ambiente a maggior rischio in caso di incendio.</p>",
        "pot": "Lo prevede la lettera a): con la wallbox la potenza impegnata supera i 6 kW.</p>",
        "r": ["dm37"]},
    "dico": {"t": "Dichiarazione di conformità dell'impianto",
        "d": p("A fine lavori l'installatore abilitato rilascia la dichiarazione di conformità (DM 37/2008, art. 7) con i suoi allegati: progetto, relazione dei materiali e visura camerale. Va caricata nella domanda: senza, la domanda è improcedibile."),
        "r": ["dm37", "ddg0408"]},
    "cei": {"t": "Requisiti tecnici dell'impianto",
        "d": p("Linea dedicata alla wallbox, protezione da sovracorrenti per ogni punto di ricarica e differenziale di tipo A con rilevazione della corrente continua (6 mA) oppure di tipo B, come prevede la CEI 64-8, sezione 722. La wallbox deve essere conforme alla CEI EN 61851-1."),
        "esterno": p("All'aperto la wallbox deve avere un grado di protezione di almeno IP44 e resistenza agli urti adeguata. Le linee interrate vanno posate in tubo protettivo, con cavi idonei alla posa interrata."),
        "r": ["cei648", "cei61851"]},
    "gse": {"t": "Wallbox presente negli elenchi GSE",
        "d": p("Il modello deve risultare negli elenchi GSE dei dispositivi idonei (GDC o NO GDC) in vigore alla data della domanda e rispettare l'art. 4 della delibera ARERA 541/2020. Controlla il modello esatto prima di comprarlo: l'installatore lo attesta nel modello Invitalia."),
        "r": ["gse", "arera541", "ddg0408"]},
    "pod": {"t": "Nuovo contatore (POD) dedicato",
        "d": p("La richiesta di connessione si fa tramite un venditore di energia, che la inoltra al distributore locale. I contributi di allaccio sono fissati da ARERA e, per un nuovo POD, sono spese ammesse al bonus.",
               "Tempi tipici: da 2 a 8 settimane. Un contatore in un box diverso dall'abitazione di residenza di solito ha una tariffa per uso non residente, con quote fisse più alte."),
        "r": ["arera_tic", "dpcm2026"]},
    "aumento": {"t": "Aumento di potenza da {da} a {a} kW",
        "d": p("L'aumento si chiede al proprio venditore di energia. Il distributore applica un contributo per ogni kW in più, fissato da ARERA, più oneri amministrativi. Questa spesa non è tra quelle ammesse al bonus, che copre solo l'allaccio di un nuovo POD.",
               "Con la gestione dinamica della potenza spesso l'aumento si può evitare o ridurre."),
        "r": ["arera_tic"]},
    "potenza_insuff": {"t": "Potenza del contatore insufficiente",
        "d": p("Senza gestione dinamica, la wallbox alla massima potenza e i consumi di casa superano la potenza del contatore, che scatterebbe. Puoi aumentare la potenza, limitare la corrente della wallbox o aggiungere un sensore di gestione dinamica."),
        "r": []},
    "culturale": {"t": "Autorizzazione della Soprintendenza",
        "d": p("Su un bene culturale vincolato qualsiasi intervento, anche impiantistico, richiede l'autorizzazione della Soprintendenza (D.Lgs. 42/2004, art. 21, comma 4). Presenta la richiesta prima di iniziare i lavori. Il costo della pratica non è coperto dal bonus."),
        "r": ["dlgs42"]},
    "paesaggio": {"t": "Vincolo paesaggistico: verifica con il Comune",
        "d": p("Una wallbox all'interno di un box o non visibile dall'esterno di norma non richiede autorizzazione paesaggistica. Se resta all'aperto e visibile, verifica con l'ufficio tecnico del Comune se l'intervento è escluso (DPR 31/2017, allegato A) o richiede l'autorizzazione semplificata (allegato B)."),
        "r": ["dlgs42", "dpr31"]},
    "edilizia": {"t": "Nessun titolo edilizio",
        "d": p("L'installazione di un punto di ricarica privato è attività di edilizia libera: non servono permessi né comunicazioni al Comune, se non ci sono opere edili rilevanti. Scavi importanti o interventi sulle facciate possono richiedere una CILA."),
        "r": ["dpr380", "dlgs257"]},
}

DOCS = {
    "base": ["Documento d'identità e codice fiscale del richiedente",
             "Fatture elettroniche in formato <b>XML</b> (non basta il PDF)",
             "Estratti conto con i pagamenti tracciabili (bonifico, SCT o carta) da un conto intestato a te",
             "Dichiarazione di conformità dell'impianto (DM 37/2008)",
             "IBAN intestato al beneficiario e indirizzo PEC attivo"],
    "condominio": ["Codice fiscale del condominio",
                   "Delibera assembleare con dichiarazione di mancata impugnazione (art. 1137 c.c.)"],
    "amministratore": "Documento dell'amministratore e dichiarazione dei requisiti (art. 71-bis disp. att. c.c.)",
    "delegato": "Documento del condomino delegato e delega degli altri condòmini (condomìni fino a 8 partecipanti)",
    "attestazione": "Attestazione dei requisiti dell'infrastruttura di ricarica, modello Invitalia firmato dall'installatore",
    "pod": "Fattura o documento del distributore per l'attivazione del nuovo POD",
    "vvf": "Attestazione del tecnico antincendio sul rispetto delle linee guida VVF, da lasciare all'amministratore",
    "conservare": ["Originali di fatture, estratti conto e attestazioni: servono per i controlli a campione dopo il pagamento",
                   "Scheda tecnica della wallbox con il riferimento agli elenchi GSE"],
    "progetto": "Progetto dell'impianto firmato dal professionista",
}

# ---------------------------------------------------------------- costi (imponibile, media nazionale)
# lav = parte di manodopera nel valore tipico, adeguata con il coefficiente provinciale
def v(voce, mn, tip, mx, lav=0, iva=0.22, amm=True, cassa=0):
    return {"voce": voce, "min": mn, "tipico": tip, "max": mx, "lav": lav, "iva": iva, "ammissibile": amm, "cassa": cassa}

VOCI = {
    "wb_3_7": v("Wallbox 3,7 kW (modo 3)", 350, 450, 700),
    "wb_3_7_smart": v("Wallbox 3,7 kW con gestione dinamica", 450, 600, 900),
    "wb_7_4": v("Wallbox 7,4 kW (modo 3)", 450, 600, 900),
    "wb_7_4_smart": v("Wallbox 7,4 kW con gestione dinamica", 600, 800, 1200),
    "wb_11": v("Wallbox 11 kW trifase", 650, 900, 1400),
    "wb_22": v("Wallbox 22 kW trifase", 800, 1100, 1700),
    "dlm_sensore": v("Sensore di gestione dinamica della potenza", 60, 120, 200, 40),
    "protezioni_mono": v("Protezioni dedicate (magnetotermico e differenziale tipo A + 6 mA DC)", 150, 250, 400, 60),
    "protezioni_tri": v("Protezioni dedicate trifase (differenziale tipo B o A + 6 mA DC)", 250, 400, 650, 80),
    "spd": v("Scaricatore di sovratensione (SPD)", 80, 120, 200, 30),
    "linea_vista_mono": v("Linea dedicata a vista (al metro)", 10, 15, 22, 8),
    "linea_traccia_mono": v("Linea dedicata sottotraccia (al metro)", 18, 28, 40, 18),
    "linea_interrata_mono": v("Linea dedicata interrata (al metro)", 35, 55, 85, 35),
    "linea_vista_tri": v("Linea trifase a vista (al metro)", 14, 20, 30, 9),
    "linea_traccia_tri": v("Linea trifase sottotraccia (al metro)", 24, 35, 50, 20),
    "linea_interrata_tri": v("Linea trifase interrata (al metro)", 42, 65, 95, 38),
    "posa_wallbox": v("Posa, collegamento e collaudo della wallbox", 150, 250, 400, 230),
    "attraversamenti": v("Forature, attraversamenti e ripristini", 50, 100, 200, 80),
    "quadro_dedicato": v("Quadro elettrico dedicato ai punti di ricarica", 500, 900, 1500, 400),
    "progetto_singolo": v("Progetto dell'impianto (professionista)", 250, 400, 700, cassa=0.04),
    "progetto_cond": v("Progetto e direzione lavori (professionista)", 800, 1500, 2500, cassa=0.04),
    "vvf_misure": v("Sgancio d'emergenza, segnaletica e protezioni antiurto", 250, 450, 900, 200),
    "pratica_vvf_a": v("Valutazione e attestazione antincendio (tecnico, cat. A)", 600, 900, 1500, amm=False, cassa=0.04),
    "pratica_vvf_bc": v("Valutazione antincendio e pratica VVF (tecnico, cat. B/C)", 1200, 2000, 3500, amm=False, cassa=0.04),
    "diritti_vvf_a": v("Eventuali diritti dei Vigili del Fuoco", 0, 0, 300, iva=0, amm=False),
    "diritti_vvf_bc": v("Diritti VVF per valutazione progetto e SCIA", 300, 600, 1000, iva=0, amm=False),
    "nuovo_pod": v("Allaccio nuovo POD (contributi ARERA)", 250, 400, 800, iva=0.10),
    "aumento_potenza": v("Aumento di potenza (al kW, contributi ARERA)", 60, 72, 80, iva=0.10, amm=False),
    "pratica_soprintendenza": v("Pratica per la Soprintendenza (tecnico)", 300, 600, 1200, amm=False, cassa=0.04),
}
COSTI = {
    "iva_ammissibile": False,
    "nota_iva": ("Il contributo è calcolato sull'imponibile, IVA esclusa: le fonti indicano che imposte e tasse non sono spese ammesse, "
                 "quindi l'IVA resta a tuo carico. Imponibile e IVA sono indicati separatamente per ogni voce. "
                 "Allaccio e aumento di potenza hanno IVA al 10% per le utenze domestiche, i diritti VVF non hanno IVA. "
                 "Le parcelle dei professionisti comprendono il contributo previdenziale del 4%. Prezzi indicativi di mercato 2026: "
                 "non sostituiscono un preventivo."),
    "voci": VOCI,
}

# ---------------------------------------------------------------- province
# Coefficiente sulla manodopera rispetto alla media nazionale (1,00). Stima IlBioPane: livello regionale dei
# prezzari delle opere e del costo orario degli installatori, più una maggiorazione per le grandi aree urbane.
REG = {"Piemonte": 1.02, "Valle d'Aosta": 1.07, "Lombardia": 1.06, "Trentino-Alto Adige": 1.10, "Veneto": 1.03,
       "Friuli-Venezia Giulia": 1.02, "Liguria": 1.04, "Emilia-Romagna": 1.04, "Toscana": 1.03, "Umbria": 0.97,
       "Marche": 0.98, "Lazio": 1.00, "Abruzzo": 0.94, "Molise": 0.91, "Campania": 0.93, "Puglia": 0.92,
       "Basilicata": 0.91, "Calabria": 0.89, "Sicilia": 0.91, "Sardegna": 0.95}
P = """Piemonte|TO Torino +.05,VC Vercelli,NO Novara +.02,CN Cuneo,AT Asti -.01,AL Alessandria,BI Biella,VB Verbano-Cusio-Ossola
Valle d'Aosta|AO Aosta
Lombardia|VA Varese +.01,CO Como +.03,SO Sondrio -.01,MI Milano +.08,BG Bergamo +.02,BS Brescia +.01,PV Pavia -.02,CR Cremona -.02,MN Mantova -.02,LC Lecco +.01,LO Lodi -.01,MB Monza e della Brianza +.05
Trentino-Alto Adige|BZ Bolzano +.04,TN Trento
Veneto|VR Verona +.02,VI Vicenza,BL Belluno -.01,TV Treviso,VE Venezia +.04,PD Padova +.02,RO Rovigo -.04
Friuli-Venezia Giulia|UD Udine,GO Gorizia -.02,TS Trieste +.02,PN Pordenone
Liguria|IM Imperia,SV Savona,GE Genova +.03,SP La Spezia
Emilia-Romagna|PC Piacenza -.02,PR Parma +.01,RE Reggio Emilia,MO Modena +.01,BO Bologna +.05,FE Ferrara -.03,RA Ravenna,FC Forlì-Cesena -.01,RN Rimini +.01
Toscana|MS Massa-Carrara -.04,LU Lucca,PT Pistoia -.02,FI Firenze +.06,LI Livorno -.01,PI Pisa +.01,AR Arezzo -.02,SI Siena +.01,GR Grosseto -.02,PO Prato
Umbria|PG Perugia +.01,TR Terni -.02
Marche|PU Pesaro e Urbino,AN Ancona +.02,MC Macerata -.02,AP Ascoli Piceno -.02,FM Fermo -.03
Lazio|VT Viterbo -.05,RI Rieti -.06,RM Roma +.06,LT Latina -.03,FR Frosinone -.05
Abruzzo|AQ L'Aquila +.01,TE Teramo,PE Pescara +.02,CH Chieti
Molise|CB Campobasso,IS Isernia -.01
Campania|CE Caserta -.02,BN Benevento -.03,NA Napoli +.04,AV Avellino -.02,SA Salerno
Puglia|FG Foggia -.02,BA Bari +.04,TA Taranto,BR Brindisi -.01,LE Lecce,BT Barletta-Andria-Trani -.01
Basilicata|PZ Potenza,MT Matera
Calabria|CS Cosenza,CZ Catanzaro +.01,RC Reggio Calabria +.01,KR Crotone -.02,VV Vibo Valentia -.02
Sicilia|TP Trapani -.01,PA Palermo +.03,ME Messina +.01,AG Agrigento -.02,CL Caltanissetta -.02,EN Enna -.03,CT Catania +.03,RG Ragusa,SR Siracusa
Sardegna|SS Sassari +.01,NU Nuoro -.02,CA Cagliari +.03,OR Oristano -.02,SU Sud Sardegna -.03"""

def province():
    out = []
    for line in P.splitlines():
        reg, items = line.split("|")
        for it in items.split(","):
            parts = it.split(" ")
            delta = float(parts[-1]) if parts[-1][0] in "+-" else 0.0
            name = " ".join(parts[1:-1] if delta or parts[-1][0] in "+-" else parts[1:])
            out.append({"sigla": parts[0], "nome": name, "regione": reg, "coeff": round(REG[reg] + delta, 2)})
    assert len(out) == 107, len(out)
    return {"nota": "Coefficiente sulla manodopera rispetto alla media nazionale: stima basata sui prezzari regionali e sul costo orario degli installatori.", "list": out}

def main():
    cfg = {"refs": REFS, "testi": TESTI, "docs": DOCS}
    for name, obj in (("cfg.json", cfg), ("costi.json", COSTI), ("province.json", province())):
        json.dump(obj, open(os.path.join(OUT, name), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Scritti cfg.json, costi.json, province.json (107 province)")

if __name__ == "__main__":
    main()
