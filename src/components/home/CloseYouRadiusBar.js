import styles from "../../styles/components/home/CloseYouRadiusBar.module.css";

// Radio expandible del Close You — presets acotados (el backend adapta
// la precisión geohash al radio; >25 km pasa a celdas gruesas).
const RADIUS_PRESETS = [15, 30, 50, 100];

/**
 * Radius control for Close You: "within X km" + preset chips.
 * Default 15 km; the choice persists across sessions (just the number —
 * the reader's location stays ephemeral).
 */
function CloseYouRadiusBar({ radius, onChange, isLoading }) {
  return (
    <div className={styles.bar}>
      <span className={styles.label}>within</span>
      <div className={styles.options}>
        {RADIUS_PRESETS.map((km) => (
          <button
            key={km}
            type="button"
            className={`${styles.chip} ${
              radius === km ? styles.chipActive : ""
            }`}
            onClick={() => {
              if (!isLoading && radius !== km) onChange(km);
            }}
            disabled={isLoading}
            aria-pressed={radius === km}
          >
            {km} km
          </button>
        ))}
      </div>
    </div>
  );
}

export default CloseYouRadiusBar;
