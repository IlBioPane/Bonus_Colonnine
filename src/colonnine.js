/* ---------- Verifica colonnina: ricerca negli elenchi GSE dei dispositivi idonei ---------- */
(function () {
  const G = BP_DATA.gse;
  if (!G || !G.items || !G.items.length) return;          // elenco non ancora importato: la sezione resta nascosta
  $("colonnine").hidden = false; $("tocColonnine").hidden = false;
  const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const rows = G.items.map((r) => ({ r, k: norm(r.join(" ")), c: norm(r.join(" ")).replace(/ /g, "") }));
  let list = "";
  $("gseMeta").textContent = `${nf0.format(G.items.length)} dispositivi negli elenchi GSE aggiornati al ${G.aggiornato}. In caso di dubbio fa fede l'elenco ufficiale.`;
  const hl = (txt, toks) => { let h = esc(txt); for (const t of toks) if (t.length > 1) h = h.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); return h; };
  function run() {
    const q = norm($("gseQ").value), toks = q.split(" ").filter(Boolean);
    if (!toks.length) { $("gseOut").innerHTML = `<p class="small muted">Scrivi almeno una parola: la marca e il nome del modello come compaiono sulla targhetta o in fattura.</p>`; return; }
    const hit = rows.filter(({ r, k, c }) => (!list || r[4] === list) && toks.every((t) => k.includes(t) || c.includes(t)));
    if (!hit.length) {
      $("gseOut").innerHTML = `<div class="callout"><b>Nessun dispositivo trovato.</b> Prova con meno parole o con il codice prodotto. Se il modello non è nell'elenco, la colonnina non è ammessa al bonus: chiedi all'installatore un modello presente negli elenchi GSE.</div>`;
      return;
    }
    const shown = hit.slice(0, 60);
    $("gseOut").innerHTML = `<p class="small" style="margin:10px 0 0"><b>${nf0.format(hit.length)}</b> ${hit.length === 1 ? "dispositivo trovato" : "dispositivi trovati"}${hit.length > shown.length ? `, mostrati i primi ${shown.length}: affina la ricerca` : ""}. Presente in elenco = idoneo per il requisito GSE del bonus.</p><ul class="gse-res">${shown.map(({ r }) => `<li><span><b>${hl(r[0], toks)}</b> · ${hl(r[1], toks)}</span><span class="gse-tag${r[4] === "NO GDC" ? " no" : ""}">✓ Elenco ${esc(r[4])}</span>${r[2] || r[3] ? `<span class="meta">${r[2] ? "Codice " + hl(r[2], toks) : ""}${r[2] && r[3] ? " · " : ""}${r[3] ? esc(r[3]) + (/^\d+([.,]\d+)?$/.test(r[3]) ? " kW" : "") : ""}</span>` : ""}</li>`).join("")}</ul>`;
  }
  $("gseQ").addEventListener("input", run);
  $("gseForm").addEventListener("submit", (e) => { e.preventDefault(); run(); });
  $("gseList").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; list = b.dataset.l; for (const x of $("gseList").children) x.setAttribute("aria-pressed", String(x === b)); run(); });
  run();
})();
