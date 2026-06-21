import { useEffect, useState } from "react";

/**
 * Tracks the on-screen keyboard via the VisualViewport API (iOS / mobile).
 *
 * Returns `true` while the keyboard is open. As a side effect it keeps a
 * `--kb-top` CSS variable on <html> equal to the visual viewport's top offset,
 * so sticky/fixed bars (e.g. the thread app bar) can follow the visible area
 * instead of being pushed out of view when iOS shifts the viewport.
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
      setOpen(window.innerHeight - vv.height > 120);
      root.style.setProperty("--kb-top", `${Math.max(0, vv.offsetTop)}px`);
    };

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      root.style.removeProperty("--kb-top");
    };
  }, []);

  return open;
}
