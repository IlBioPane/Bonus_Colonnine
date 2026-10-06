/* ---------- Verifica colonnina: ricerca negli elenchi GSE dei dispositivi idonei ---------- */
/* elemento: [marca, modello, versione, potenza, elenco, alimentazione, dispositivo esterno] */
(function () {
  const G = BP_DATA.gse;
  if (!G || !G.items || !G.items.length) return;          // elenco non ancora importato: la sezione resta nascosta
  $("colonnine").hidden = false; $("tocColonnine").hidden = false;
  const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const rows = G.items.map((r) => { const k = norm(r.slice(0, 4).join(" ")); return { r, k, c: k.replace(/ /g, "") }; });
  const lists = ["GDC", "NO GDC"].filter((l) => G.items.some((r) => r[4] === l));
  const missing = ["GDC", "NO GDC"].filter((l) => !lists.includes(l));
  let list = "";
  for (const b of $("gseList").children) if (b.dataset.l && !lists.includes(b.dataset.l)) b.hidden = true;
  if (lists.length < 2) $("gseList").hidden = true;
  const brands = new Set(G.items.map((r) => r[0])).size;
  $("gseMeta").innerHTML = `${nf0.format(G.items.length)} dispositivi di ${nf0.format(brands)} costruttori · elenco ${lists.join(" e ")} GSE aggiornato a ${esc(G.aggiornato)}. In caso di dubbio fa fede l'elenco ufficiale.` +
    (missing.length ? `<span class="callout info" style="display:block">L'elenco <b>${missing.join(" e ")}</b> non è ancora caricato in questa pagina: se non trovi qui il tuo modello, verificalo sul sito del GSE prima di concludere che non è ammesso.</span>` : "");
  const hl = (txt, toks) => { let h = esc(txt); for (const t of toks) if (t.length > 1) h = h.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); return h; };
  const kw = (p) => p ? esc(p) + (/kw/i.test(p) ? "" : " kW") : "";
  function run() {
    const q = norm($("gseQ").value), toks = q.split(" ").filter(Boolean);
    if (!toks.length) { $("gseOut").innerHTML = `<p class="small muted">Scrivi la marca o il nome del modello come compaiono sulla targhetta, sulla scheda tecnica o in fattura.</p>`; return; }
    const hit = rows.filter(({ r, k, c }) => (!list || r[4] === list) && toks.every((t) => k.includes(t) || c.includes(t)));
    if (!hit.length) {
      $("gseOut").innerHTML = missing.length
        ? `<div class="callout"><b>Non presente nell'elenco ${lists.join(" e ")}.</b> Il modello potrebbe comparire nell'elenco ${missing.join(" e ")} del GSE, non ancora caricato qui: controllalo prima di comprare o di presentare la domanda.</div>`
        : `<div class="callout"><b>Nessun dispositivo trovato.</b> Prova con meno parole o con il nome della versione. Se il modello non è in nessuno dei due elenchi GSE, la colonnina non è ammessa al bonus.</div>`;
      return;
    }
    const shown = hit.slice(0, 60);
    $("gseOut").innerHTML = `<p class="small" style="margin:10px 0 0"><b>${nf0.format(hit.length)}</b> ${hit.length === 1 ? "dispositivo trovato" : "dispositivi trovati"}${hit.length > shown.length ? `, mostrati i primi ${shown.length}: affina la ricerca` : ""}. Presente in elenco = requisito GSE del bonus soddisfatto per quella versione.</p><ul class="gse-res">${shown.map(({ r }) => {
      const meta = [r[2] && `Versione ${hl(r[2], toks)}`, r[3] && kw(r[3]), r[5] && esc(r[5].toLowerCase()), r[6] && `dispositivo esterno ${esc(r[6])}`].filter(Boolean).join(" · ");
      return `<li><span><b>${hl(r[0], toks)}</b> · ${hl(r[1], toks)}</span><span class="gse-tag${r[4] === "NO GDC" ? " no" : ""}">✓ Elenco ${esc(r[4])}</span>${meta ? `<span class="meta">${meta}</span>` : ""}</li>`;
    }).join("")}</ul>`;
  }
  $("gseQ").addEventListener("input", run);
  $("gseForm").addEventListener("submit", (e) => { e.preventDefault(); run(); });
  $("gseList").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; list = b.dataset.l; for (const x of $("gseList").children) x.setAttribute("aria-pressed", String(x === b)); run(); });
  run();
})();
