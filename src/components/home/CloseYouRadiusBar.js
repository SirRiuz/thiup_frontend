import { useTranslation } from "react-i18next";
import styles from "../../styles/components/home/CloseYouRadiusBar.module.css";

// Expandable radius for Close You — bounded presets (the backend adapts the
// geohash precision to the radius; >25 km switches to coarse cells).
const RADIUS_PRESETS = [15, 30, 50, 100];

/**
 * Radius control for Close You: "within X km" + preset chips.
 * Default 15 km; the choice persists across sessions (just the number —
 * the reader's location stays ephemeral).
 */
function CloseYouRadiusBar({ radius, onChange, isLoading }) {
  const { t } = useTranslation();
  return (
    <div className={styles.bar}>
      <span className={styles.label}>{t("closeYou.within")}</span>
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
            {t("closeYou.radiusChip", { km })}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CloseYouRadiusBar;
