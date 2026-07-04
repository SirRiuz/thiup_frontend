import { useEffect } from "react";

/**
 * Mobile: a "surface screen" (thread view, home) renders as a full-bleed
 * #fdfcf8 sheet, so every layer that can surface during an iOS
 * elastic-overscroll rubber-band must be painted the same color — otherwise
 * the warm #f7f5f0 shows as a mismatched strip when you stretch the scroll.
 * Three layers matter:
 *   • <html>  — fills the overscroll canvas (top rubber-band).
 *   • <body>  — its box can show through at the edges.
 *   • AppShell wrapper (the page's parent) — it's #f7f5f0 with a mobile
 *     padding-bottom, so a warm strip would sit below the page at the bottom
 *     rubber-band.
 *
 * Scoped to the mounting route; every touched element is restored on unmount
 * so other screens keep their #f7f5f0. REACTIVE to the breakpoint: it
 * re-applies on every matchMedia change (resize, rotation, DevTools device
 * toggle) — on desktop it restores the original values, so the override never
 * leaks to the desktop overscroll.
 *
 * @param {React.RefObject} pageRef  ref to the screen's root .page element
 *   (used to reach its AppShell parent).
 */
export default function useMobileSurfacePage(pageRef) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia("(max-width: 700px)");
    const targets = [
      document.documentElement,
      document.body,
      pageRef.current && pageRef.current.parentElement,
    ].filter(Boolean);
    // Capture the ORIGINAL inline values once, so desktop restores exactly to
    // them (empty → the stylesheet's #f7f5f0).
    const prev = targets.map((el) => el.style.backgroundColor);
    const apply = () => {
      targets.forEach((el, i) => {
        el.style.backgroundColor = mql.matches ? "#fdfcf8" : prev[i];
      });
    };
    apply();
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      targets.forEach((el, i) => {
        el.style.backgroundColor = prev[i];
      });
    };
    // pageRef is a stable ref object; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
