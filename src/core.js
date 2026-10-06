/* ---------- Dati (iniettati in fase di build) ---------- */
const SNAPSHOT = BP_DATA.snapshot;
const HISTORY = BP_DATA.history;
const WINDOWS = [
  { key: "2022", label: "Sportello 2022", short: "2022", note: "spese dal 4/10 al 31/12/2022", per: "19/10/2023 – 2/11/2023", fondo: 40000000, ammesse: 561, concesso: 642504 },
  { key: "2023", label: "Sportello 2023", short: "2023", note: "spese dal 1/1 al 23/11/2023", per: "9/11/2023 – 23/11/2023", fondo: 39520000, ammesse: 4992, concesso: 5759167 },
  { key: "BS2023", label: "Riapertura 2023", short: "Riapertura 2023", note: "stessa dotazione 2023", per: "15/2/2024 – 14/3/2024", fondo: 39520000, prev: 5759167, ammesse: 939, concesso: 1102504 },
  { key: "BS2024", label: "Sportello 2024", short: "2024", note: "chiuso in anticipo il 22/11/2024 con circa 3,7 mln € ancora disponibili", per: "8/7/2024 – 22/11/2024", fondo: 17369496, ammesse: 11485, concesso: 13621036 },
  { key: "S2024", label: "2° sportello 2024", short: "2° sportello 2024", note: "residui del 2024", per: "29/4/2025 – 27/5/2025", fondo: 3629088, ammesse: 1204, concesso: 1420370 },
  { key: "2026", label: "Sportello 2026", short: "2026 (in corso)", note: "installazioni completate dal 26/6 al 31/12/2026", per: "22/9/2026 – 31/1/2027, o fino a esaurimento" }
];
const CHIUSURA = "2027-01-31";
const FUTURE = [
  { anno: 2027, lordo: 15000000, note: "installazioni completate nel 2027" },
  { anno: 2028, lordo: 15000000, note: "installazioni completate nel 2028" },
  { anno: 2029, lordo: 15000000, note: "installazioni completate nel 2029" },
  { anno: 2030, lordo: 8000000, note: "solo installazioni fino al 31/3/2030" }
];

