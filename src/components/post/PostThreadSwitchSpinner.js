import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostThreadSwitchSpinner.module.css";

/**
 * Quiet loading row shown where the reply skeletons would sit, but only for
 * a same-instance ancestor-chain navigation (useThread's isSwitchingThread):
 * the OP already repainted instantly from the click's seed, and only the
 * real replies are still in flight in the background.
 *
 * The ring's motion is Threads' own circular spinner (decoded from their
 * CSS: the visible arc grows and shrinks via stroke-dasharray while easing
 * through their exact two-phase cubic-bezier curve — 0%→50% collapses the
 * arc to a point, 50%→100% regrows it while the dash pattern travels a full
 * lap via stroke-dashoffset, landing back on frame 0 for a seamless loop),
 * recolored to the app's warm accent instead of their neutral gray.
 */
function PostThreadSwitchSpinner() {
  const { t } = useTranslation();
  return (
    <div className={styles.row} aria-busy="true" aria-label={t("post.loadingReplies")}>
      <svg
        className={styles.spinner}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle className={styles.spinnerCircle} cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default PostThreadSwitchSpinner;
