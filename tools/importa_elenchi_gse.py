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
    "modello": ("modello", "nome commerciale", "denominazione", "model", "prodotto"),
    "codice": ("codice", "part number", "sku", "articolo", "versione", "code"),
    "potenza": ("potenza", "kw", "power"),
}

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
        if "marca" in cols and "modello" in cols:
            return i, cols
    return None, None

def read_rows(path):
    if path.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        for ws in wb.worksheets:
            yield [list(r) for r in ws.iter_rows(values_only=True)]
    elif path.lower().endswith(".pdf"):
        import pdfplumber
        rows = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                for t in page.extract_tables():
                    rows.extend(t)
        yield rows
    elif path.lower().endswith(".csv"):
        import csv
        with open(path, encoding="utf-8-sig") as f:
            sample = f.read(4096); f.seek(0)
            yield list(csv.reader(f, dialect=csv.Sniffer().sniff(sample, ";,\t")))
    else:
        sys.exit("Formato non supportato: %s" % path)

def parse(path, kind):
    items = []
    for rows in read_rows(path):
        h, cols = find_header(rows)
        if h is None: continue
        last_marca = ""
        for r in rows[h + 1:]:
            get = lambda k: clean(r[cols[k]]) if k in cols and cols[k] < len(r) else ""
            marca, modello = get("marca") or last_marca, get("modello")
            if not modello or modello.lower() in KEYS["modello"]: continue   # righe vuote o intestazioni ripetute
            last_marca = marca
            items.append([marca, modello, get("codice"), get("potenza"), kind])
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