/* ---------- Utilità ---------- */
const $ = (id) => document.getElementById(id);
const nf0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });
const nf1 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (v) => nf0.format(Math.round(v)) + " €";
const mln = (v, d = 2) => (d === 1 ? nf1 : nf2).format(v / 1e6) + " mln €";
const ROME = "Europe/Rome";
const fmtDay = new Intl.DateTimeFormat("it-IT", { timeZone: ROME, day: "numeric", month: "short" });
const fmtLong = new Intl.DateTimeFormat("it-IT", { timeZone: ROME, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtDT = new Intl.DateTimeFormat("it-IT", { timeZone: ROME, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const isoRome = new Intl.DateTimeFormat("sv-SE", { timeZone: ROME });
const dayMs = 864e5;
const d2s = (d) => d.toISOString().slice(0, 10);
const s2d = (s) => new Date(s + "T12:00:00Z");
const addDays = (s, n) => d2s(new Date(s2d(s).getTime() + n * dayMs));
const showDay = (s) => fmtDay.format(s2d(s));
const showLong = (s) => fmtLong.format(s2d(s));

function easter(y) { const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return new Date(Date.UTC(y,mo-1,da,12)); }
const FIXED_HOL = ["01-01","01-06","04-25","05-01","06-02","08-15","11-01","12-08","12-25","12-26"];
function dayKind(s) {
  const d = s2d(s), wd = d.getUTCDay(), md = s.slice(5);
  const em = d2s(new Date(easter(d.getUTCFullYear()).getTime() + dayMs));
  if (wd === 0 || FIXED_HOL.includes(md) || s === em) return "fest";
  if (wd === 6) return "sab";
  return "fer";
}

/* ---------- Modello di previsione ---------- */
function rateProfile(daily, lastDay) {
  // ultimi 7 giorni completi, esclusi i primi 2 giorni di apertura (picco iniziale)
  const complete = daily.filter((d) => d[0] < lastDay).slice(2);
  const last7 = complete.slice(-7);
  const avg = (k) => { const xs = last7.filter((d) => dayKind(d[0]) === k).map((d) => d[2]); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const fer = avg("fer") ?? 400000; const sab = avg("sab") ?? fer * 0.45; const fest = avg("fest") ?? fer * 0.22;
  const week7 = last7.reduce((a, d) => a + d[2], 0) / Math.max(1, last7.length);
  return { fer, sab, fest, week7 };
}
function project(data, opt) {
  const { residuo, daily } = data;
  const lastDay = daily.length ? daily[daily.length - 1][0] : isoRome.format(new Date());
  const prof = rateProfile(daily, lastDay);
  const lvl = opt.level, g = opt.weekly;
  let rem = residuo - (opt.drafts ? data.bozze.a : 0);
  let cum = data.impegnato + (opt.drafts ? data.bozze.a : 0);
  const pts = [[lastDay, data.impegnato]];
  // resto della giornata in corso
  const todayDone = daily.length ? daily[daily.length - 1][2] : 0;
  const hourRome = Number(new Intl.DateTimeFormat("it-IT", { timeZone: ROME, hour: "2-digit", hour12: false }).format(new Date(data.lastSubmission)));
  let restToday = Math.max(0, prof[dayKind(lastDay)] * lvl - todayDone);
  if (hourRome >= 20) restToday *= 0.3;
  if (opt.drafts) pts.push([lastDay, cum]);
  if (rem <= 0) return { end: lastDay, frac: 0, pts, prof, lastDay };
  if (rem - restToday <= 0) { pts.push([lastDay, data.fondo]); return { end: lastDay, frac: rem / Math.max(1, restToday), pts, prof, lastDay }; }
  rem -= restToday; cum += restToday;
  let day = lastDay;
  for (let t = 1; t <= 540; t++) {
    day = addDays(day, 1);
    const r = prof[dayKind(day)] * lvl * Math.pow(1 + g, t / 7);
    if (r < 1) continue;
    if (day > CHIUSURA) return { end: null, closed: true, pts, prof, lastDay, rem };
    if (rem - r <= 0) { pts.push([day, data.fondo]); return { end: day, frac: rem / r, pts, prof, lastDay }; }
    rem -= r; cum += r; pts.push([day, cum]);
  }
  return { end: null, pts, prof, lastDay };
}
const SCEN = {
  slow: { label: "Rallenta", weekly: -0.2, level: 1, drafts: false },
  base: { label: "Ritmo attuale", weekly: 0, level: 1, drafts: false },
  fast: { label: "Accelera", weekly: 0.15, level: 1.1, drafts: true }
};

/* ---------- Rendering ---------- */
let DATA = SNAPSHOT, LIVE = false, current = { ...SCEN.base };
const tip = $("tip");

function setMode(kind, text) { const m = $("mode"); m.className = "badge " + kind; $("modeTxt").textContent = text; }

function renderSummary() {
  const d = DATA, pct = d.fondo ? d.residuo / d.fondo : 0;
  $("resVal").textContent = nf0.format(Math.max(0, Math.round(d.residuo)));
  $("resPct").textContent = nf1.format(pct * 100) + "%";
  $("fundVal").textContent = eur(d.fondo);
  $("updVal").textContent = fmtDT.format(new Date(d.lastSubmission)).replace(",", "");
  const cells = $("cells"); cells.innerHTML = "";
  for (let i = 0; i < 20; i++) {
    const c = document.createElement("div"); c.className = "cell";
    const fill = Math.min(1, Math.max(0, pct * 20 - i));
    if (fill >= 1) c.classList.add("on"); else if (fill > 0) { c.classList.add("part"); c.style.setProperty("--p", Math.round(fill * 100) + "%"); }
    cells.appendChild(c);
  }
  $("gaugeLbl").setAttribute("aria-label", "Residuo pari al " + nf1.format(pct * 100) + "% del fondo");
  const first = d.daily[0]?.[0];
  $("kImp").innerHTML = eur(d.impegnato) + "<small>" + nf1.format((1 - pct) * 100) + "% del fondo</small>";
  $("kDom").innerHTML = nf0.format(d.domande) + "<small>dal " + (first ? fmtLong.format(s2d(first)).replace(/^\w+ /, "") : "—") + "</small>";
  $("kAvg").innerHTML = eur(d.impegnato / Math.max(1, d.domande)) + "<small>per domanda</small>";
  const base = project(d, SCEN.base);
  $("kRate").innerHTML = eur(base.prof.week7) + "<small>al giorno, media ultimi 7 giorni completi</small>";
  $("kDraft").innerHTML = nf0.format(d.bozze.n) + "<small>" + eur(d.bozze.a) + " potenziali</small>";
  $("kEnd").innerHTML = (base.end ? "≈ " + showDay(base.end) + " " + base.end.slice(0, 4) : "dopo la chiusura") + "<small>scenario a ritmo attuale</small>";
  $("draftAmt").textContent = mln(d.bozze.a);
  // pillole di stato
  const days = base.end ? Math.round((s2d(base.end) - s2d(base.lastDay)) / dayMs) : null;
  const pills = [];
  const icoWarn = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l6 11H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 5.5v3M7 10.2v.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const icoOk = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.2 7.2l1.9 1.9 3.7-3.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const icoStop = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  if (d.residuo <= 0) pills.push(['crit', icoStop, 'Fondi esauriti']);
  else {
    pills.push(['good', icoOk, 'Sportello aperto, domande in ordine cronologico']);
    if (days !== null && days <= 7) pills.push(['crit', icoWarn, 'Esaurimento entro una settimana']);
    else if (days !== null && days <= 30) pills.push(['warn', icoWarn, 'Esaurimento stimato in ' + days + ' giorni']);
    else pills.push(['neutral', icoOk, 'Esaurimento non imminente']);
    pills.push(['neutral', '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" stroke-width="1.5"/></svg>', 'Chiusura: 31 gennaio 2027, ore 12']);
  }
  $("pills").innerHTML = pills.map(([k, i, t]) => '<span class="pill ' + k + '">' + i + t + '</span>').join("");
}

function svgEl(w, h) { return { w, h, parts: [] }; }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function showTip(container, x, y, html) {
  tip.innerHTML = html; tip.style.opacity = 1;
  const r = container.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = r.left + window.scrollX + x + 14; if (left + tw > window.scrollX + document.documentElement.clientWidth - 8) left = r.left + window.scrollX + x - tw - 14;
  tip.style.left = Math.max(8, left) + "px"; tip.style.top = (r.top + window.scrollY + Math.max(0, y - th / 2)) + "px";
}
function hideTip() { tip.style.opacity = 0; }

function renderCum() {
  const box = $("cumChart"); const W = Math.max(280, box.clientWidth), H = Math.round(Math.min(460, Math.max(260, W * 0.66)));
  const m = { l: 52, r: 16, t: 54, b: 30 };
  const d = DATA, start = d.daily[0]?.[0] || "2026-09-22";
  const projs = Object.fromEntries(Object.entries(SCEN).map(([k, s]) => [k, project(d, s)]));
  const cur = project(d, current);
  const ends = [cur.end, ...Object.values(projs).map((p) => p.end)].filter(Boolean).sort();
  let endDay = ends.length ? ends[ends.length - 1] : addDays(start, 90);
  endDay = addDays(endDay, 4); if (endDay < addDays(start, 35)) endDay = addDays(start, 35);
  if (endDay > addDays(CHIUSURA, 3)) endDay = addDays(CHIUSURA, 3);
  const nDays = (s2d(endDay) - s2d(start)) / dayMs;
  const X = (s, frac = 0) => m.l + ((s2d(s) - s2d(start)) / dayMs + frac) / nDays * (W - m.l - m.r);
  const ymax = d.fondo * 1.04; const Y = (v) => m.t + (1 - v / ymax) * (H - m.t - m.b);
  // serie reale cumulata (fine giornata)
  let c = 0; const realPts = [[X(start), Y(0)]];
  for (const [s, , a] of d.daily) { c += a; realPts.push([X(s, 1), Y(c)]); }
  const p = [];
  // griglia
  for (let v = 0; v <= d.fondo; v += 2.5e6) { p.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/>`); p.push(`<text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v === 0 ? "0" : nf1.format(v / 1e6)}</text>`); }
  p.push(`<text x="${m.l - 8}" y="${m.t - 34}" text-anchor="end" class="lbl">mln €</text>`);
  // linea del fondo
  p.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${Y(d.fondo)}" y2="${Y(d.fondo)}" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="2 3"/>`);
  p.push(`<text x="${m.l + 4}" y="${Y(d.fondo) - 6}" class="lbl" text-anchor="start">Fondo ${mln(d.fondo)}</text>`);
  // tacche asse x (settimanali, il lunedì)
  for (let s = start, i = 0; s <= endDay; s = addDays(s, 1), i++) {
    if (s2d(s).getUTCDay() === 1) { p.push(`<line x1="${X(s)}" x2="${X(s)}" y1="${H - m.b}" y2="${H - m.b + 4}" stroke="var(--muted)"/>`); p.push(`<text x="${X(s)}" y="${H - m.b + 17}" text-anchor="middle">${showDay(s)}</text>`); }
  }
  p.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="var(--ink-2)"/>`);
  // scenari di confronto (sottili)
  for (const [k, pr] of Object.entries(projs)) {
    const pts = pr.pts.map(([s, v], i) => [i === 0 ? realPts[realPts.length - 1][0] : X(s, 1), Y(Math.min(v, d.fondo))]);
    if (pr.end) pts[pts.length - 1] = [pr.end === pr.lastDay ? X(pr.end, 1) : X(pr.end, pr.frac), Y(d.fondo)];
    p.push(`<polyline points="${pts.map((q) => q.join(",")).join(" ")}" fill="none" stroke="var(--context)" stroke-width="1.5" stroke-dasharray="1 4" stroke-linecap="round"/>`);
  }
  if (CHIUSURA <= endDay) { const cx = X(CHIUSURA, 0.5); p.push(`<line x1="${cx}" x2="${cx}" y1="${m.t}" y2="${H - m.b}" stroke="var(--ink-2)" stroke-width="1" stroke-dasharray="2 3"/><text x="${cx - 4}" y="${H - m.b - 8}" text-anchor="end" class="lbl">Chiusura sportello</text>`); }
  // area + linea reale
  const area = `M${realPts[0][0]},${Y(0)} ` + realPts.map((q) => "L" + q.join(",")).join(" ") + ` L${realPts[realPts.length - 1][0]},${Y(0)} Z`;
  p.push(`<path d="${area}" fill="var(--accent)" fill-opacity=".12"/>`);
  p.push(`<polyline points="${realPts.map((q) => q.join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`);
  // proiezione selezionata
  const cp = cur.pts.map(([s, v], i) => [i === 0 ? realPts[realPts.length - 1][0] : X(s, 1), Y(Math.min(v, d.fondo))]);
  const endX = (pr) => pr.end === pr.lastDay ? X(pr.end, 1) : X(pr.end, pr.frac);
  if (cur.end) cp[cp.length - 1] = [endX(cur), Y(d.fondo)];
  p.push(`<polyline points="${cp.map((q) => q.join(",")).join(" ")}" fill="none" stroke="var(--proj)" stroke-width="2.5" stroke-dasharray="6 4" stroke-linejoin="round"/>`);
  // punto "oggi"
  const lp = realPts[realPts.length - 1];
  p.push(`<circle cx="${lp[0]}" cy="${lp[1]}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`);
  const todayLbl = `Oggi ${mln(d.impegnato)}`;
  p.push(`<text x="${lp[0] - 8}" y="${lp[1] - 10}" text-anchor="end" class="lbl-strong">${todayLbl}</text>`);
  // esaurimento
  if (cur.end) {
    const ex = endX(cur);
    p.push(`<line x1="${ex}" x2="${ex}" y1="${Y(d.fondo)}" y2="${H - m.b}" stroke="var(--proj)" stroke-width="1" stroke-dasharray="3 3"/>`);
    p.push(`<circle cx="${ex}" cy="${Y(d.fondo)}" r="5.5" fill="var(--proj)" stroke="var(--surface)" stroke-width="2"/>`);
    const anchor = ex > W - 140 ? "end" : "middle";
    p.push(`<text x="${ex}" y="${Y(d.fondo) - 26}" text-anchor="${anchor}" class="lbl-strong">Esaurimento ≈ ${showDay(cur.end)}</text>`);
  }
  // overlay hover
  p.push(`<rect id="cumHit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>`);
  p.push(`<line id="cumX" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="var(--ink-2)" stroke-width="1" opacity="0"/>`);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Fondi impegnati cumulati e proiezione di esaurimento">${p.join("")}${wmSvg(W, H)}</svg>`;
  $("cumLegend").innerHTML = `<span><i style="border-color:var(--accent)"></i>Impegnato (dato reale)</span><span><i style="border-color:var(--proj);border-top-style:dashed"></i>Proiezione · scenario scelto</span><span><i style="border-color:var(--context);border-top-style:dotted"></i>Altri scenari</span>`;
  // hover
  const svg = box.querySelector("svg"), hit = svg.querySelector("#cumHit"), xl = svg.querySelector("#cumX");
  const realMap = new Map(); { let cc = 0; for (const [s, n, a] of d.daily) { cc += a; realMap.set(s, { cum: cc, n, a }); } }
  const projMap = new Map(cur.pts.slice(1).map(([s, v]) => [s, Math.min(v, d.fondo)]));
  hit.addEventListener("pointermove", (ev) => {
    const r = svg.getBoundingClientRect(); const sx = (ev.clientX - r.left) * W / r.width;
    const t = Math.round((sx - m.l) / (W - m.l - m.r) * nDays - 0.5); const s = addDays(start, Math.max(0, t));
    xl.setAttribute("x1", X(s, 1)); xl.setAttribute("x2", X(s, 1)); xl.setAttribute("opacity", ".5");
    let html = `<b>${esc(showLong(s))}</b>`;
    if (realMap.has(s)) { const o = realMap.get(s); html += `<div class="row"><span>Impegnato nel giorno</span><span>${eur(o.a)}</span></div><div class="row"><span>Domande</span><span>${nf0.format(o.n)}</span></div><div class="row"><span>Totale cumulato</span><span>${mln(o.cum)}</span></div>`; }
    else if (projMap.has(s)) html += `<div class="row"><span>Cumulato stimato</span><span>${mln(projMap.get(s))}</span></div><div class="row"><span>Residuo stimato</span><span>${mln(Math.max(0, d.fondo - projMap.get(s)))}</span></div>`;
    else html += `<div class="row"><span>Fondi esauriti (stima)</span><span></span></div>`;
    showTip(box, (X(s, 1)) * r.width / W, (ev.clientY - r.top), html);
  });
  hit.addEventListener("pointerleave", () => { xl.setAttribute("opacity", "0"); hideTip(); });
  // risposta + elenco scenari
  if (cur.end) {
    const days = Math.max(0, Math.round((s2d(cur.end) - s2d(cur.lastDay)) / dayMs));
    $("ansDate").textContent = showLong(cur.end);
    $("ansNote").textContent = days === 0 ? "entro oggi, secondo questo scenario" : `tra circa ${days} giorni · ritmo di partenza ${eur(cur.prof.fer * current.level)} nei giorni feriali`;
  } else { $("ansDate").textContent = "Fondi non esauriti"; $("ansNote").textContent = "con questo ritmo restano circa " + mln(Math.max(0, cur.rem || 0)) + " alla chiusura dello sportello, il 31 gennaio 2027"; }
  $("scenList").innerHTML = Object.entries(projs).map(([k, pr]) => `<li><span>${SCEN[k].label} <span class="muted small">(${SCEN[k].weekly > 0 ? "+" : ""}${Math.round(SCEN[k].weekly * 100)}% a settimana${SCEN[k].drafts ? ", bozze inviate" : ""})</span></span><span>${pr.end ? showDay(pr.end) : "oltre la chiusura"}</span></li>`).join("");
}

function renderDays() {
  const box = $("dayChart"); const W = Math.max(280, box.clientWidth), H = Math.round(Math.min(260, Math.max(190, W * 0.28)));
  const m = { l: 52, r: 10, t: 26, b: 30 }; const d = DATA.daily; if (!d.length) { box.innerHTML = ""; return; }
  const max = Math.max(...d.map((x) => x[2])); const ymax = Math.ceil(max / 5e5) * 5e5;
  const n = d.length, bw = (W - m.l - m.r) / n, gap = Math.min(6, bw * 0.25);
  const Y = (v) => m.t + (1 - v / ymax) * (H - m.t - m.b);
  const p = [];
  for (let v = 0; v <= ymax; v += 5e5) { p.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/>`); p.push(`<text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v === 0 ? "0" : nf1.format(v / 1e6)}</text>`); }
  p.push(`<text x="${m.l - 8}" y="${m.t - 12}" text-anchor="end" class="lbl">mln €</text>`);
  d.forEach(([s, nn, a], i) => {
    const x = m.l + i * bw + gap / 2, w = Math.max(2, bw - gap), y = Y(a), h = Math.max(1, Y(0) - y);
    const k = dayKind(s); const op = k === "fer" ? 1 : 0.45; const r = Math.min(4, w / 2);
    p.push(`<path d="M${x},${Y(0)} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${Y(0)} Z" fill="var(--accent)" fill-opacity="${op}" data-i="${i}" class="bar"/>`);
    const step = Math.max(1, Math.ceil(46 / bw)); const showLbl = i % step === 0;
    if (showLbl) p.push(`<text x="${x + w / 2}" y="${H - m.b + 17}" text-anchor="middle">${showDay(s)}</text>`);
  });
  p.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-2)"/>`);
  const i0 = 0; const x0 = m.l + i0 * bw + bw / 2;
  p.push(`<text x="${x0 + bw / 2 + 4}" y="${Y(d[0][2]) + 12}" class="lbl" text-anchor="start">Apertura: ${mln(d[0][2])} in un giorno</text>`);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Importi impegnati per giorno">${p.join("")}${wmSvg(W, H)}</svg>`;
  box.querySelectorAll(".bar").forEach((el) => {
    el.addEventListener("pointerenter", (ev) => { const [s, nn, a] = d[+el.dataset.i]; el.setAttribute("stroke", "var(--ink)"); const r = box.getBoundingClientRect(); showTip(box, ev.clientX - r.left, ev.clientY - r.top, `<b>${esc(showLong(s))}</b><div class="row"><span>Impegnato</span><span>${eur(a)}</span></div><div class="row"><span>Domande</span><span>${nf0.format(nn)}</span></div>`); });
    el.addEventListener("pointerleave", () => { el.removeAttribute("stroke"); hideTip(); });
  });
}

function renderHistory() {
  const box = $("histChart"); if (!box) return;
  const W = Math.max(280, box.clientWidth), H = Math.round(Math.min(340, Math.max(230, W * 0.42)));
  const m = { l: 52, r: 120, t: 24, b: 34 }; const DAYS = 45;
  const series = WINDOWS.filter((w) => w.key !== "2026" && HISTORY[w.key]).map((w) => ({ ...w, data: HISTORY[w.key] }));
  series.push({ ...WINDOWS.find((w) => w.key === "2026"), data: DATA.daily });
  const cumOf = (data) => { const s0 = s2d(data[0][0]); const out = [[0, 0]]; let c = 0; for (const [s, , a] of data) { const t = (s2d(s) - s0) / dayMs + 1; if (t > DAYS) break; c += a; out.push([t, c]); } return out; };
  const all = series.map((s) => ({ ...s, cum: cumOf(s.data) }));
  const ymax = Math.ceil(Math.max(...all.map((s) => s.cum[s.cum.length - 1][1])) / 2e6) * 2e6;
  const X = (t) => m.l + t / DAYS * (W - m.l - m.r), Y = (v) => m.t + (1 - v / ymax) * (H - m.t - m.b);
  const p = [];
  for (let v = 0; v <= ymax; v += 2e6) { p.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/>`); p.push(`<text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v / 1e6}</text>`); }
  p.push(`<text x="${m.l - 8}" y="${m.t - 10}" text-anchor="end" class="lbl">mln €</text>`);
  for (let t = 0; t <= DAYS; t += 7) { p.push(`<text x="${X(t)}" y="${H - m.b + 17}" text-anchor="middle">${t === 0 ? "apertura" : "g+" + t}</text>`); }
  p.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-2)"/>`);
  // etichette finali, evitando sovrapposizioni
  const labels = [];
  all.forEach((s) => {
    const is = s.key === "2026"; const last = s.cum[s.cum.length - 1];
    p.push(`<polyline points="${s.cum.map(([t, v]) => X(t) + "," + Y(v)).join(" ")}" fill="none" stroke="${is ? "var(--accent)" : "var(--context)"}" stroke-width="${is ? 3 : 1.75}" stroke-linejoin="round"/>`);
    p.push(`<circle cx="${X(last[0])}" cy="${Y(last[1])}" r="${is ? 5 : 3.5}" fill="${is ? "var(--accent)" : "var(--context)"}" stroke="var(--surface)" stroke-width="2"/>`);
    labels.push({ x: X(last[0]) + 8, y: Y(last[1]) + 4, txt: s.short, is });
  });
  labels.sort((a, b) => a.y - b.y); for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 14 && Math.abs(labels[i].x - labels[i - 1].x) < 90) labels[i].y = labels[i - 1].y + 14;
  labels.forEach((l) => p.push(`<text x="${l.x}" y="${l.y}" class="${l.is ? "lbl-strong" : "lbl"}">${esc(l.txt)}</text>`));
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Confronto degli sportelli: importi cumulati nei primi 45 giorni">${p.join("")}${wmSvg(W, H)}</svg>`;
  $("histLegend").innerHTML = `<span><i style="border-color:var(--accent);border-top-width:3px"></i>Sportello 2026 (in corso)</span><span><i style="border-color:var(--context)"></i>Sportelli precedenti</span>`;
  // tabella
  const rows = WINDOWS.map((w) => {
    const cur = w.key === "2026";
    const data = cur ? DATA.daily : HISTORY[w.key] || [];
    const n = cur ? DATA.domande : data.reduce((a, x) => a + x[1], 0);
    const a = cur ? DATA.impegnato : data.reduce((a2, x) => a2 + x[2], 0);
    const fondo = cur ? DATA.fondo : w.fondo;
    const used = cur ? a : (w.prev || 0) + w.concesso; const u = fondo ? used / fondo : 0;
    const dom = cur ? nf0.format(n) + '<br><span class="small muted">in istruttoria</span>' : nf0.format(n) + '<br><span class="small muted">' + nf0.format(w.ammesse) + ' ammesse</span>';
    const money = cur ? eur(a) + '<br><span class="small muted">richiesti</span>' : eur(a) + '<br><span class="small muted">≈ ' + eur(w.concesso) + ' concessi</span>';
    return `<tr class="${cur ? "current" : ""}"><td><b>${esc(w.label)}</b><br><span class="small muted">${esc(w.note)}</span></td><td>${esc(w.per)}</td><td class="n">${eur(fondo)}${w.prev ? '<br><span class="small muted">condivisa</span>' : ""}</td><td class="n">${dom}</td><td class="n">${money}</td><td class="n">${nf1.format(u * 100)}%<span class="bar-mini"><span style="width:${Math.min(100, u * 100)}%"></span></span></td></tr>`;
  });
  $("histRows").innerHTML = rows.join("");
}

/* Stimatore per i prossimi sportelli: curva del 2026 (picco di apertura, poi ritmo settimanale) scalata per la domanda */
function simulateWindow(fund, dem, start) {
  const d = DATA.daily, prof = rateProfile(d, d[d.length - 1][0]);
  let cum = 0, day = start, day1 = 0;
  for (let t = 0; t < 500; t++) {
    const tmpl = t < d.length - 1 ? d[t][2] : prof[dayKind(day)];
    const r = tmpl * dem; if (t === 0) day1 = r;
    if (cum + r >= fund) return { days: t + 1, end: day, day1 };
    cum += r; day = addDays(day, 1);
  }
  return { days: null, end: null, day1 };
}
function renderOutlook() {
  const f = $("olFund"); if (!f) return;
  const fund = Number(f.value) * 1e6, dem = Number($("olDem").value) / 100;
  $("olFundOut").textContent = nf1.format(fund / 1e6) + " mln €"; $("olDemOut").textContent = Math.round(dem * 100) + "%";
  const sim = simulateWindow(fund, dem, $("olStart").value || "2027-09-21");
  $("olDays").textContent = sim.days ? (sim.days === 1 ? "nel primo giorno" : `in circa ${sim.days} giorni`) : "oltre un anno";
  $("olDate").textContent = sim.end ? showLong(sim.end) : "—";
  $("olDay1").textContent = nf0.format(Math.min(100, sim.day1 / fund * 100)) + "%";
  $("olRows").innerHTML = FUTURE.map((y) => {
    const net = y.lordo * 0.965; const s = simulateWindow(net, dem, (y.anno) + "-09-21");
    return `<tr><td><b>${y.anno}</b><br><span class="small muted">${esc(y.note)}</span></td><td class="n">${mln(y.lordo, 1)}</td><td class="n">${mln(net)}</td><td class="n">${s.days ? "≈ " + s.days + " giorni" : "—"}</td></tr>`;
  }).join("");
}

function renderAll() { renderSummary(); renderCum(); renderDays(); renderHistory(); renderOutlook(); }

/* ---------- Controlli ---------- */
function syncControls() {
  $("wk").value = Math.round(current.weekly * 100); $("wkOut").textContent = (current.weekly > 0 ? "+" : "") + Math.round(current.weekly * 100) + "%";
  $("lvl").value = Math.round(current.level * 100); $("lvlOut").textContent = Math.round(current.level * 100) + "%";
  $("drafts").checked = current.drafts;
  const match = Object.entries(SCEN).find(([, s]) => s.weekly === current.weekly && s.level === current.level && s.drafts === current.drafts);
  document.querySelectorAll("#scenBtns button").forEach((b) => b.setAttribute("aria-pressed", String(!!match && b.dataset.s === match[0])));
}
document.querySelectorAll("#scenBtns button").forEach((b) => b.addEventListener("click", () => { current = { ...SCEN[b.dataset.s] }; syncControls(); renderCum(); }));
$("wk").addEventListener("input", (e) => { current.weekly = Number(e.target.value) / 100; syncControls(); renderCum(); });
$("lvl").addEventListener("input", (e) => { current.level = Number(e.target.value) / 100; syncControls(); renderCum(); });
$("drafts").addEventListener("change", (e) => { current.drafts = e.target.checked; syncControls(); renderCum(); });
document.addEventListener("input", (e) => { if (e.target.closest && e.target.closest("#outlookTool")) renderOutlook(); });
const HAS_LIVE = typeof loadLive === "function";
$("pbiLink").href = "https://www.invitalia.it/incentivi-e-strumenti/bonus-colonnine-domestiche";
if (!HAS_LIVE) $("refresh").hidden = true;

function setOfficial() {
  setMode("snap", "Dato ufficiale Invitalia al " + fmtDT.format(new Date(DATA.lastSubmission)).replace(",", ""));
  $("footMode").textContent = HAS_LIVE
    ? "Non è stato possibile collegarsi ai dati aggiornati (connessione assente o bloccata): i numeri sono quelli al " + fmtDT.format(new Date(DATA.lastSubmission)).replace(",", "") + ". La pagina riprova da sola ogni 10 minuti."
    : "Fondi residui aggiornati al " + fmtDT.format(new Date(DATA.lastSubmission)).replace(",", "") + " (ultima domanda registrata).";
}
let timer = null;
async function refresh() {
  if (!HAS_LIVE) { setOfficial(); renderAll(); return; }
  const btn = $("refresh"); btn.disabled = true; setMode("load", "Lettura del contatore…");
  try {
    const live = await loadLive();
    if (!live.daily.length || !(live.fondo > 0)) throw new Error("dati incompleti");
    DATA = live; LIVE = true;
    setMode("live", "Dato ufficiale Invitalia · in tempo reale");
    $("footMode").textContent = "Fondi residui letti alle " + fmtDT.format(new Date()).replace(",", "") + " · ultima domanda registrata " + fmtDT.format(new Date(DATA.lastSubmission)).replace(",", "") + ". La pagina si aggiorna da sola ogni 10 minuti finché resta aperta.";
  } catch (e) {
    LIVE = false; setOfficial();
  } finally { btn.disabled = false; renderAll(); }
}
$("refresh").addEventListener("click", refresh);
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { renderCum(); renderDays(); renderHistory(); }, 120); });

syncControls(); renderAll(); refresh();
let lastRun = Date.now();
if (HAS_LIVE) {
  timer = setInterval(() => { if (document.visibilityState === "visible") { lastRun = Date.now(); refresh(); } }, REFRESH_MS);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - lastRun > 5 * 60 * 1000) { lastRun = Date.now(); refresh(); } });
}
