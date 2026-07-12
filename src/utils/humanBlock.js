/**
 * humanBlock — anti-scraping wall for failed human verification.
 *
 * When the invisible captcha cannot prove the visitor is human — a fresh
 * proof-of-work was solved and redeemed yet the backend STILL rejects the
 * pass across every retry (tampering, a headless/automated browser the Cap
 * widget refuses to solve, or a forged pass) — this tears the app down,
 * WIPES the DOM and paints one calm on-brand notice in its place.
 *
 * Why wipe instead of overlay: an overlay leaves the whole app markup mounted
 * underneath, trivially scraped by reading the DOM. Replacing document.body
 * leaves nothing behind — the anti-scraping intent, same mechanism as
 * antiSnoop (see utils/antiSnoop.js). NOT a security boundary (the bundle
 * already shipped); it raises the cost of casual automated harvesting.
 *
 * Strings come from i18n (humanBlocked.*) — the i18n instance lives in memory
 * and survives the wipe. The overlay uses INLINE styles on purpose: the CSS
 * Module stylesheets are gone once the app is torn down; inline styles render
 * regardless. Mirror of the antiSnoop overlay so the two walls look identical.
 */
import i18n from "../i18n";

let locked = false;
let teardownApp = null;

// Localized string with a safe fallback if i18n hasn't resolved the key.
function tr(key, fallback) {
  try {
    const value = i18n.t(`humanBlocked.${key}`);
    return value && value !== `humanBlocked.${key}` ? value : fallback;
  } catch {
    return fallback;
  }
}

const INK = "#1a1a1a";
const MUTED = "#666666";
const FAINT = "#a3a3a3";
const PAGE = "#f7f5f0";
const SURFACE = "#fdfcf8";
const TERRACOTTA = "#a85432";
const GOLD = "#c5a572";
const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, Helvetica, Arial, sans-serif';

// One <style> node we create AFTER the wipe (the bundle's stylesheets are
// gone) for what inline styles can't express: the dark pill's hover/focus,
// matching the ServerError button. No surfaces/shadows — the house state
// screens are flat text on the cream page.
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .thiup-hb-btn { transition: background 200ms ease, transform 120ms ease; }
    .thiup-hb-btn:hover { background: #2d2d2d; }
    .thiup-hb-btn:active { transform: scale(0.97); }
    .thiup-hb-btn:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }
  `;
  return style;
}

// Builds the wall in the house state-screen anatomy (see ServerError.js):
// flat, centered content on the cream page — dashed illustration · title ·
// subtitle · dark pill button · meta hint. No card/surface (that broke the
// minimalist contrast). Inline styles + one injected <style> both survive the
// DOM wipe (no dependency on the app's stylesheets).
function buildOverlay() {
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "alert");
  overlay.setAttribute("aria-live", "assertive");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    `background:${PAGE}`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "z-index:2147483647",
    `font-family:${FONT}`,
    "-webkit-font-smoothing:antialiased",
    "padding:40px 24px",
    "box-sizing:border-box",
  ].join(";");

  overlay.appendChild(injectStyles());

  const col = document.createElement("div");
  col.style.cssText =
    "display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;max-width:320px";

  // Brand mark — the serpentine thread + dot, terracotta on cream (the nav
  // 'plain' variant), matching src/components/BrandLogo.js.
  const logo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  logo.setAttribute("width", "44");
  logo.setAttribute("height", "44");
  logo.setAttribute("viewBox", "0 0 68 68");
  logo.setAttribute("fill", "none");
  logo.setAttribute("aria-hidden", "true");
  logo.style.marginBottom = "4px";
  logo.innerHTML =
    `<path d="M24 17.5 Q46 25.75 24 34 Q46 42.25 24 50.5" stroke="${TERRACOTTA}" ` +
    `stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<circle cx="44.5" cy="19" r="4.5" fill="${TERRACOTTA}"/>`;

  const title = document.createElement("h1");
  title.textContent = tr("title", "Let's make sure you're human");
  title.style.cssText = `margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${INK}`;

  const body = document.createElement("p");
  body.textContent = tr(
    "body",
    "We couldn't verify this session as a real person. Thiup gates its content behind a quick human check to keep an anonymous community free of bots."
  );
  body.style.cssText = `margin:0;font-size:14px;line-height:1.55;color:${MUTED}`;

  // Dark pill with the reload glyph — same button as ServerError's "Try again".
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thiup-hb-btn";
  button.style.cssText = [
    "margin-top:8px",
    "display:inline-flex",
    "align-items:center",
    "gap:9px",
    "padding:12px 26px",
    "border:none",
    "border-radius:999px",
    `background:${INK}`,
    `color:${SURFACE}`,
    "font-size:13px",
    "font-weight:600",
    "cursor:pointer",
    `font-family:${FONT}`,
  ].join(";");
  const reload = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  reload.setAttribute("width", "14");
  reload.setAttribute("height", "14");
  reload.setAttribute("viewBox", "0 0 24 24");
  reload.setAttribute("fill", "none");
  reload.setAttribute("stroke", SURFACE);
  reload.setAttribute("stroke-width", "2.5");
  reload.setAttribute("stroke-linecap", "round");
  reload.setAttribute("stroke-linejoin", "round");
  reload.setAttribute("aria-hidden", "true");
  reload.innerHTML =
    `<polyline points="23 4 23 10 17 10"/>` +
    `<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>`;
  button.appendChild(reload);
  button.appendChild(
    document.createTextNode(tr("tryAgain", "Try again"))
  );
  button.addEventListener("click", () => window.location.reload());

  const hint = document.createElement("p");
  hint.textContent = tr(
    "hint",
    "Reload the page to run the check again. If it keeps failing, disable automation or extensions that block scripts."
  );
  hint.style.cssText = `margin:4px 0 0;font-size:12px;line-height:1.5;color:${FAINT}`;

  col.appendChild(logo);
  col.appendChild(title);
  col.appendChild(body);
  col.appendChild(button);
  col.appendChild(hint);
  overlay.appendChild(col);
  return overlay;
}

/**
 * Registers the app teardown handle. Call once at mount (index.js), exactly
 * like initAntiSnoop, so blockAsBot can unmount React before wiping the DOM.
 *
 * @param {object} [options]
 * @param {() => void} [options.onLockdown] - e.g. `root.unmount()`.
 */
export function initHumanBlock(options) {
  teardownApp = (options && options.onLockdown) || null;
}

/**
 * Tears the app down and replaces the DOM with the verification wall.
 * Idempotent: once walled, further calls are no-ops. Deliberately NOT gated
 * on DEBUG — a persistent CAPTCHA_FAILED is a genuine anomaly, and being able
 * to see the wall in development is useful for testing.
 */
export function blockAsBot() {
  if (locked || typeof window === "undefined") return;
  locked = true;

  // Tear React down FIRST so it removes its own tree + portals cleanly (a raw
  // DOM wipe races React's portal cleanup and throws removeChild errors).
  try {
    if (teardownApp) teardownApp();
  } catch {
    /* ignore — we wipe next regardless */
  }

  // Replace the whole body with the wall in one atomic swap.
  document.body.replaceChildren(buildOverlay());
  document.body.style.margin = "0";
  document.body.style.background = PAGE;
  document.title = tr("title", "Let's make sure you're human");
}
