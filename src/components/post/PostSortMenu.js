import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostSortMenu.module.css";

// Minimum gap between the menu and the viewport edges (mobile overflow fix).
const VIEWPORT_MARGIN = 8;

// Two options (Threads-style). `value` keeps the EXISTING backend sort keys so
// the ordering logic (useThread.buildReplyOrdering) stays untouched:
//   Destacados (top)    → "trending" (-reactions_count, most relevant first)
//   Recientes  (recent) → "newest"   (-create_at, newest first)
const OPTIONS = [
  { value: "trending", labelKey: "post.sortTop", descKey: "post.sortTopDesc" },
  { value: "newest", labelKey: "post.sortRecent", descKey: "post.sortRecentDesc" },
];

const SortIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4v16M7 4 4 7M7 4l3 3" />
    <path d="M17 20V4M17 20l3-3M17 20l-3-3" />
  </svg>
);

const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const Check = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
);

function PostSortMenu({ value, onChange, isLoading = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Horizontal shift (px) applied to the menu so it ALWAYS fits in the
  // viewport — the menu opens to the right and this nudges it left when the
  // trigger sits near the screen edge (mobile).
  const [shiftX, setShiftX] = useState(0);
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
    const baseLeft = wrapper.getBoundingClientRect().left;
    const width = menu.offsetWidth;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width;
    let shift = 0;
    if (baseLeft > maxLeft) shift = maxLeft - baseLeft; // would overflow right
    if (baseLeft + shift < VIEWPORT_MARGIN) {
      shift = VIEWPORT_MARGIN - baseLeft; // never off the left either
    }
    setShiftX(shift);
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
        <div
          className={styles.menu}
          role="menu"
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
                className={`${styles.option} ${
                  isActive ? styles.optionActive : ""
                }`}
                onClick={() => select(option)}
              >
                <span className={styles.optionText}>
                  <span className={styles.optionName}>{t(option.labelKey)}</span>
                  <span className={styles.optionDesc}>{t(option.descKey)}</span>
                </span>
                <span
                  className={`${styles.check} ${
                    isActive ? styles.checkVisible : ""
                  }`}
                  aria-hidden="true"
                >
                  <Check />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PostSortMenu;
