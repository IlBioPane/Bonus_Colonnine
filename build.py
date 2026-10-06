#!/usr/bin/env python3
"""Genera le due versioni della dashboard Bonus Colonnine 2026 (BioPane).

- condividi/Bonus Colonnine 2026 - BioPane.html  file da condividere: si aggiorna in tempo reale, codice offuscato
- dashboard.html                                 versione Artifact (istantanea, senza codice di collegamento)
- dev/Bonus Colonnine 2026 (sviluppo).html        versione leggibile per le prove
"""
import base64, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OBF = os.environ.get("BP_OBF_DIR", os.path.join(ROOT, ".obf"))
KEY = b"BioPane\xb7BonusColonnine2026"

def rd(p): return open(os.path.join(SRC, p), encoding="utf-8").read()
def js(p): return json.load(open(os.path.join(SRC, "data", p), encoding="utf-8"))

def pack(obj):
    raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    x = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(raw))
    return base64.b64encode(x).decode()

def data_js():
    series = js("series.json"); series.pop("2026", None)
    data = {"snapshot": js("snapshot.json"), "history": series, "cfg": js("cfg.json"), "costi": js("costi.json"), "province": js("province.json")}
    k = list(KEY)
    return ("function __bpU(s){const k=%s;const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i)^k[i%%k.length];return JSON.parse(new TextDecoder().decode(u));}\n"
            "const BP_DATA=__bpU(\"%s\");\n") % (json.dumps(k), pack(data))

def bundle(live):
    parts = [data_js(), rd("protect.js")]
    if live: parts.append(rd("live.js"))
    parts += [rd("core.js"), rd("configurator.js")]
    return '(() => {\n"use strict";\n' + "\n".join(parts) + "\n})();\n"

def ensure_obfuscator():
    """Installa javascript-obfuscator nella cartella .obf (ignorata da git) se manca."""
    if os.path.exists(os.path.join(OBF, "node_modules/.bin/javascript-obfuscator")): return
    os.makedirs(OBF, exist_ok=True)
    subprocess.run(["npm", "install", "--prefix", OBF, "--no-audit", "--no-fund", "javascript-obfuscator@4"], check=True)

def obfuscate(code, hard=False):
    ensure_obfuscator()
    tmp_in = os.path.join(OBF, "in.js"); tmp_out = os.path.join(OBF, "out.js")
    open(tmp_in, "w", encoding="utf-8").write(code)
    cmd = [os.path.join(OBF, "node_modules/.bin/javascript-obfuscator"), tmp_in, "--output", tmp_out,
           "--compact", "true", "--self-defending", "true", "--disable-console-output", "true",
           "--control-flow-flattening", "true", "--control-flow-flattening-threshold", "0.4",
           "--string-array", "true", "--string-array-encoding", "rc4" if hard else "base64", "--string-array-threshold", "1",
           "--string-array-rotate", "true", "--string-array-shuffle", "true", "--string-array-wrappers-count", "2",
           "--split-strings", "true", "--split-strings-chunk-length", "6",
           "--identifier-names-generator", "hexadecimal", "--rename-globals", "false", "--target", "browser"]
    if hard:
        cmd += ["--debug-protection", "true", "--debug-protection-interval", "2000", "--transform-object-keys", "true"]
    subprocess.run(cmd, check=True, capture_output=True)
    return open(tmp_out, encoding="utf-8").read()

def full_doc(body):
    return ('<!doctype html><html lang="it"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="author" content="BioPane"><meta name="copyright" content="BioPane">'
            '</head><body>\n' + body + "\n</body></html>\n")

def check_clean(name, html):
    low = html.lower()
    for bad in ("powerbi", "analysis.windows", "resourcekey", "querydata", "m_f domande", "3eb2efb7"):
        if bad in low:
            sys.exit("ERRORE: %s contiene in chiaro '%s'" % (name, bad))

def main():
    page = rd("page.html")
    os.makedirs(os.path.join(ROOT, "condividi"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "dev"), exist_ok=True)
    share = full_doc(page.replace("/*__APP__*/", obfuscate(bundle(True), hard=True)))
    check_clean("file da condividere", share)
    open(os.path.join(ROOT, "condividi", "Bonus Colonnine 2026 - BioPane.html"), "w", encoding="utf-8").write(share)
    art = page.replace("/*__APP__*/", obfuscate(bundle(False)))
    check_clean("dashboard.html", art)
    open(os.path.join(ROOT, "dashboard.html"), "w", encoding="utf-8").write(art)
    dev = full_doc(page.replace("/*__APP__*/", bundle(True)))
    open(os.path.join(ROOT, "dev", "Bonus Colonnine 2026 (sviluppo).html"), "w", encoding="utf-8").write(dev)
    print("Da condividere: %d KB · Artifact: %d KB · sviluppo: %d KB" % (len(share) // 1024, len(art) // 1024, len(dev) // 1024))

if __name__ == "__main__":
    main()
