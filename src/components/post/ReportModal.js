import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../../utils/scrollLock";
import { useToast } from "../../contexts/ToastContext";
import { createReport } from "../../api/reportApi";
import styles from "../../styles/components/post/ReportModal.module.css";

/**
 * Report flow for a thread. Responsive (centered modal on desktop, bottom sheet
 * on mobile) via CSS, mirroring ThreadDetailsModal: portal to <body>, focus
 * trap, Escape, scrim click-outside, scroll lock. No Cancel button.
 *
 * Two steps: (1) pick a category, (2) "Other reason" free text. Submitting
 * POSTs to /reports/ (createReport) — anonymous: the reporter is derived
 * server-side from the request mask, never sent here. Re-reporting upserts.
 */

const MAX_REASON = 300;

const FlagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
  </svg>
);
const HarassIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
  </svg>
);
const HateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 15.5s1.5-2 4-2 4 2 4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const DangerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <line x1="12" y1="9" x2="12" y2="13.5" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const MinorsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const OtherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

// `key` is the backend category value (sent as-is). "minors" is `critical`:
// shown in red and flagged is_priority server-side for a separate priority/legal
// review path (see the backend Report model TODO).
const CATEGORIES = [
  { key: "spam_or_deception", labelKey: "report.spam", icon: <FlagIcon /> },
  { key: "harassment", labelKey: "report.harassment", icon: <HarassIcon /> },
  { key: "hate_speech", labelKey: "report.hate", icon: <HateIcon /> },
  { key: "dangerous_or_self_harm", labelKey: "report.dangerous", icon: <DangerIcon /> },
  { key: "minors", labelKey: "report.minors", icon: <MinorsIcon />, critical: true },
  { key: "other", labelKey: "report.other", icon: <OtherIcon /> },
];

function ReportModal({ post, onClose }) {
  const { t } = useTranslation();
  const showToast = useToast();
  const [step, setStep] = useState("categories"); // "categories" | "custom" | "thanks"
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Which predefined category is being sent (to highlight it + spinner).
  const [pendingCategory, setPendingCategory] = useState(null);
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const doneRef = useRef(null);
  const previousFocusRef = useRef(null);
  // In-flight request controller + mounted guard (avoid setState after close).
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useScrollLock(true);

  useEffect(() => {
    // Reset on (re)mount — StrictMode runs cleanup then setup again in dev, so
    // this must be set here (not only at useRef init) or the flag stays false.
    mountedRef.current = true;
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      // On close/unmount: cancel any in-flight send (silent) and block late
      // setState. Covers scrim/Escape close while sending.
      mountedRef.current = false;
      abortRef.current?.abort();
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  // Move focus to the step's primary control: the textarea (custom reason) or
  // the "Done" button (thank-you screen).
  useEffect(() => {
    if (step === "custom") textareaRef.current?.focus();
    else if (step === "thanks") doneRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll(
          'button, textarea, [href], [tabindex]:not([tabindex="-1"])'
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

  const submit = async (category) => {
    if (submitting) return; // anti double-send
    const controller = new AbortController();
    abortRef.current = controller;
    setSubmitting(true);
    setPendingCategory(category);
    // Anonymous report: the reporter is derived server-side from the request's
    // mask — never sent here. Re-reporting upserts on the backend.
    try {
      await createReport({
        threadId: post?.id || post?.uid,
        category,
        reason: category === "other" ? reason.trim() : "",
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      // Success → transition to the in-sheet thank-you screen (no toast).
      setStep("thanks");
    } catch (e) {
      // Cancelled (sheet closed mid-send): silent — no thank-you, no error.
      if (controller.signal.aborted || e?.name === "AbortError") return;
      if (!mountedRef.current) return;
      // Real failure → exit loading, surface error, allow retry.
      setSubmitting(false);
      setPendingCategory(null);
      showToast({ type: "error", message: t("report.failed") });
    }
  };

  const onCategory = (cat) => {
    if (cat.key === "other") {
      setStep("custom");
      return;
    }
    submit(cat.key);
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />

        {step === "thanks" ? (
          <div className={styles.thanks} role="status" aria-live="polite">
            <span className={styles.thanksIcon} aria-hidden="true">
              {/* Shield with a check inside — protection / safe space. */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a85432" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.5 5 5v6c0 4.4 3 7.1 7 8.5 4-1.4 7-4.1 7-8.5V5l-7-2.5z" />
                <path d="M9 11.5 11 13.5 15 9.5" />
              </svg>
            </span>
            <h2 className={styles.thanksTitle} id="report-title">
              {t("report.thanksTitle")}
            </h2>
            <p className={styles.thanksBody}>{t("report.thanksBody")}</p>
            <button
              ref={doneRef}
              type="button"
              className={styles.done}
              onClick={onClose}
            >
              {t("report.done")}
            </button>
            {/* Trust seal, kept separate from the body. */}
            <p className={styles.thanksAnon}>
              <svg className={styles.thanksAnonIcon} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {t("report.thanksAnon")}
            </p>
          </div>
        ) : (
          <>
            <h2 className={styles.title} id="report-title">
              {t("report.title")}
            </h2>

            {step === "categories" ? (
              <>
                <p className={styles.subtitle}>{t("report.subtitle")}</p>
                <div className={styles.options}>
                  {CATEGORIES.map((cat) => {
                    const isPending = pendingCategory === cat.key;
                    const isDimmed = submitting && !isPending;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        className={`${styles.option} ${
                          cat.critical ? styles.optionCritical : ""
                        } ${isPending ? styles.optionActive : ""} ${
                          isDimmed ? styles.optionDimmed : ""
                        }`}
                        onClick={() => onCategory(cat)}
                        disabled={submitting}
                        aria-busy={isPending}
                      >
                        <span className={styles.optionIcon}>{cat.icon}</span>
                        {t(cat.labelKey)}
                        {isPending && (
                          <span className={styles.optionSpinner} aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  value={reason}
                  maxLength={MAX_REASON}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("report.placeholder")}
                  aria-label={t("report.placeholder")}
                  disabled={submitting}
                />
                <div className={styles.counter}>
                  {reason.length}/{MAX_REASON}
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.back}
                    onClick={() => setStep("categories")}
                    disabled={submitting}
                  >
                    {t("report.back")}
                  </button>
                  <button
                    type="button"
                    className={styles.submit}
                    disabled={!reason.trim() || submitting}
                    aria-busy={submitting}
                    onClick={() => submit("other")}
                  >
                    {submitting ? (
                      <>
                        <span className={styles.submitSpinner} aria-hidden="true" />
                        {t("report.sendingShort")}
                      </>
                    ) : (
                      t("report.submit")
                    )}
                  </button>
                </div>
              </>
            )}

            <p className={styles.privacy}>{t("report.privacy")}</p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ReportModal;
