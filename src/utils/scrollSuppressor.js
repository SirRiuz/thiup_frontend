/**
 * Tooltip suppressor during scroll — a SINGLE global listener.
 *
 * CSS :hover tooltips get stuck while scrolling (the pointer stays
 * "over" the chip). This marks <body class="is-scrolling"> while there is
 * scroll and removes it ~200ms after it stops; the tooltips' CSS hides
 * them while the class is set.
 *
 * Idempotent: even if many cards call it, it only registers once.
 */
let installed = false;

export function ensureScrollSuppressor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  let timer = null;
  const onScroll = () => {
    document.body.classList.add("is-scrolling");
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      document.body.classList.remove("is-scrolling");
      timer = null;
    }, 200);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
}
