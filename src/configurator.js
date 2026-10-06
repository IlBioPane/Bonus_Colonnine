/* ---------- Configuratore: casistiche, adempimenti, documenti, preventivo ---------- */
const CFG = BP_DATA.cfg;            // regole, riferimenti e testi
const COST = BP_DATA.costi;         // modello di costo (imponibile, media nazionale)
const PROV = BP_DATA.province;      // coefficienti provinciali manodopera

const PLACES = {
  casa_esterno:      { label: "Posto auto all'aperto", sub: "casa indipendente, area privata", grp: "casa" },
  casa_box:          { label: "Box o garage privato", sub: "casa indipendente", grp: "casa" },
  cond_scoperto:     { label: "Posto auto scoperto", sub: "cortile del condominio", grp: "cond" },
  cond_box_esterno:  { label: "Box con accesso diretto dall'esterno", sub: "fila di box condominiali", grp: "cond" },
  cond_box_rimessa:  { label: "Box chiuso dentro un'autorimessa", sub: "autorimessa comune coperta o interrata", grp: "cond", rim: true },
  cond_posto_rimessa:{ label: "Posto auto in autorimessa", sub: "posto aperto in autorimessa comune coperta", grp: "cond", rim: true },
  comune_scoperto:   { label: "Area comune scoperta", sub: "cortile o parcheggio condominiale", grp: "comune" },
  comune_rimessa:    { label: "Autorimessa comune coperta", sub: "uso collettivo dei condòmini", grp: "comune", rim: true }
};
const RIM = {
  le300: { label: "Fino a 300 m²", sub: "non soggetta ai controlli VVF" },
  a:     { label: "Da 300 a 1.000 m²", sub: "attività 75, categoria A" },
  b:     { label: "Da 1.000 a 3.000 m²", sub: "attività 75, categoria B" },
  c:     { label: "Oltre 3.000 m²", sub: "attività 75, categoria C" },
  nonso: { label: "Non lo so", sub: "chiedi all'amministratore" }
};
const WB = {
  "3.7": { label: "3,7 kW", sub: "monofase", kw: 3.7, tri: false },
  "7.4": { label: "7,4 kW", sub: "monofase", kw: 7.4, tri: false },
  "11":  { label: "11 kW", sub: "trifase", kw: 11, tri: true },
  "22":  { label: "22 kW", sub: "trifase", kw: 22, tri: true }
};
const POT_STEPS = [3, 4.5, 6, 10, 15];
const POSA = {
  vista:     { label: "A vista in canalina", sub: "garage, autorimessa" },
  traccia:   { label: "Sottotraccia", sub: "dentro muri o pavimenti" },
  interrata: { label: "Interrata", sub: "scavo in cortile o giardino" }
};

const S = {
  chi: "proprietario", rappr: "amministratore", dove: "casa_box", rimessa: "le300", scia: "si",
  alim: "contatore_casa", pot: 3, potDopo: "auto", wb: "7.4", dlm: "si", dist: 15, posa: "vista",
  punti: 2, vincolo: "no", prov: "RM"
};

function placesFor(chi) { return Object.entries(PLACES).filter(([, p]) => chi === "condominio" ? p.grp === "comune" : p.grp !== "comune"); }

