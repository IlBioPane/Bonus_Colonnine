/* ---------- Interfaccia: barra del plafond, orario dei dati, indice attivo ---------- */
(function () {
  function syncGauge() {
    const pct = parseFloat(($("resPct")?.textContent || "").replace(",", ".")) || 0;
    $("glowBar").style.width = Math.max(0, Math.min(100, pct)) + "%";
    $("glowPct").textContent = ($("resPct")?.textContent || "") + " residuo";
    const t = ($("updVal")?.textContent || "").match(/(\d{2}:\d{2})/);
    $("kpiUpd").textContent = t ? "Agg. ore " + t[1] : "";
  }
  syncGauge();
  for (const id of ["resPct", "updVal"]) if ($(id)) new MutationObserver(syncGauge).observe($(id), { childList: true, characterData: true, subtree: true });

  const links = [...document.querySelectorAll(".toc a")];
  const spy = () => {
    let cur = links[0];
    for (const a of links) { const sec = document.querySelector(a.getAttribute("href")); if (sec && !sec.hidden && sec.getBoundingClientRect().top < 140) cur = a; }
    for (const a of links) a.classList.toggle("on", a === cur);
    if (cur && cur.parentElement.scrollWidth > cur.parentElement.clientWidth) {
      const nav = cur.parentElement, x = cur.offsetLeft - nav.clientWidth / 2 + cur.clientWidth / 2;
      if (Math.abs(nav.scrollLeft - x) > 40) nav.scrollTo({ left: x });
    }
  };
  let raf = 0;
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; spy(); }); }, { passive: true });
  spy();
})();
