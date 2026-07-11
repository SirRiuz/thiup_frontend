/**
 * antiSnoop — casual anti-scraping / anti-prying guard.
 *
 * When it detects the browser DevTools are open, it tears the app down, wipes
 * the DOM and paints one calm, on-brand message in its place. This is NOT a
 * security boundary (a determined scraper bypasses it trivially — the bundle
 * already shipped to the browser); it only raises the cost of CASUAL
 * inspection, the same intent as the CSS/JS obfuscation passes.
 *
 * Gated by DEBUG (REACT_APP_DEBUG): with DEBUG=true the guard is a no-op so we
 * can develop with DevTools open; with DEBUG=false (production) it is armed.
 *
 * DETECTION — the VIEWPORT-GROWTH heuristic (pause-free, no false positives).
 * Docked DevTools (bottom/right, the default when opened from the browser's
 * three-dots menu) steal space from the page viewport, so `outer - inner`
 * jumps. We do NOT use a fixed threshold (browser zoom, docked browser side
 * panels and window chrome also inflate that gap and would wipe the screen for
 * innocent users). Instead we capture a BASELINE gap at load and react only
 * when it grows PAST that baseline — i.e. a panel opened AFTER load.
 *
 * RECOVERY: once locked it keeps watching; when the gap returns to the baseline
 * (the panel was closed) for two consecutive checks it reloads, so the visitor
 * returns seamlessly. Two checks avoids a single flaky reading bouncing us out.
 *
 * HONEST LIMITS (accepted for "hinder a bit"): it does NOT catch an UNDOCKED
 * DevTools window (separate window — no viewport change) nor DevTools that was
 * ALREADY OPEN when the page loaded (its gap is baked into the baseline).
 * Catching those without a visible `debugger` pause or false-positive-prone
 * console tricks isn't reliably possible — see the console-bait dead end noted
 * in git history. The everyday case — opening the docked inspector on the
 * page — is covered.
 *
 * The message strings come from i18n (antiSnoop.*) — the i18n instance lives
 * in memory and keeps working after the DOM is wiped. The overlay uses INLINE
 * styles on purpose: the CSS Module stylesheets are gone once the app is torn
 * down, and inline styles render regardless.
 */
import { DEBUG } from "../settings";
import i18n from "../i18n";

// A docked panel adds far more than this to the gap; a scrollbar (~15px) or a
// minor chrome shift never does. Baseline-relative, so zoom is already
// cancelled out — this only measures space that appeared AFTER load.
const GROWTH_THRESHOLD = 120;
const POLL_MS = 1000;

// Native requestAnimationFrame captured at module load. Using this bound
// reference (instead of reading window.requestAnimationFrame each time) means a
// later `window.requestAnimationFrame = () => {}` — an obvious way to kill the
// watchdog — has no effect: our loop keeps rescheduling on the real one.
const nativeRaf =
  typeof window !== "undefined" && window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : null;

let armed = false;
let locked = false;
let teardownApp = null;
let baseGapW = 0;
let baseGapH = 0;
// Guards against any driver evaluating before the load-time baseline is set
// (with baseGap* still 0 the raw gap would look like growth → false positive).
let baselineReady = false;

// Desktop only: mobile has no local DevTools, and gating here avoids any edge
// case with the mobile URL bar shifting the viewport.
function isDesktop() {
  try {
    return (
      window.matchMedia("(pointer: fine)").matches && !("ontouchstart" in window)
    );
  } catch {
    return true;
  }
}

// Space between the OS window and the page viewport. Docking DevTools grows it;
// resizing the window keeps it constant (outer and inner move together); zoom
// shifts it, which is why we measure GROWTH over the load-time baseline.
function gapW() {
  return window.outerWidth - window.innerWidth;
}
function gapH() {
  return window.outerHeight - window.innerHeight;
}

// A docked panel opened after load (grew the gap past the baseline).
function devtoolsOpen() {
  if (!baselineReady || !isDesktop()) return false;
  return (
    gapW() - baseGapW > GROWTH_THRESHOLD || gapH() - baseGapH > GROWTH_THRESHOLD
  );
}

