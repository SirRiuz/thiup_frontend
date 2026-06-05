import { formatCompactNumber } from "../../utils/formatNumber";
import styles from "../../styles/components/home/HomeFilterBar.module.css";

const OPTIONS = ["trending", "newest", "oldest"];

// label:   texto antes de las opciones. Default "feed" (home queda idéntico);
//          pasar null/"" para no mostrar nada.
// options: lista de opciones. Default el sort del feed (home queda idéntico);
//          la búsqueda pasa posts/tags/users.
// counts:  opcional { [option]: number } — muestra el count junto al label y
//          deshabilita opciones en 0 (tabs de búsqueda). Sin counts (sort),
//          comportamiento idéntico al original.
function HomeFilterBar({
  value,
  onChange,
  isLoading = false,
  label = "feed",
  options = OPTIONS,
  counts,
}) {
  const hasCounts = Boolean(counts);

  const handleClick = (option, isEmpty) => {
    if (isLoading || isEmpty) return;
    if (option === value) return;
    if (onChange) onChange(option);
  };

  return (
    <div className={styles.bar} role="tablist">
      {label ? <span className={styles.label}>{label}</span> : null}
      {options.map((option) => {
        const count = hasCounts ? counts[option] ?? 0 : null;
        const isEmpty = hasCounts && count === 0;
        const isActive = value === option;
        const isDisabled = (isLoading && !isActive) || isEmpty;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""} ${
              isDisabled ? styles.tabDisabled : ""
            }`}
            onClick={() => handleClick(option, isEmpty)}
          >
            <span>{option}</span>
            {/* Display abreviado (11509 → 11.5k); la lógica de disabled
                (isEmpty) sigue usando el número real. */}
            {hasCounts && (
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
