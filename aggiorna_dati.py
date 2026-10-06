#!/usr/bin/env python3
"""Aggiorna src/data/snapshot.json leggendo il contatore pubblico e rigenera le pagine.

Uso:  python3 aggiorna_dati.py
Poi ripubblica dashboard.html (versione condivisa).
"""
import json, os, ssl, subprocess, sys, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.abspath(__file__))
API = "https://wabi-north-europe-k-primary-api.analysis.windows.net/public/reports/"
KEY = "3eb2efb7-fe65-4b1d-a434-d7ff7ef8c6c6"
DATASET = "b6427bd6-d939-467e-8ea3-3c8d82091cde"
MODEL = 3284199
LINEA, STATO, SPORTELLO = "2026", "Presentata", "PD"
ROME = ZoneInfo("Europe/Rome")

def _ssl_ctx():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass
    for p in ("/etc/ssl/cert.pem", "/usr/local/etc/openssl/cert.pem", "/opt/homebrew/etc/openssl@3/cert.pem"):
        if os.path.exists(p):
            return ssl.create_default_context(cafile=p)
    return ssl.create_default_context()
SSL = _ssl_ctx()

def col(s, p): return {"Column": {"Expression": {"SourceRef": {"Source": s}}, "Property": p}, "Name": f"{s}.{p}"}
def mea(s, p): return {"Measure": {"Expression": {"SourceRef": {"Source": s}}, "Property": p}, "Name": f"{s}.{p}"}
def inf(s, p, vals): return {"Condition": {"In": {"Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": s}}, "Property": p}}], "Values": [[{"Literal": {"Value": f"'{v}'"}}] for v in vals]}}}
FROM = [{"Name": "f", "Entity": "M_F Fondo", "Type": 0}, {"Name": "l", "Entity": "M_F CFG Linea_Anno", "Type": 0}, {"Name": "d", "Entity": "M_F Domande", "Type": 0}]

def query(frm, select, where, big=False):
    binding = {"Primary": {"Groupings": [{"Projections": list(range(len(select)))}]}, "Version": 1}
    if big: binding["DataReduction"] = {"DataVolume": 4, "Primary": {"Window": {"Count": 30000}}}
    body = {"version": "1.0.0", "queries": [{"Query": {"Commands": [{"SemanticQueryDataShapeCommand": {"Query": {"Version": 2, "From": frm, "Select": select, "Where": where}, "Binding": binding}}]}, "QueryId": "", "ApplicationContext": {"DatasetId": DATASET, "Sources": [{"ReportId": ""}]}}], "cancelQueries": [], "modelId": MODEL}
    req = urllib.request.Request(API + "querydata?synchronous=true", data=json.dumps(body).encode(), headers={"X-PowerBI-ResourceKey": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60, context=SSL) as r:
        ds = json.load(r)["results"][0]["result"]["data"]["dsr"]["DS"][0]
    return decode(ds)

def decode(ds):
    dm = ds.get("PH", [{}])[0].get("DM0", [])
    if not dm: return []
    S = dm[0]["S"]; n = len(S); dicts = ds.get("ValueDicts", {}); prev = [None] * n; out = []
    for row in dm:
        R, N, C = row.get("R", 0), row.get("Ø", 0), row.get("C", []); ci = 0; v = []
        for i in range(n):
            if R & (1 << i): v.append(prev[i])
            elif N & (1 << i): v.append(None)
            else:
                x = C[ci]; ci += 1
                if S[i].get("DN") and isinstance(x, int): x = dicts[S[i]["DN"]][x]
                v.append(x)
        prev = v; out.append(v)
    return out

def main():
    W = [inf("l", "LineaIntervento_Anno", [LINEA]), inf("d", "Col_DescrizioneStato", [STATO]), inf("d", "tipoSportello", [SPORTELLO])]
    W2 = [inf("l", "LineaIntervento_Anno", [LINEA]), inf("d", "tipoSportello", [SPORTELLO])]
    res, imp, dom = [float(x) for x in query(FROM, [mea("f", "Mis_Residuo"), mea("f", "Mis_Impegnato"), mea("d", "Mis_Ndomande")], W)[0]]
    states = {r[0]: (int(r[1] or 0), float(r[2] or 0)) for r in query(FROM, [col("d", "Col_DescrizioneStato"), mea("d", "Mis_Ndomande"), mea("f", "Mis_Impegnato")], W2)}
    rows = query(FROM, [col("d", "DataInvioDomanda"), mea("d", "Mis_Ndomande"), mea("f", "Mis_Impegnato")], W, big=True)
    days, last = {}, 0
    for t, n, a in rows:
        if not t or not n: continue
        last = max(last, t)
        k = datetime.fromtimestamp(t / 1000, ROME).strftime("%Y-%m-%d")
        d = days.setdefault(k, [k, 0, 0.0]); d[1] += int(n); d[2] += float(a or 0)
    snap = {"refreshedAt": int(datetime.now().timestamp() * 1000), "lastSubmission": last, "fondo": res + imp, "residuo": res, "impegnato": imp, "domande": int(dom),
            "bozze": {"n": states.get("Compilata", (0, 0))[0], "a": states.get("Compilata", (0, 0))[1]},
            "inCompilazione": {"n": states.get("In compilazione", (0, 0))[0], "a": states.get("In compilazione", (0, 0))[1]},
            "daily": [[d[0], d[1], round(d[2])] for d in sorted(days.values())]}
    json.dump(snap, open(os.path.join(ROOT, "src", "data", "snapshot.json"), "w"), separators=(",", ":"))
    print("Residuo %.0f € · %d domande · ultima domanda %s" % (res, dom, datetime.fromtimestamp(last / 1000, ROME).strftime("%d/%m/%Y %H:%M")))
    subprocess.run([sys.executable, os.path.join(ROOT, "build.py")], check=True)

if __name__ == "__main__":
    main()
