import { useLayoutEffect, useState } from "react";

const VIEWPORT_MARGIN = 8;

/**
 * "Smart open" for a trigger-anchored dropdown (MenuSurface): flips the menu
 * to open ABOVE its trigger instead of below whenever there isn't enough
 * room below to fit it without being clipped by the viewport edge — the
 * same idea MediaContextMenu already applies (it clamps on both axes since
 * it's cursor-anchored), just for the trigger-anchored menus
 * (PostOptionsMenu's desktop popover, PostSortMenu), which used to always
 * open downward no matter how close the trigger was to the bottom of the
 * screen.
 *
 * Two-pass, no visible flash: the caller keeps rendering the menu at its
 * normal "below the trigger" position on the FIRST pass (so nothing about
 * the open animation changes for the common case); this hook measures the
 * menu's REAL height in a layout effect — which runs before the browser
 * paints — and, only if it would overflow, returns a corrected `top` to
 * override with. `null` means "no correction needed, keep your own
 * position" so callers don't have to special-case the common case.
 */
export default function useMenuVerticalFlip({ open, triggerRef, menuRef, gap = 6 }) {
  const [correctedTop, setCorrectedTop] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setCorrectedTop(null);
      return;
    }
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const r = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    if (spaceBelow >= menuHeight) {
      setCorrectedTop(null); // fits below as-is — the caller's own position stands
      return;
    }

    const spaceAbove = r.top - gap;
    // Prefer opening above when there's room; otherwise clamp to the
    // viewport's top edge — never worse than clipping at the bottom, and
    // never negative (off-screen above).
    const top =
      spaceAbove >= menuHeight
        ? r.top - gap - menuHeight
        : Math.max(VIEWPORT_MARGIN, window.innerHeight - menuHeight - VIEWPORT_MARGIN);
    setCorrectedTop(top);
  }, [open, triggerRef, menuRef, gap]);

  return correctedTop;
}
