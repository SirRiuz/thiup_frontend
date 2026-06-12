import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../utils/scrollLock";
import BrandLogo from "./BrandLogo";
import styles from "../styles/components/WelcomeModal.module.css";

/**
 * Welcome modal — shown ONCE on the user's first visit. Greets them, states the
 * mission, and lists the community rules (including protecting minors). Pressing
 * "I understand" marks it seen (localStorage) and closes; it does not reappear
 * on later visits/reloads.
 *
 * Reused from the LanguageModal pattern: PORTAL to document.body (the rail uses
 * `transform`, and a `position: fixed` inside a transformed ancestor resolves
 * against that ancestor, not the viewport — the portal restores a full overlay
 * + centered card), centralized scroll lock, warm aesthetic (surface #fdfcf8,
 * border #e5e0d3, warm icons #b8845f, dark primary #1a1a1a — never #FFFFFF).
 *
 * Accessibility: role="dialog" + aria-modal, labeled by the title and described
 * by the mission, Escape / backdrop to close, simple focus trap, initial focus
 * on the primary button, focus restoration on close.
 *
 * Controlled component: it always renders while mounted (like LanguageModal).
 * Two modes via the `mandatory` prop:
 *   - mandatory (first visit, from App): the ONLY way to close is "I
 *     understand"; Escape and backdrop clicks are ignored, role is
 *     "alertdialog". The "seen" flag is set ONLY on accept — so any evasion
 *     (reload/back/close tab) leaves it unset and the modal reappears.
 *   - dismissible (reopened from ☰ "About"): Escape/backdrop close, and the
 *     flag is NEVER touched (it's an informational re-read).
 * The modal lives in the App shell (above <Routes>), so internal navigation
 * never unmounts it — no history hacks needed.
 */

// Persistence key for "the welcome was already seen".
export const WELCOME_STORAGE_KEY = "thiup:welcome_seen";

/** True if the user has already seen (and dismissed) the welcome modal. */
export function hasSeenWelcome() {
  try {
    return window.localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
  } catch {
    // localStorage unavailable (private mode, etc.): treat as not seen so the
    // welcome still shows; it just won't persist across reloads.
    return false;
  }
}

/** Persists that the welcome has been seen. */
function markWelcomeSeen() {
  try {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, "1");
  } catch {
    // Ignore: the live close still works, it just doesn't persist.
  }
}

// The 4 rules, in order. Each maps to a warm inline SVG icon + i18n lead/text.
const RULES = [
  {
    key: "anonymity",
    // Eye-off — stay anonymous.
    icon: (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ),
  },
  {
    key: "respect",
    // Speech bubble — be respectful.
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
  },
  {
    key: "protect",
    // Shield — protect each other.
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    key: "minors",
    // Heart — protect minors.
    icon: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
  },
];

function WelcomeModal({ onClose, mandatory = false }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const primaryButtonRef = useRef(null);
  // Element focused before opening, to restore it on close.
  const previousFocusRef = useRef(null);

  // Block the background scroll while open (centralized counter lock —
  // coexists with splash/post lockers without clobbering).
  useScrollLock(true);

  // Aceptar ("Entendido"): ÚNICA vía de cierre en modo obligatorio. El
  // flag de "visto" se setea SOLO aquí y SOLO en modo obligatorio — una
  // evasión (recarga/atrás/cerrar pestaña) no lo marca y el modal
  // reaparece. Reabrir desde "Acerca de" (dismissible) NUNCA toca el flag.
  const accept = () => {
    if (mandatory) markWelcomeSeen();
    onClose();
  };

  // Cierre por Escape / click afuera — IGNORADO en modo obligatorio.
  const dismiss = () => {
    if (mandatory) return;
    onClose();
  };

  useEffect(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    // Initial focus on the primary action (or the dialog as a fallback).
    const target = primaryButtonRef.current || dialogRef.current;
    if (target) target.focus();

    return () => {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        // Modo obligatorio: Escape NO cierra (dismiss es no-op).
        e.stopPropagation();
        dismiss();
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
    // close is stable in practice (only setters/storage); deps intentionally
    // empty to mirror the LanguageModal pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        // Cierra solo si el press empieza en el backdrop (no en la card) —
        // y solo en modo descartable (dismiss es no-op si es obligatorio).
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className={styles.panel}
        // Obligatorio → alertdialog (exige acknowledgement); descartable →
        // dialog. Ambos con focus trap y aria al título + misión.
        role={mandatory ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        aria-describedby="welcome-modal-mission"
        ref={dialogRef}
        tabIndex={-1}
      >
        {/* Brand icon (thread + dot) — same tile as the splash/rail. */}
        <BrandLogo size={64} className={styles.logo} />

        <h2 className={styles.title} id="welcome-modal-title">
          {t("welcome.title")}
        </h2>
        <p className={styles.mission} id="welcome-modal-mission">
          {t("welcome.mission")}
        </p>

        <p className={styles.rulesHeader}>{t("welcome.rulesHeader")}</p>

        <ul className={styles.rules}>
          {RULES.map((rule) => (
            <li key={rule.key} className={styles.rule}>
              <svg
                className={styles.ruleIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {rule.icon}
              </svg>
              <span className={styles.ruleText}>
                <span className={styles.ruleLead}>
                  {t(`welcome.rules.${rule.key}.lead`)}
                </span>{" "}
                {t(`welcome.rules.${rule.key}.text`)}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={styles.button}
          ref={primaryButtonRef}
          onClick={accept}
        >
          {t("welcome.button")}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default WelcomeModal;
