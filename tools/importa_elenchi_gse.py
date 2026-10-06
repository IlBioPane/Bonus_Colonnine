#!/usr/bin/env python3
"""Importa gli elenchi GSE dei dispositivi di ricarica idonei (GDC e NO GDC) in src/data/gse.json.

Scarica i due elenchi ufficiali (Excel o PDF) dalla pagina GSE "Documenti" della sezione
"Agevolazioni per la ricarica dei veicoli elettrici", poi:

    python3 tools/importa_elenchi_gse.py --data 21/09/2026 elenco_GDC.xlsx elenco_NO_GDC.pdf
    python3 build.py

Il tipo di elenco si ricava dal nome del file ("NO GDC" / "NO_GDC" / "NOGDC" oppure "GDC");
si può forzare con il prefisso GDC= o NOGDC=, ad es. NOGDC=elenco.pdf.
Le colonne si riconoscono dalle intestazioni (costruttore/marca, modello, codice, potenza).
Dipendenze: openpyxl per .xlsx, pdfplumber per .pdf (pip install openpyxl pdfplumber).
"""
import argparse, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "gse.json")

KEYS = {
    "marca": ("costruttore", "produttore", "marca", "fabbricante", "ragione sociale", "manufacturer"),
    "modello": ("modello", "nome commerciale", "denominazione", "model"),
    "versione": ("versione", "codice", "part number", "sku", "articolo", "code"),
    "potenza": ("potenza", "kw", "power"),
    "alim": ("alimentazione", "fasi"),
    "esterno": ("dispositivo esterno",),
}
# Formato degli elementi in gse.json: [marca, modello, versione, potenza, elenco, alimentazione, dispositivo esterno]

def kind_of(path):
    base = os.path.basename(path).upper().replace("_", " ").replace("-", " ")
    if re.search(r"\bNO ?GDC\b", base): return "NO GDC"
    if "GDC" in base: return "GDC"
    sys.exit("Non capisco se %s è l'elenco GDC o NO GDC: rinominalo o usa GDC=/NOGDC=" % path)

def clean(x):
    return re.sub(r"\s+", " ", str(x if x is not None else "")).strip()

def find_header(rows):
    for i, r in enumerate(rows[:40]):
        low = [clean(c).lower() for c in r]
        cols = {}
        for k, words in KEYS.items():
            for j, h in enumerate(low):
                if j not in cols.values() and any(w in h for w in words):
                    cols[k] = j; break
        if "modello" in cols:
            return i, cols
    return None, None

def read_rows(path):
    if path.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        for ws in wb.worksheets:
            yield [list(r) for r in ws.iter_rows(values_only=True)], ""
    elif path.lower().endswith(".pdf"):
        import pdfplumber
        # elenchi GSE: una pagina per costruttore, con il nome sopra la riga "SITO INTERNET"
        brand = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                lines = [clean(l) for l in (page.extract_text() or "").splitlines()]
                for j, l in enumerate(lines):
                    if l.upper().startswith("SITO INTERNET") and j > 0:
                        brand = lines[j - 1]; break
                for t in page.extract_tables():
                    yield t, brand
    elif path.lower().endswith(".csv"):
        import csv
        with open(path, encoding="utf-8-sig") as f:
            sample = f.read(4096); f.seek(0)
            yield list(csv.reader(f, dialect=csv.Sniffer().sniff(sample, ";,\t"))), ""
    else:
        sys.exit("Formato non supportato: %s" % path)

def parse(path, kind):
    items = []
    cols = width = None
    last_brand = last_mod = ""
    for rows, brand in read_rows(path):
        if not rows: continue
        h, found = find_header(rows)
        if h is not None:
            cols, width, start = found, len(rows[h]), h + 1
        elif cols and len(rows[0]) == width:
            start = 0                                   # tabella che prosegue nella pagina dopo, senza intestazione
        else:
            continue                                    # es. riquadro "sito internet / riferimenti"
        if brand != last_brand: last_mod = ""
        last_brand = brand
        for r in rows[start:]:
            get = lambda k: clean(r[cols[k]]) if k in cols and cols[k] < len(r) else ""
            nd = lambda x: "" if x in ("-", "–") else x
            marca = get("marca") or brand
            modello = get("modello") or last_mod                             # celle unite: il modello vale per le righe sotto
            if not modello or modello.lower() in KEYS["modello"] or not any(clean(c) for c in r): continue
            last_mod = modello
            items.append([marca, modello, nd(get("versione")), get("potenza"), kind, get("alim"), nd(get("esterno"))])
    if not items:
        sys.exit("Nessuna riga riconosciuta in %s: controlla le intestazioni delle colonne" % path)
    return items

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", required=True, help="data di aggiornamento degli elenchi, es. 21/09/2026")
    ap.add_argument("files", nargs="+")
    a = ap.parse_args()
    items = []
    for f in a.files:
        kind = None
        if "=" in f and f.split("=", 1)[0].upper() in ("GDC", "NOGDC"):
            k, f = f.split("=", 1); kind = "GDC" if k.upper() == "GDC" else "NO GDC"
        part = parse(f, kind or kind_of(f))
        print("%s: %d dispositivi (%s)" % (os.path.basename(f), len(part), part[0][4]))
        items += part
    seen, uniq = set(), []
    for it in items:
        key = tuple(x.lower() for x in it)
        if key not in seen: seen.add(key); uniq.append(it)
    uniq.sort(key=lambda r: (r[0].lower(), r[1].lower()))
    json.dump({"aggiornato": a.data, "items": uniq}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("Scritto %s: %d dispositivi" % (os.path.relpath(OUT, ROOT), len(uniq)))

if __name__ == "__main__":
    main()
