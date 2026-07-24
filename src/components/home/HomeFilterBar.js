import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { formatCompactNumber } from "../../utils/formatNumber";
import styles from "../../styles/components/home/HomeFilterBar.module.css";
import cx from "../../utils/cx";

const OPTIONS = ["trending", "newest", "oldest"];

// label:   DEPRECATED — kept for API compatibility but no longer rendered
//          (Threads' tab row has no eyebrow label).
// options: list of options. Default the feed sort (home stays identical);
//          search passes posts/tags/users.
// counts:  optional { [option]: number } — shows a small count badge next to
//          the label. The badge is shown ONLY for a positive, known count
//          (hidden while loading/unknown and at 0, to avoid noise/false 0s).
//          Counts do NOT disable the tab — every tab stays selectable.
// getOptionLabel: optional (option) => text to DISPLAY. The option's identity
//          (value/onChange) is still the internal string; only the visible
//          text is translated. Default: the option's own string.
// getOptionAriaLabel: optional (option, count) => string for the tab's
//          aria-label (e.g. include the count). Default: the visible label.
function HomeFilterBar({
  value,
  onChange,
  isLoading = false,
  label = "feed",
  options = OPTIONS,
  counts,
  getOptionLabel,
  getOptionAriaLabel,
}) {
  const hasCounts = Boolean(counts);
  const labelOf = getOptionLabel || ((option) => option);

  // When the row overflows (longer locales — e.g. the Spanish search tabs —
  // don't fit the column), the bar scrolls on the x axis; keep the ACTIVE
  // tab centered in view so the selection is never hidden off-screen.
  const barRef = useRef(null);
  const activeRef = useRef(null);
  useEffect(() => {
    const bar = barRef.current;
    const tab = activeRef.current;
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bar.scrollTo({
      left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [value]);

  // Sliding indicator: ONE ink bar positioned under the active tab via
  // transform/width, so switching tabs GLIDES it to the new cell. The bar is
  // placed with IMPERATIVE style writes (no React state): a state-driven
  // version re-rendered on every measurement and hit "maximum update depth"
  // when a profile remounted with cached data — writing to the node directly
  // makes a feedback loop impossible by construction. offsetLeft/offsetWidth
  // are content coordinates, so the bar travels with the scrolled row.
  const indicatorRef = useRef(null);
  const placeIndicator = useCallback(() => {
    const tab = activeRef.current;
    const node = indicatorRef.current;
    if (!tab || !node) return;
    node.style.width = `${tab.offsetWidth}px`;
    node.style.transform = `translateX(${tab.offsetLeft}px)`;
  }, []);
  // After EVERY render — any commit can move the cells (labels re-translate,
  // counts appear, the active tab grows its spinner). Runs before paint, so
  // the first frame is already in place (and mount never animates: the node
  // has never been painted when the first styles land).
  useLayoutEffect(placeIndicator);
  // Container resizes (viewport, rail collapse) move the cells without a
  // React render — reposition through the same imperative path.
  useEffect(() => {
    if (!barRef.current) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(placeIndicator);
    ro.observe(barRef.current);
    return () => ro.disconnect();
  }, [placeIndicator]);

  const handleClick = (option) => {
    if (isLoading) return;
    if (option === value) return;
    if (onChange) onChange(option);
  };

  return (
    <div className={styles.bar} role="tablist" ref={barRef}>
      {options.map((option) => {
        const count = hasCounts ? counts[option] : null;
        // Only a real, positive count gets a badge (no placeholder / no 0).
        const hasBadge = typeof count === "number" && count > 0;
        const isActive = value === option;
        const isDisabled = isLoading && !isActive;
        const ariaLabel = getOptionAriaLabel
          ? getOptionAriaLabel(option, count)
          : undefined;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            ref={isActive ? activeRef : undefined}
            aria-selected={isActive}
            aria-disabled={isDisabled}
            aria-label={ariaLabel}
            className={cx(styles.tab, isActive ? styles.tabActive : "", isDisabled ? styles.tabDisabled : "")}
            onClick={() => handleClick(option)}
          >
            <span className={styles.label}>
              {labelOf(option)}
              {/* The spinner hangs OFF the label (absolute, out of flow):
                  appearing/disappearing must never nudge the centered text
                  (the old inline spinner shifted it ~8px each way). */}
              {isLoading && isActive && (
                <span className={styles.tabSpinner} aria-hidden="true" />
              )}
            </span>
            {/* Abbreviated display (11509 → 11.5k). */}
            {hasBadge && (
              <span className={styles.count}>
                {formatCompactNumber(count)}
              </span>
            )}
          </button>
        );
      })}
      {/* Always mounted; sized/positioned imperatively (see placeIndicator).
          Starts at width 0 (CSS) → invisible until the first placement. */}
      <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
    </div>
  );
}

export default HomeFilterBar;
