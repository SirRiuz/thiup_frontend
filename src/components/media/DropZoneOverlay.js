import { useTranslation } from "react-i18next";
import styles from "../../styles/components/media/DropZoneOverlay.module.css";

function UploadIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

/**
 * Full-cover visual feedback while a file is dragged over a composer.
 * Reuses the app's existing brand-highlight recipe (the new-thread/new-reply
 * highlight: rgba(168,84,50,0.1) wash + a terracotta contour) — dashed here
 * so it reads as a drop target rather than a "just posted" confirmation.
 *
 * Purely decorative (pointer-events: none): the real dragenter/dragover/drop
 * listeners live on the composer's own container (useFileDrop), so this
 * layer never intercepts or fights those events. `active` gates the mount —
 * an actual mount/unmount (not just an opacity toggle) is what lets the CSS
 * @keyframes fade-in play on every drag, the same technique the app's own
 * modals use to animate in.
 */
function DropZoneOverlay({ active }) {
  const { t } = useTranslation();
  if (!active) return null;
  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.badge}>
        <UploadIcon />
        <span className={styles.label}>{t("post.dropToAttach")}</span>
      </div>
    </div>
  );
}

export default DropZoneOverlay;
