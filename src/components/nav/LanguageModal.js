import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage } from "../../i18n";
import { useScrollLock } from "../../utils/scrollLock";
import styles from "../../styles/components/nav/LanguageModal.module.css";

/**
 * UI language selection modal. Warm aesthetic (same palette as the rail:
 * surface #fdfcf8, border #e5e0d3, text #1a1a1a/#666, primary #1a1a1a —
 * never #FFFFFF). Smooth opening consistent with the ☰ menu.
 *
 * PORTAL to document.body: the rail (.rail / .bottomBar) uses `transform`,
 * and a `position: fixed` inside a transformed ancestor is positioned
 * relative to THAT ancestor (the ~68px capsule), not the viewport — that's
 * why without a portal the overlay and the card came out squashed inside the
 * rail. Mounted on the body, the fixed resolves against the viewport → full
 * overlay + centered card. The background scroll is blocked with the
 * centralized lock.
 *
 * Accessibility: role="dialog" + aria-modal, labeled by the title, close with
 * Escape or click on the backdrop, initial focus on the active option, simple
 * focus trap and focus restoration on close.
 *
 * Only changes the UI texts (live + persisted); does not touch the thread
 * content or the posts' language filter.
 */

// The label keys live in the `language` namespace of the translations.
const LANGUAGE_LABEL_KEYS = {
  en: "language.english",
  es: "language.spanish",
};

function LanguageModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const current = (i18n.language || "").split("-")[0];
  const dialogRef = useRef(null);
  const activeOptionRef = useRef(null);
  // Element that had focus before opening, to restore it on close.
  const previousFocusRef = useRef(null);

  // Blocks the background scroll while the modal is open (centralized lock
  // with a counter — coexists with splash/post without clobbering).
  useScrollLock(true);

  useEffect(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    // Initial focus on the selected option (or the dialog as a fallback).
    const target = activeOptionRef.current || dialogRef.current;
    if (target) target.focus();

    return () => {
      // Restore focus on close (if the element is still in the DOM).
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        // Focus trap: keep tabbing inside the dialog.
        const focusables = dialogRef.current?.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const choose = (lang) => {
    setLanguage(lang);
    onClose();
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        // Close only if the click starts on the backdrop (not inside the panel).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
        aria-describedby="language-modal-desc"
        ref={dialogRef}
        tabIndex={-1}
      >
        <h2 className={styles.title} id="language-modal-title">
          {t("language.title")}
        </h2>
        <p className={styles.description} id="language-modal-desc">
          {t("language.description")}
        </p>

        <div className={styles.options}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang === current;
            return (
              <button
                key={lang}
                type="button"
                className={`${styles.option} ${
                  isActive ? styles.optionActive : ""
                }`}
                aria-pressed={isActive}
                ref={isActive ? activeOptionRef : null}
                onClick={() => choose(lang)}
              >
                <span>{t(LANGUAGE_LABEL_KEYS[lang])}</span>
                {isActive && (
                  <svg
                    className={styles.check}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        <button type="button" className={styles.closeButton} onClick={onClose}>
          {t("language.close")}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default LanguageModal;