/* -- campi del modulo -- */
function chipGroup(name, legend, opts, hint, grid) {
  const items = opts.map(([v, o]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${String(S[name]) === String(v) ? "checked" : ""}><span>${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span></label>`).join("");
  return `<fieldset><legend>${esc(legend)}</legend>${hint ? `<p class="hint">${hint}</p>` : ""}<div class="chips${grid ? " grid" : ""}">${items}</div></fieldset>`;
}
function provOptions() {
  const byReg = {};
  for (const p of PROV.list) (byReg[p.regione] = byReg[p.regione] || []).push(p);
  return Object.keys(byReg).sort((a, b) => a.localeCompare(b, "it")).map((r) => `<optgroup label="${esc(r)}">${byReg[r].sort((a, b) => a.nome.localeCompare(b.nome, "it")).map((p) => `<option value="${p.sigla}" ${p.sigla === S.prov ? "selected" : ""}>${esc(p.nome)} (${p.sigla})</option>`).join("")}</optgroup>`).join("");
}
function renderForm() {
  const cond = S.chi === "condominio";
  const pl = PLACES[S.dove];
  let h = chipGroup("chi", "Chi presenta la domanda", [
    ["proprietario", { label: "Privato proprietario", sub: "o comproprietario" }],
    ["inquilino", { label: "Privato in affitto", sub: "o comodato" }],
    ["condominio", { label: "Condominio", sub: "colonnina sulle parti comuni" }]
  ]);
  if (cond) h += chipGroup("rappr", "Chi rappresenta il condominio", [
    ["amministratore", { label: "Amministratore", sub: "pro tempore" }],
    ["delegato", { label: "Condomino delegato", sub: "condomìni fino a 8 partecipanti" }]
  ]);
  h += chipGroup("dove", "Dove installi la colonnina", placesFor(S.chi), null, true);
  if (pl.rim) {
    h += chipGroup("rimessa", "Superficie coperta complessiva dell'autorimessa", Object.entries(RIM), "Tutta l'autorimessa, corsie e box compresi: la trovi nella SCIA antincendio o nel regolamento di condominio.", true);
    if (S.rimessa !== "le300") h += chipGroup("scia", "L'autorimessa ha già la SCIA o il CPI antincendio?", [["si", { label: "Sì" }], ["no", { label: "No" }], ["nonso", { label: "Non so" }]]);
  }
  if (cond) h += `<fieldset><legend>Numero di punti di ricarica</legend><input id="f_punti" type="number" min="1" max="20" value="${S.punti}" inputmode="numeric"></fieldset>`;
  const alimOpts = cond
    ? [["contatore_cond", { label: "Contatore delle parti comuni", sub: "utenza condominiale esistente" }], ["nuovo_pod", { label: "Nuovo contatore dedicato", sub: "nuovo POD" }]]
    : [["contatore_casa", { label: "Contatore di casa", sub: "POD esistente" }], ["nuovo_pod", { label: "Nuovo contatore dedicato", sub: "nuovo POD" }]];
  h += chipGroup("alim", "Da dove prendi la corrente", alimOpts, cond ? null : "Nei box lontani dall'appartamento spesso conviene un contatore dedicato: il suo allaccio rientra tra le spese del bonus.");
  if (S.alim !== "nuovo_pod") h += chipGroup("pot", "Potenza attuale del contatore", POT_STEPS.slice(0, 4).map((k) => [k, { label: (k === 10 ? "oltre 6" : nf1.format(k).replace(",0", "")) + " kW" }]));
  h += chipGroup("wb", "Potenza della wallbox", ["3.7", "7.4", "11", "22"].map((k) => [k, WB[k]]));
  h += chipGroup("dlm", "Gestione dinamica della potenza", [["si", { label: "Sì", sub: "la wallbox si adatta ai consumi di casa" }], ["no", { label: "No" }]]);
  const potList = S.alim === "nuovo_pod" ? POT_STEPS : POT_STEPS.filter((k) => k >= S.pot);
  h += `<fieldset><legend>${S.alim === "nuovo_pod" ? "Potenza del nuovo contatore" : "Potenza dopo i lavori"}</legend><select id="f_potDopo"><option value="auto" ${S.potDopo === "auto" ? "selected" : ""}>Suggerita: ${nf1.format(suggestPower(S)).replace(",0", "")} kW</option>${potList.map((k) => `<option value="${k}" ${String(S.potDopo) === String(k) ? "selected" : ""}>${nf1.format(k).replace(",0", "")} kW</option>`).join("")}</select></fieldset>`;
  h += `<div class="row2"><fieldset><legend>Distanza dal contatore</legend><input id="f_dist" type="number" min="1" max="200" value="${S.dist}" inputmode="numeric"><p class="hint" style="margin:4px 0 0">metri di cavo stimati</p></fieldset>`;
  h += `<fieldset><legend>Provincia</legend><select id="f_prov">${provOptions()}</select></fieldset></div>`;
  h += chipGroup("posa", "Come passa il cavo", Object.entries(POSA), null, true);
  h += chipGroup("vincolo", "Edificio o area sotto tutela", [["no", { label: "No" }], ["paesaggio", { label: "Vincolo paesaggistico" }], ["culturale", { label: "Bene culturale" }]]);
  $("cfgFields").innerHTML = h;
}

/* -- potenza suggerita -- */
function suggestPower(s) {
  const wb = WB[s.wb].kw, base = 1.5;
  if (s.alim === "nuovo_pod") { const need = s.dlm === "si" ? Math.min(wb, 6) : wb; return POT_STEPS.find((k) => k >= need) || 15; }
  if (s.dlm === "si") return Math.max(s.pot, s.pot < 4.5 ? 4.5 : s.pot);
  return POT_STEPS.find((k) => k >= wb + base && k >= s.pot) || 15;
}
function potAfter(s) { return s.potDopo === "auto" ? suggestPower(s) : Number(s.potDopo); }

/* -- motore delle regole -- */
function evaluate(s) {
  const cond = s.chi === "condominio";
  const pl = PLACES[s.dove];
  const rim = pl.rim ? s.rimessa : null;
  const soggetta = rim ? (rim === "le300" ? false : rim === "nonso" ? null : true) : false;
  const pot = potAfter(s);
  const ob = [], docsDomanda = [], docsPrima = [], refs = new Set(["dpcm2026", "ddg0408", "ddg1109", "dm37"]);
  const add = (lvl, t, d, r) => { ob.push({ lvl, t, d, r }); (r || []).forEach((x) => refs.add(x)); };
  const T = CFG.testi;

  // ammissibilità e massimale
  const max = cond ? 8000 : 1500;
  // condominio
  if (cond) {
    add("req", T.delibera.t, T.delibera.d, T.delibera.r);
    docsDomanda.push(...CFG.docs.condominio, s.rappr === "delegato" ? CFG.docs.delegato : CFG.docs.amministratore);
  } else if (pl.grp === "cond") {
    add("req", T.comunicazione.t, T.comunicazione.d, T.comunicazione.r);
  }
  if (s.chi === "inquilino") add("req", T.inquilino.t, T.inquilino.d, T.inquilino.r);

  // antincendio
  if (rim) {
    if (soggetta === true) {
      const cat = rim.toUpperCase();
      const k = rim === "a" ? "vvf_a" : "vvf_bc";
      add("req", T[k].t.replace("{cat}", cat), T[k].d, T[k].r);
      if (s.scia !== "si") add("req", T.vvf_noscia.t, T.vvf_noscia.d, T.vvf_noscia.r);
      add("req", T.vvf_misure.t, T.vvf_misure.d, T.vvf_misure.r);
      docsPrima.push(CFG.docs.vvf);
    } else if (soggetta === null) {
      add("chk", T.vvf_verifica.t, T.vvf_verifica.d, T.vvf_verifica.r);
    } else {
      add("chk", T.vvf_le300.t, T.vvf_le300.d, T.vvf_le300.r);
    }
  } else {
    add("ok", T.vvf_no.t, T.vvf_no.d, T.vvf_no.r);
  }

  // progetto impianto
  const unitDomestica = !cond && s.alim === "contatore_casa";
  const progProf = cond || (soggetta === true) || (unitDomestica && pot > 6) || (!cond && s.alim === "nuovo_pod" && pot > 6);
  if (progProf) add("req", T.progetto_prof.t, T.progetto_prof.d + (cond ? " " + T.progetto_prof.cond : soggetta ? " " + T.progetto_prof.rischio : " " + T.progetto_prof.pot), T.progetto_prof.r);
  else add("ok", T.progetto_inst.t, T.progetto_inst.d, T.progetto_inst.r);
  add("req", T.dico.t, T.dico.d, T.dico.r);
  add("req", T.cei.t, T.cei.d + (s.posa === "interrata" || pl.grp === "casa" && s.dove === "casa_esterno" || s.dove === "cond_scoperto" || s.dove === "comune_scoperto" ? " " + T.cei.esterno : ""), T.cei.r);
  add("req", T.gse.t, T.gse.d, T.gse.r);

  // alimentazione
  if (s.alim === "nuovo_pod") add("chk", T.pod.t, T.pod.d, T.pod.r);
  else if (s.alim === "contatore_casa" && pot > s.pot) add("chk", T.aumento.t.replace("{da}", nf1.format(s.pot).replace(",0", "")).replace("{a}", nf1.format(pot).replace(",0", "")), T.aumento.d, T.aumento.r);
  if (s.dlm === "no" && WB[s.wb].kw + 1.5 > pot) add("chk", T.potenza_insuff.t, T.potenza_insuff.d, []);

  // edilizia e tutela
  if (s.vincolo === "culturale") add("req", T.culturale.t, T.culturale.d, T.culturale.r);
  else if (s.vincolo === "paesaggio") add("chk", T.paesaggio.t, T.paesaggio.d, T.paesaggio.r);
  else add("ok", T.edilizia.t, T.edilizia.d, T.edilizia.r);

  docsDomanda.unshift(...CFG.docs.base);
  docsDomanda.push(CFG.docs.attestazione);
  if (s.alim === "nuovo_pod") docsDomanda.push(CFG.docs.pod);
  docsPrima.push(...CFG.docs.conservare);
  if (progProf) docsPrima.push(CFG.docs.progetto);

  return { cond, pl, rim, soggetta, pot, max, progProf, ob, docsDomanda, docsPrima, refs: [...refs] };
}

/* -- preventivo -- */
function provCoeff(sigla) { const p = PROV.list.find((x) => x.sigla === sigla); return p ? p.coeff : 1; }
function quote(s, ev, coeff) {
  const C = COST.voci, L = [];
  const n = ev.cond ? Math.max(1, Math.min(20, s.punti)) : 1;
  const wb = WB[s.wb], tri = wb.tri || (ev.pot >= 10);
  const line = (id, label, q, opts = {}) => {
    const c = C[id]; if (!c) return;
    const lab = (k) => (c[k] - (c.lav || 0) * (c[k] / c.tipico)) + (c.lav || 0) * (c[k] / c.tipico) * coeff;
    L.push({ id, label: label || c.voce, q, min: lab("min") * q, typ: lab("tipico") * q, max: lab("max") * q, iva: opts.iva ?? c.iva, cassa: c.cassa || 0, eleg: opts.eleg ?? (c.ammissibile !== false), nota: opts.nota || "" });
  };
  const wbId = "wb_" + s.wb.replace(".", "_") + (s.dlm === "si" && !wb.tri ? "_smart" : "");
  line(C[wbId] ? wbId : "wb_" + s.wb.replace(".", "_"), null, n);
  if (s.dlm === "si" && s.alim !== "nuovo_pod") line("dlm_sensore", null, 1);
  line(tri ? "protezioni_tri" : "protezioni_mono", null, n);
  line("spd", null, 1);
  const posaId = "linea_" + s.posa + (tri ? "_tri" : "_mono");
  line(posaId, `Linea dedicata, ${POSA[s.posa].label.toLowerCase()} (${s.dist} m)`, s.dist * (ev.cond ? Math.max(1, n * 0.6) : 1));
  line("posa_wallbox", null, n);
  if (s.posa !== "vista" || ev.rim) line("attraversamenti", null, 1);
  if (ev.cond) line("quadro_dedicato", null, 1);
  if (ev.progProf) line(ev.cond ? "progetto_cond" : "progetto_singolo", null, 1);
  if (ev.soggetta === true) {
    line("vvf_misure", null, 1);
    line(s.rimessa === "a" ? "pratica_vvf_a" : "pratica_vvf_bc", null, 1);
    if (s.rimessa !== "a") line("diritti_vvf_bc", null, 1);
  }
  if (s.alim === "nuovo_pod") line("nuovo_pod", `Nuovo POD da ${nf1.format(ev.pot).replace(",0", "")} kW`, 1, { nota: "" });
  else if (s.alim === "contatore_casa" && ev.pot > s.pot) line("aumento_potenza", `Aumento di potenza (+${nf1.format(ev.pot - s.pot).replace(",0", "")} kW)`, ev.pot - s.pot);
  if (s.vincolo === "culturale") line("pratica_soprintendenza", null, 1);
  // IVA e totali
  for (const l of L) for (const k of ["min", "typ", "max"]) {
    const imp = l[k] * (1 + l.cassa);
    l[k + "Imp"] = imp; l[k + "Iva"] = imp * l.iva; l[k + "Tot"] = imp * (1 + l.iva);
  }
  const sum = (k, f) => L.filter(f || (() => true)).reduce((a, l) => a + l[k], 0);
  const t = {};
  for (const k of ["min", "typ", "max"]) {
    t[k] = { imp: sum(k + "Imp"), iva: sum(k + "Iva"), tot: sum(k + "Tot"), eleg: sum(COST.iva_ammissibile ? k + "Tot" : k + "Imp", (l) => l.eleg) };
    t[k].contrib = Math.min(ev.max, t[k].eleg * 0.8);
    t[k].netto = t[k].tot - t[k].contrib;
  }
  return { L, t, n };
}

/* -- output -- */
const LV = { req: ["!", "req", "Obbligatorio"], chk: ["?", "chk", "Da verificare"], ok: ["✓", "ok", "Nessun obbligo"] };
function refLink(id) { const r = CFG.refs[id]; return r ? (r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${esc(r.t)}</a>` : esc(r.t)) : ""; }
function renderOut() {
  const ev = evaluate(S), coeff = provCoeff(S.prov), q = quote(S, ev, coeff);
  const pv = PROV.list.find((x) => x.sigla === S.prov);
  const vv = ev.soggetta === true ? ["crit", "Antincendio: pratica VVF"] : ev.soggetta === null ? ["warn", "Antincendio: da verificare"] : ["good", "Antincendio: nessuna pratica"];
  const pills = [
    ["good", "Ammissibile al bonus"],
    ["neutral", "Contributo 80%, massimo " + eur(ev.max)],
    vv,
    [ev.progProf ? "warn" : "good", ev.progProf ? "Progetto di un professionista" : "Progetto dell'installatore"]
  ];
  const ob = ev.ob.map((o) => `<li><span class="mk ${LV[o.lvl][1]}" aria-label="${LV[o.lvl][2]}">${LV[o.lvl][0]}</span><div><b>${esc(o.t)}</b>${o.d}${o.r && o.r.length ? `<span class="ref">${o.r.map(refLink).join(" · ")}</span>` : ""}</div></li>`).join("");
  const rows = q.L.map((l) => `<tr><td>${esc(l.label)}${l.eleg ? "" : '<span class="tag-no">non coperta dal bonus</span>'}${l.q > 1 && Number.isInteger(l.q) && !/\(\d+ m\)|kW\)/.test(l.label) ? ` <span class="muted small">× ${nf0.format(l.q)}</span>` : ""}</td><td class="n">${eur(l.typImp)}</td><td class="n">${l.iva ? nf0.format(l.iva * 100) + "%" : "fuori campo"}<br><span class="range">${eur(l.typIva)}</span></td><td class="n">${eur(l.typTot)}</td></tr>`).join("");
  const t = q.t;
  $("cfgOut").innerHTML = `
    <div class="verdict">${pills.map(([k, x]) => `<span class="pill ${k}">${esc(x)}</span>`).join("")}</div>
    <div class="out-card"><h3>Adempimenti per il tuo caso</h3><ul class="ob">${ob}</ul></div>
    <div class="out-card"><h3>Preventivo di massima · ${esc(pv ? pv.nome : S.prov)}</h3>
      <p class="small muted" style="margin:-4px 0 10px">Valori tipici, manodopera adeguata alla provincia (coefficiente ${nf2.format(coeff)} rispetto alla media nazionale).</p>
      <div class="table-wrap"><table class="quote"><thead><tr><th>Voce</th><th class="n">Imponibile</th><th class="n">IVA</th><th class="n">Totale</th></tr></thead><tbody>${rows}
      <tr class="sub"><td>Totale imponibile</td><td class="n">${eur(t.typ.imp)}</td><td class="n">${eur(t.typ.iva)}</td><td class="n"></td></tr>
      <tr class="tot"><td>Totale IVA inclusa</td><td class="n"></td><td class="n">di cui IVA ${eur(t.typ.iva)}</td><td class="n">${eur(t.typ.tot)}</td></tr>
      <tr class="contrib"><td>Contributo stimato (80% delle spese ammissibili${COST.iva_ammissibile ? ", IVA inclusa" : ""}, max ${eur(ev.max)})</td><td class="n"></td><td class="n"></td><td class="n">− ${eur(t.typ.contrib)}</td></tr>
      <tr class="net"><td>Spesa a tuo carico</td><td class="n"></td><td class="n"></td><td class="n">${eur(t.typ.netto)}</td></tr>
      </tbody></table></div>
      <p class="small" style="margin:10px 0 0">Forbice realistica: <b class="num">${eur(t.min.tot)} – ${eur(t.max.tot)}</b> IVA inclusa (IVA ${eur(t.min.iva)} – ${eur(t.max.iva)}), con un contributo tra ${eur(t.min.contrib)} e ${eur(t.max.contrib)}.</p>
      <p class="small muted" style="margin:6px 0 0">${COST.nota_iva}</p>
    </div>
    <div class="grid2" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div class="out-card"><h3>Da caricare nella domanda</h3><ol class="docs">${ev.docsDomanda.map((d) => `<li>${d}</li>`).join("")}</ol></div>
      <div class="out-card"><h3>Da ottenere e conservare</h3><ul class="docs">${ev.docsPrima.map((d) => `<li>${d}</li>`).join("")}</ul></div>
    </div>
    <div class="out-card"><h3>Riferimenti normativi del tuo caso</h3><ul class="docs">${ev.refs.map((r) => `<li>${refLink(r)}${CFG.refs[r] && CFG.refs[r].n ? ` <span class="muted small">${esc(CFG.refs[r].n)}</span>` : ""}</li>`).join("")}</ul></div>`;
}

/* -- database di tutte le casistiche -- */
function enumerateCases() {
  const out = [];
  for (const chi of ["proprietario", "inquilino", "condominio"]) {
    for (const [dove, pl] of placesFor(chi)) {
      const rims = pl.rim ? Object.keys(RIM) : [null];
      for (const rimessa of rims) for (const alim of chi === "condominio" ? ["contatore_cond", "nuovo_pod"] : ["contatore_casa", "nuovo_pod"]) {
        const s = { ...S, chi, dove, rimessa: rimessa || "le300", scia: "si", alim, pot: 3, potDopo: "auto", wb: "7.4", dlm: "si", dist: 15, posa: pl.rim ? "vista" : (dove.includes("scoperto") || dove === "casa_esterno" ? "interrata" : "vista"), punti: 2, vincolo: "no" };
        const ev = evaluate(s), q = quote(s, ev, 1);
        out.push({ s, ev, q });
      }
    }
  }
  return out;
}
let DB = null;
function renderDB() {
  if (!DB) DB = enumerateCases();
  const f = { chi: $("dbChi")?.value || "", dove: $("dbDove")?.value || "", vvf: $("dbVvf")?.value || "" };
  const chiL = { proprietario: "Privato proprietario", inquilino: "Privato in affitto", condominio: "Condominio" };
  if (!$("dbChi")) {
    $("dbFilters").innerHTML = `<select id="dbChi" aria-label="Filtra per richiedente"><option value="">Tutti i richiedenti</option>${Object.entries(chiL).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><select id="dbDove" aria-label="Filtra per luogo"><option value="">Tutti i luoghi</option>${Object.entries(PLACES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select><select id="dbVvf" aria-label="Filtra per antincendio"><option value="">Antincendio: tutti</option><option value="si">Con pratica VVF</option><option value="no">Senza pratica VVF</option></select>`;
    $("dbFilters").addEventListener("change", renderDB);
    $("dbHead").innerHTML = `<tr><th>Caso</th><th>Antincendio</th><th>Progetto</th><th>Condominio</th><th>Alimentazione</th><th class="n">Costo tipico</th><th class="n">A carico</th></tr>`;
  }
  const rows = DB.filter((r) => (!f.chi || r.s.chi === f.chi) && (!f.dove || r.s.dove === f.dove) && (!f.vvf || (f.vvf === "si" ? r.ev.soggetta === true : r.ev.soggetta !== true)));
  $("dbCount").textContent = `· ${nf0.format(DB.length)} combinazioni, ${nf0.format(rows.length)} mostrate`;
  $("dbRows").innerHTML = rows.map(({ s, ev, q }) => {
    const pl = PLACES[s.dove];
    const vvf = ev.soggetta === true ? `<span class="lvl req">Pratica VVF cat. ${s.rimessa.toUpperCase()}</span>` : ev.soggetta === null ? `<span class="lvl chk">Da verificare</span>` : ev.rim ? `<span class="lvl chk">Buone pratiche</span>` : `<span class="lvl ok">Nessuna</span>`;
    const cnd = s.chi === "condominio" ? `<span class="lvl req">Delibera</span>` : pl.grp === "cond" ? `<span class="lvl chk">Comunicazione</span>` : `<span class="lvl ok">—</span>`;
    return `<tr><td><b>${esc(chiL[s.chi])}</b><br>${esc(pl.label)}${ev.rim ? `<br><span class="muted small">${esc(RIM[s.rimessa].label)}</span>` : ""}</td><td>${vvf}</td><td>${ev.progProf ? '<span class="lvl chk">Professionista</span>' : '<span class="lvl ok">Installatore</span>'}</td><td>${cnd}</td><td>${s.alim === "nuovo_pod" ? "Nuovo POD" : s.alim === "contatore_cond" ? "Contatore comune" : "Contatore di casa"}</td><td class="n">${eur(q.t.typ.tot)}</td><td class="n">${eur(q.t.typ.netto)}</td></tr>`;
  }).join("");
}

/* -- interazione -- */
function cfgRender() { renderForm(); renderOut(); }
$("cfgForm").addEventListener("change", (e) => {
  const el = e.target; if (!el.name && !el.id) return;
  if (el.name) {
    S[el.name] = el.name === "pot" ? Number(el.value) : el.value;
    if (el.name === "chi") { const first = placesFor(S.chi)[0][0]; if (!placesFor(S.chi).some(([k]) => k === S.dove)) S.dove = first; S.alim = S.chi === "condominio" ? "contatore_cond" : "contatore_casa"; }
    if (["chi", "dove", "alim", "pot", "wb", "dlm"].includes(el.name)) S.potDopo = "auto";
    if (el.name === "dove" && !PLACES[S.dove].rim) S.posa = S.dove.includes("scoperto") || S.dove === "casa_esterno" ? "interrata" : "vista";
  } else if (el.id === "f_potDopo") S.potDopo = el.value;
  else if (el.id === "f_prov") S.prov = el.value;
  else if (el.id === "f_dist") S.dist = Math.max(1, Math.min(200, Math.round(Number(el.value) || 1)));
  else if (el.id === "f_punti") S.punti = Math.max(1, Math.min(20, Math.round(Number(el.value) || 1)));
  cfgRender();
});
$("cfgForm").addEventListener("submit", (e) => e.preventDefault());
$("dbBox").addEventListener("toggle", () => { if ($("dbBox").open) renderDB(); });
cfgRender();
