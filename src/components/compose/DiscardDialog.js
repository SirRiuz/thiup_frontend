import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/compose/DiscardDialog.module.css";

/**
 * DiscardDialog — Threads' exact "Discard thread?" confirm: a compact
 * centered dialog with the title and STACKED full-width actions split by
 * hairlines — Discard (danger red) on top, Cancel below.
 *
 * Shown by the composer dialogs when closing with a non-empty draft (text or
 * attached media). Escape/backdrop = keep editing (the safe choice).
 */
function DiscardDialog({ title, onDiscard, onKeep }) {
  const { t } = useTranslation();
  const keepRef = useRef(null);

  // Initial focus on the SAFE action (Cancel), like the app's other dialogs.
  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  // Escape keeps editing. capture + stopImmediatePropagation so the composer
  // modal's own Escape handler (which would try to close again) never fires.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onKeep();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKey, { capture: true });
  }, [onKeep]);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onKeep();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-dialog-title"
        className={styles.dialog}
      >
        <h2 id="discard-dialog-title" className={styles.title}>
          {title}
        </h2>
        <button
          type="button"
          className={styles.discardButton}
          onClick={onDiscard}
        >
          {t("compose.discard")}
        </button>
        <button
          ref={keepRef}
          type="button"
          className={styles.keepButton}
          onClick={onKeep}
        >
          {t("compose.cancel")}
        </button>
      </div>
    </div>
  );
}

export default DiscardDialog;
