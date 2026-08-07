import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import MenuSurface, { menuStyles } from "../menu/MenuSurface";
import styles from "../../styles/components/post/PostSortMenu.module.css";
import cx from "../../utils/cx";

// Minimum gap between the menu and the viewport edges (mobile overflow fix).
const VIEWPORT_MARGIN = 8;

// Two options (Threads' exact sort menu: name-only rows, no descriptions).
// `value` keeps the EXISTING backend sort keys so the ordering logic
// (useThread.buildReplyOrdering) stays untouched:
//   Top    → "trending" (-reactions_count, most relevant first)
//   Recent → "newest"   (-create_at, newest first)
const OPTIONS = [
  { value: "trending", labelKey: "post.sortTop" },
  { value: "newest", labelKey: "post.sortRecent" },
];

// Threads' EXACT "Sort" glyph (two opposed arrows, filled path lifted
// verbatim), at their 16px trigger size.
const SortIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M9.29 15.74 7 18.03V3.436a1 1 0 0 0-2 0v14.599l-2.296-2.295a1 1 0 0 0-1.414 1.414l4.002 4a1.001 1.001 0 0 0 1.416 0l3.996-4A1 1 0 0 0 9.29 15.74zm13.42-9.012-4.002-4a1 1 0 0 0-1.416 0l-3.997 4a1 1 0 0 0 1.414 1.414L17 5.849v14.597a1 1 0 0 0 2 0V5.848l2.295 2.294a1 1 0 1 0 1.414-1.414z" />
  </svg>
);

// Threads' EXACT chevron (their "More" filled path), at their 12px size.
const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M20.70703 8.29297C21.09755 8.68349 21.09755 9.31651 20.70703 9.70703L12.707 17.707C12.3165 18.0976 11.6835 18.0976 11.293 17.707L3.293 9.70703C2.9024 9.31651 2.9024 8.68349 3.293 8.29297C3.6835 7.90245 4.3165 7.90245 4.707 8.29297L12 15.5859L19.29297 8.29297C19.68349 7.90245 20.31651 7.90245 20.70703 8.29297Z" />
  </svg>
);

// Threads' EXACT "Checkmark: selected" glyph (filled path lifted verbatim),
// at their 16px menu size.
const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M20.293 5.29297C20.6835 4.90245 21.3165 4.90245 21.707 5.29297C22.0975 5.68349 22.0975 6.31651 21.707 6.70703L9.70702 18.707C9.31649 19.0976 8.68348 19.0976 8.29295 18.707L2.29295 12.707C1.90243 12.3165 1.90243 11.6835 2.29295 11.293C2.65907 10.9269 3.23807 10.9043 3.63084 11.2246L3.70702 11.293L8.99999 16.5859L20.293 5.29297Z" />
  </svg>
);

function PostSortMenu({ value, onChange, isLoading = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Horizontal shift (px) applied to the menu so it ALWAYS fits in the
  // viewport — the menu opens to the right and this nudges it left when the
  // trigger sits near the screen edge (mobile).
  const [shiftX, setShiftX] = useState(0);
  // Smart open: grow the menu UPWARD from the trigger instead of down past
  // the viewport when there isn't enough room below (see recalcShift).
  const [openUp, setOpenUp] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  const activeOption = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

  // Measure the menu vs the viewport and compute the shift that keeps it
  // inside (base anchor is left:0 → opens to the right). Same approach as
  // PostReactionPicker.
  const recalcShift = useCallback(() => {
    const wrapper = wrapperRef.current;
    const menu = menuRef.current;
    if (!wrapper || !menu) return;
    const rect = wrapper.getBoundingClientRect();
    const width = menu.offsetWidth;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width;
    let shift = 0;
    if (rect.left > maxLeft) shift = maxLeft - rect.left; // would overflow right
    if (rect.left + shift < VIEWPORT_MARGIN) {
      shift = VIEWPORT_MARGIN - rect.left; // never off the left either
    }
    setShiftX(shift);

    // Smart open (same idea as PostOptionsMenu's popover / MediaContextMenu):
    // flip above the trigger when there isn't enough room below to avoid
    // being clipped by the viewport edge.
    const height = menu.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - 6;
    const spaceAbove = rect.top - 6;
    setOpenUp(height > 0 && spaceBelow < height && spaceAbove > spaceBelow);
  }, []);

  // Pre-paint: measure and reposition BEFORE painting (no flash); recompute
  // on resize while open.
  useLayoutEffect(() => {
    if (!open) return undefined;
    recalcShift();
    window.addEventListener("resize", recalcShift);
    return () => window.removeEventListener("resize", recalcShift);
  }, [open, recalcShift]);

  // Close on click-outside and Escape; Escape returns focus to the trigger.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close on SCROLL: an anchored menu shouldn't float misaligned when the
  // content moves. capture:true because scroll does not bubble.
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener("scroll", close, { capture: true, passive: true });
    return () =>
      document.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  // Move focus to the active option when the menu opens.
  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, OPTIONS.findIndex((o) => o.value === value));
    optionRefs.current[idx]?.focus();
  }, [open, value]);

  const select = (option) => {
    onChange?.(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const current = optionRefs.current.findIndex((el) => el === document.activeElement);
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const next = (current + dir + OPTIONS.length) % OPTIONS.length;
    optionRefs.current[next]?.focus();
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("post.sort")}
      >
        <span className={styles.triggerIcon}>
          <SortIcon />
        </span>
        <span className={styles.triggerLabel}>{t(activeOption.labelKey)}</span>
        {isLoading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          <span className={styles.chevron}>
            <Chevron />
          </span>
        )}
      </button>

      {open && (
        // The canonical MenuSurface panel (Threads' exact dropdown) anchored
        // under the trigger; rows are Threads' sort menu: name + trailing
        // check on the selected one (the check IS the selection signal).
        <MenuSurface
          className={cx(styles.menu, openUp ? styles.menuUp : "")}
          ref={menuRef}
          style={{ left: shiftX }}
          onKeyDown={onMenuKeyDown}
        >
          {OPTIONS.map((option, i) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={menuStyles.item}
                onClick={() => select(option)}
              >
                {t(option.labelKey)}
                <span
                  className={cx(
                    menuStyles.itemIcon,
                    menuStyles.itemIconRight,
                    styles.check,
                    isActive ? styles.checkVisible : ""
                  )}
                  aria-hidden="true"
                >
                  <Check />
                </span>
              </button>
            );
          })}
        </MenuSurface>
      )}
    </div>
  );
}

export default PostSortMenu;
