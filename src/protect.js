/* ---------- Firma IlBioPane: filigrana, attribuzione e deterrenti alla copia ---------- */
const AUTHOR = "IlBioPane";
const _g = (id) => document.getElementById(id);
function wmSvg(W, H) { return `<text class="wm" x="${W - 6}" y="${H - 4}" text-anchor="end">© ${AUTHOR}</text>`; }

function paintWatermark() {
  const layer = _g("wmLayer"); if (!layer) return;
  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#10202B";
  const dark = matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light" || document.documentElement.dataset.theme === "dark";
  const op = dark ? 0.07 : 0.055;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220"><g transform="rotate(-28 170 110)" fill="${ink}" fill-opacity="${op}" font-family="Titillium Web, Segoe UI, sans-serif" font-weight="700"><text x="40" y="100" font-size="30" letter-spacing="2">${AUTHOR}</text><text x="44" y="126" font-size="12" letter-spacing="1.5">BONUS COLONNINE 2026 · ©</text></g></svg>`;
  layer.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}
paintWatermark();
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintWatermark); } catch (e) { /* vecchi browser */ }
new MutationObserver(paintWatermark).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

const editable = (el) => el && el.closest && el.closest("input,select,textarea,option");
document.addEventListener("contextmenu", (e) => { if (!editable(e.target)) e.preventDefault(); });
document.addEventListener("dragstart", (e) => { if (!editable(e.target)) e.preventDefault(); });
document.addEventListener("selectstart", (e) => { if (!editable(e.target)) e.preventDefault(); });
document.addEventListener("copy", (e) => {
  if (editable(e.target)) return;
  const sel = String(window.getSelection ? window.getSelection() : "");
  try { e.clipboardData.setData("text/plain", (sel ? sel + "\n\n" : "") + "© " + AUTHOR + " · Bonus Colonnine 2026. Riproduzione vietata."); e.preventDefault(); } catch (err) { /* nessun accesso agli appunti */ }
});
document.addEventListener("keydown", (e) => {
  const k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (k === "f12" || (mod && e.shiftKey && ["i", "j", "c"].includes(k)) || (mod && e.altKey && ["i", "j", "c", "u"].includes(k)) || (mod && ["u", "s", "p"].includes(k)) || (mod && ["a", "c", "x"].includes(k) && !editable(e.target))) {
    e.preventDefault(); e.stopPropagation();
  }
}, true);

/* la firma deve restare: se viene rimossa o alterata, la pagina si oscura */
function signatureOk() {
  const a = _g("bpSign"), w = _g("wmLayer");
  return !!(a && a.textContent.includes(AUTHOR) && w && w.isConnected && getComputedStyle(w).display !== "none" && getComputedStyle(a).display !== "none" && getComputedStyle(a).visibility !== "hidden");
}
let tripped = false;
function guard() {
  if (tripped || signatureOk()) return;
  tripped = true;
  document.body.innerHTML = `<div style="padding:48px 20px;font-family:sans-serif;max-width:560px;margin:auto"><h1 style="font-size:1.4rem">Contenuto protetto</h1><p>Questa pagina è un'opera di ${AUTHOR}. La firma dell'autore è stata rimossa o alterata, quindi il contenuto non viene mostrato.</p></div>`;
}
new MutationObserver(guard).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
setInterval(guard, 4000);
