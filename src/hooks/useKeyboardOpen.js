import { useEffect, useState } from "react";

/**
 * Tracks the on-screen keyboard via the VisualViewport API (iOS / mobile).
 *
 * Returns `true` while the keyboard is open. As a side effect it keeps two CSS
 * variables on <html> in sync with the visual viewport, so sticky/fixed bars can
 * follow the visible area instead of being pushed out of view when iOS shifts
 * the viewport:
 *   --kb-top         the visual viewport's top offset (for the top app bar)
 *   --kb-inset-bottom the keyboard height measured from the layout bottom (for a
 *                     bottom-fixed composer to ride just above the keyboard)
 *
 * No-op (returns false) where VisualViewport is unavailable (most desktops).
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const root = document.documentElement;
    const sync = () => {
      // The keyboard shrinks the visual viewport well below the layout height.
      const kbOpen = window.innerHeight - vv.height > 120;
      setOpen(kbOpen);
      // Only track the viewport offsets WHILE the keyboard is open. When it's
      // closed we pin both to 0 — otherwise iOS's elastic overscroll (rubber-
      // band) briefly shifts vv.offsetTop / vv.height on every scroll event, and
      // the bars bound to these vars (thread app bar `top`, composer `bottom`)
      // would drift with the bounce. Threads' bars stay put; so must ours.
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

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      root.style.removeProperty("--kb-top");
      root.style.removeProperty("--kb-inset-bottom");
    };
  }, []);

  return open;
}
