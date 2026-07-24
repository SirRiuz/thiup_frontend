import { useEffect, useState } from "react";

/**
 * Tracks the on-screen keyboard via the VisualViewport API (iOS / mobile).
 *
 * Returns `true` while the DOCKED keyboard is open. As a side effect it keeps
 * two CSS variables on <html> in sync with the visual viewport, so sticky/fixed
 * bars can follow the visible area instead of being pushed out of view when iOS
 * shifts the viewport:
 *   --kb-top          the visual viewport's top offset (for the top app bar)
 *   --kb-inset-bottom the keyboard height measured from the layout bottom (for
 *                     a bottom-fixed composer to ride just above the keyboard)
 *
 * Stability rules (the iOS jumping-bar bugs):
 *  - HYSTERESIS on the open/close decision: opens past 120px of viewport
 *    shrink, closes back under 60px. The iPad FLOATING/split keyboard hovers
 *    around a single threshold and made the state (and every bar bound to it)
 *    flicker; between the two thresholds the previous state holds.
 *  - The vars are only tracked WHILE open, pinned to 0 otherwise — iOS's
 *    elastic overscroll shifts vv.offsetTop/height on every scroll and the
 *    bars would drift with the bounce (Threads' bars stay put; so must ours).
 *  - Writes are coalesced into ONE requestAnimationFrame per burst: vv emits
 *    resize+scroll storms during pans, and per-event style writes thrash
 *    layout under the finger.
 *
 * No-op (returns false) where VisualViewport is unavailable (most desktops).
 */
const OPEN_THRESHOLD = 120; // px of viewport shrink → docked keyboard
const CLOSE_THRESHOLD = 60; // px — must drop below this to count as closed

export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const root = document.documentElement;
    let wasOpen = false;
    let raf = 0;

    const apply = () => {
      raf = 0;
      const shrink = window.innerHeight - vv.height;
      // Hysteresis: between the thresholds the previous state HOLDS.
      const kbOpen = wasOpen
        ? shrink > CLOSE_THRESHOLD
        : shrink > OPEN_THRESHOLD;
      wasOpen = kbOpen;
      setOpen(kbOpen);
      if (kbOpen) {
        root.style.setProperty("--kb-top", `${Math.max(0, vv.offsetTop)}px`);
        // How much the keyboard eats from the bottom = layout height − the
        // visible area's bottom edge (offsetTop + height).
        const insetBottom = Math.max(
          0,
          window.innerHeight - vv.height - vv.offsetTop
        );
        root.style.setProperty("--kb-inset-bottom", `${insetBottom}px`);
      } else {
        root.style.setProperty("--kb-top", "0px");
        root.style.setProperty("--kb-inset-bottom", "0px");
      }
    };
    const sync = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty("--kb-top");
      root.style.removeProperty("--kb-inset-bottom");
    };
  }, []);

  return open;
}