// Localized string with a safe fallback if i18n hasn't resolved the key.
function tr(key, fallback) {
  try {
    const value = i18n.t(`antiSnoop.${key}`);
    return value && value !== `antiSnoop.${key}` ? value : fallback;
  } catch {
    return fallback;
  }
}

const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const FAINT = "#a3a3a3";
const PAGE = "#f7f5f0";
const TERRACOTTA = "#a85432";
const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, Helvetica, Arial, sans-serif';

// Builds the on-brand kill screen with fully inline styles (survives the DOM
// wipe — no stylesheet dependency).
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

  const col = document.createElement("div");
  col.style.cssText =
    "display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;max-width:340px";

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
  title.textContent = tr("title", "Let's keep this space private");
  title.style.cssText = `margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${INK}`;

  const body = document.createElement("p");
  body.textContent = tr(
    "body",
    "Thiup hides its content while developer tools are open — it's part of how we protect an anonymous community. No hard feelings."
  );
  body.style.cssText = `margin:0;font-size:14px;line-height:1.55;color:${MUTED}`;

  const hint = document.createElement("p");
  hint.textContent = tr("hint", "Close developer tools and reload to continue.");
  hint.style.cssText = `margin:4px 0 0;font-size:12px;line-height:1.5;color:${FAINT}`;

  col.appendChild(logo);
  col.appendChild(title);
  col.appendChild(body);
  col.appendChild(hint);
  overlay.appendChild(col);
  return overlay;
}

function lockdown() {
  if (locked) return;
  locked = true;

  // Tear React down FIRST so it removes its own tree + portals cleanly (a raw
  // DOM wipe races React's portal cleanup and throws removeChild errors).
  try {
    if (teardownApp) teardownApp();
  } catch {
    /* ignore — we wipe next regardless */
  }

  // Replace the whole body with the message in one atomic swap.
  document.body.replaceChildren(buildOverlay());
  document.body.style.margin = "0";
  document.body.style.background = PAGE;
  document.title = tr("title", "Let's keep this space private");
}

let clearStreak = 0;
function tick() {
  const open = devtoolsOpen();
  if (!locked) {
    if (open) lockdown();
    return;
  }
  // Locked: reload once DevTools has been closed for two consecutive probes
  // (so a single fluke can't bounce us in and out).
  if (!open) {
    clearStreak += 1;
    if (clearStreak >= 2) window.location.reload();
  } else {
    clearStreak = 0;
  }
}

/**
 * Arms the guard. No-op when DEBUG is true (development) or if already armed.
 * Call once, after the app mounts.
 *
 * @param {object} [options]
 * @param {() => void} [options.onLockdown] - Tear down the app (e.g.
 *   `root.unmount()`) before the DOM is wiped, so React removes its portals
 *   cleanly.
 */
export default function initAntiSnoop(options) {
  if (armed || DEBUG || typeof window === "undefined") return;
  armed = true;
  teardownApp = (options && options.onLockdown) || null;
  // Capture the baseline gap once layout has settled (DevTools assumed closed
  // while the visitor is browsing), then watch. resize fires the moment a panel
  // docks/undocks, so the message and the reload feel instant; the poll is the
  // backstop.
  const raf = nativeRaf || window.requestAnimationFrame.bind(window);
  raf(() => {
    baseGapW = gapW();
    baseGapH = gapH();
    baselineReady = true;
    tick();
  });
  // Two INDEPENDENT drivers so the guard isn't disabled by killing one of them:
  // a setInterval AND a requestAnimationFrame watchdog (throttled to POLL_MS).
  // The generic "clear every timer id" trick (for (i…) clearInterval(i)) stops
  // the interval but NOT the rAF loop — and the caller holds neither id to
  // cancel it — so detection survives. resize makes dock/undock feel instant.
  window.setInterval(tick, POLL_MS);
  let lastRafTick = 0;
  const rafWatchdog = (ts) => {
    if (ts - lastRafTick >= POLL_MS) {
      lastRafTick = ts;
      tick();
    }
    raf(rafWatchdog);
  };
  raf(rafWatchdog);
  window.addEventListener("resize", tick, { passive: true });
}
