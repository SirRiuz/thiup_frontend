import { formatCompactNumber } from "../../utils/formatNumber";
import styles from "../../styles/components/home/HomeFilterBar.module.css";

const OPTIONS = ["trending", "newest", "oldest"];

// label:   text before the options. Default "feed" (home stays identical);
//          pass null/"" to show nothing.
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

  const handleClick = (option) => {
    if (isLoading) return;
    if (option === value) return;
    if (onChange) onChange(option);
  };

  return (
    <div className={styles.bar} role="tablist">
      {label ? <span className={styles.label}>{label}</span> : null}
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
            aria-selected={isActive}
            aria-disabled={isDisabled}
            aria-label={ariaLabel}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""} ${
              isDisabled ? styles.tabDisabled : ""
            }`}
            onClick={() => handleClick(option)}
          >
            <span>{labelOf(option)}</span>
            {/* Abbreviated display (11509 → 11.5k). */}
            {hasBadge && (
              <span className={styles.count}>
                {formatCompactNumber(count)}
              </span>
            )}
            {isLoading && isActive && (
              <span className={styles.tabSpinner} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default HomeFilterBar;
