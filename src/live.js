/* ---------- Fonte dati: contatore Power BI pubblico ---------- */
const PBI = {
  api: "https://wabi-north-europe-k-primary-api.analysis.windows.net/public/reports/",
  key: "3eb2efb7-fe65-4b1d-a434-d7ff7ef8c6c6",
  dataset: "b6427bd6-d939-467e-8ea3-3c8d82091cde",
  modelId: 3284199,
  linea: "2026", stato: "Presentata", sportello: "PD"
};
const PBI_HK = ["X", "PowerBI", "ResourceKey"].join("-");
function pbiHeaders(json) { const h = { [PBI_HK]: PBI.key }; if (json) h["Content-Type"] = "application/json"; return h; }
const REFRESH_MS = 10 * 60 * 1000;

/* ---------- Power BI: query e decodifica ---------- */
const col = (s, p) => ({ Column: { Expression: { SourceRef: { Source: s } }, Property: p }, Name: s + "." + p });
const mea = (s, p) => ({ Measure: { Expression: { SourceRef: { Source: s } }, Property: p }, Name: s + "." + p });
const inF = (s, p, vals) => ({ Condition: { In: { Expressions: [{ Column: { Expression: { SourceRef: { Source: s } }, Property: p } }], Values: vals.map((v) => [{ Literal: { Value: "'" + v + "'" } }]) } } });
const FROM = [{ Name: "f", Entity: "M_F Fondo", Type: 0 }, { Name: "l", Entity: "M_F CFG Linea_Anno", Type: 0 }, { Name: "d", Entity: "M_F Domande", Type: 0 }];

async function fetchJSON(url, opts, ms = 15000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { ...opts, signal: ctl.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function pbi(from, select, where, big) {
  const binding = { Primary: { Groupings: [{ Projections: select.map((_, i) => i) }] }, Version: 1 };
  if (big) binding.DataReduction = { DataVolume: 4, Primary: { Window: { Count: 30000 } } };
  const body = { version: "1.0.0", queries: [{ Query: { Commands: [{ SemanticQueryDataShapeCommand: { Query: { Version: 2, From: from, Select: select, Where: where }, Binding: binding } }] }, QueryId: "", ApplicationContext: { DatasetId: PBI.dataset, Sources: [{ ReportId: "" }] } }], cancelQueries: [], modelId: PBI.modelId };
  const j = await fetchJSON(PBI.api + "querydata?synchronous=true", { method: "POST", headers: pbiHeaders(true), body: JSON.stringify(body) });
  const ds = j?.results?.[0]?.result?.data?.dsr?.DS?.[0];
  if (!ds) throw new Error("Risposta Power BI inattesa");
  return decode(ds);
}
function decode(ds) {
  const dm = ds.PH?.[0]?.DM0 || []; if (!dm.length) return [];
  const S = dm[0].S, n = S.length, dicts = ds.ValueDicts || {}; let prev = new Array(n).fill(null); const out = [];
  for (const row of dm) {
    const R = row.R || 0, N = row["Ø"] || 0, C = row.C || []; let ci = 0; const v = [];
    for (let i = 0; i < n; i++) {
      if (R & (1 << i)) v.push(prev[i]);
      else if (N & (1 << i)) v.push(null);
      else { let x = C[ci++]; if (S[i].DN && typeof x === "number") x = dicts[S[i].DN][x]; v.push(x); }
    }
    prev = v; out.push(v);
  }
  return out;
}
/* Legge dal report ufficiale i filtri della pagina del contatore, così questa dashboard segue eventuali cambi di sportello */
async function syncFilters() {
  try {
    const j = await fetchJSON(PBI.api + PBI.key + "/modelsAndExploration?preferReadOnlySession=true", { headers: pbiHeaders(false) }, 20000);
    if (j?.models?.[0]?.id) PBI.modelId = j.models[0].id;
    const docRaw = JSON.parse(j.exploration.explorationContent.explorationDocument || "{}");
    const pages = Object.values(docRaw?.pages?.pages || {});
    const home = pages.find((p) => /home/i.test(p?.content?.displayName || "")) || pages[0];
    for (const f of home?.content?.filterConfig?.filters || []) {
      const prop = f.field?.Column?.Property; const val = f.filter?.Where?.[0]?.Condition?.In?.Values?.[0]?.[0]?.Literal?.Value;
      if (!val) continue; const clean = val.replace(/^'|'$/g, "");
      if (prop === "LineaIntervento_Anno") PBI.linea = clean;
      if (prop === "Col_DescrizioneStato") PBI.stato = clean;
    }
  } catch (e) { /* si tengono i filtri noti */ }
}
async function loadLive() {
  await syncFilters();
  const W = [inF("l", "LineaIntervento_Anno", [PBI.linea]), inF("d", "Col_DescrizioneStato", [PBI.stato]), inF("d", "tipoSportello", [PBI.sportello])];
  const W2 = [inF("l", "LineaIntervento_Anno", [PBI.linea]), inF("d", "tipoSportello", [PBI.sportello])];
  const [tot, ref, states, daily] = await Promise.all([
    pbi(FROM, [mea("f", "Mis_Residuo"), mea("f", "Mis_Impegnato"), mea("d", "Mis_Ndomande")], W),
    pbi([{ Name: "r", Entity: "DataRefresh", Type: 0 }], [col("r", "Value")], []),
    pbi(FROM, [col("d", "Col_DescrizioneStato"), mea("d", "Mis_Ndomande"), mea("f", "Mis_Impegnato")], W2),
    pbi(FROM, [col("d", "DataInvioDomanda"), mea("d", "Mis_Ndomande"), mea("f", "Mis_Impegnato")], W, true)
  ]);
  const [res, imp, dom] = tot[0].map(Number);
  const byDay = new Map(); let lastT = 0;
  for (const [t, n, a] of daily) { if (!t || !(n > 0)) continue; if (t > lastT) lastT = t; const k = isoRome.format(new Date(t)); const o = byDay.get(k) || [k, 0, 0]; o[1] += n; o[2] += Number(a || 0); byDay.set(k, o); }
  const st = (name) => { const r = states.find((x) => x[0] === name); return { n: r ? Number(r[1]) : 0, a: r ? Number(r[2] || 0) : 0 }; };
  return {
    refreshedAt: Number(ref?.[0]?.[0]) || Date.now(), lastSubmission: lastT || Date.now(),
    fondo: res + imp, residuo: res, impegnato: imp, domande: dom,
    bozze: st("Compilata"), inCompilazione: st("In compilazione"),
    daily: [...byDay.values()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([d, n, a]) => [d, n, Math.round(a)])
  };
}

