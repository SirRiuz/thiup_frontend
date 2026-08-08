import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../../utils/scrollLock";
import { useToast } from "../../contexts/ToastContext";
import cx from "../../utils/cx";
import styles from "../../styles/components/post/ThreadDetailsModal.module.css";

/**
 * "Thread details" panel (centered modal on desktop, bottom-sheet on mobile).
 * Reads REAL fields from the thread object already in memory (the same one that
 * renders the card) — no extra request when opening. Portal to <body> + focus
 * trap + Escape + click-outside, mirroring LanguageModal.
 *
 * PRIVACY: shows ONLY public thread metadata + a generic anonymous author.
 * Never anything that could correlate the author across threads (no persistent
 * mask hash, no IP, no location, no device). The shown ID is the THREAD's
 * public id, not the author's.
 */

const EMPTY = "—";

// Public thread metadata, derived from the post payload already loaded.
function buildDetails(post) {
  const reactionsTotal = (post?.reactions || []).reduce(
    (sum, r) => sum + (r.count ?? r.reaction_count ?? 0),
    0
  );
  return {
    threadId: post?.id || post?.uid || null, // public thread uid
    repliesCount: post?.repliesCount,
    reactionsTotal,
    publishedAt: post?.publishedAt || null, // absolute ISO timestamp
  };
}

const HashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="17" rx="2" />
    <line x1="16" y1="2.5" x2="16" y2="6.5" />
    <line x1="8" y1="2.5" x2="8" y2="6.5" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ReplyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const HeartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

function Row({ icon, label, children }) {
  return (
    <div className={styles.row}>
      <dt className={styles.key}>
        <span className={styles.keyIcon}>{icon}</span>
        {label}
      </dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

function ThreadDetailsModal({ post, onClose }) {
  const { t, i18n } = useTranslation();
  const showToast = useToast();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const copyTimerRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useScrollLock(true);
  const details = buildDetails(post);

  // Real publish date, localized to the active language. Falls back gracefully
  // if the timestamp is missing.
  let publishedAt = EMPTY;
  if (details.publishedAt) {
    const d = new Date(details.publishedAt);
    if (!Number.isNaN(d.getTime())) {
      publishedAt = new Intl.DateTimeFormat(i18n.language || "en", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    }
  }

  useEffect(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
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

  const copyId = async () => {
    if (!details.threadId) return;
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(details.threadId);
        ok = true;
      }
    } catch (e) {
      ok = false; // clipboard blocked (insecure context / permissions)
    }
    if (ok) {
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
      // Copy confirmation: text only, no icon (consistent with link-copied).
      showToast({ type: "success", message: t("toast.idCopied"), icon: "none" });
    } else {
      showToast({ type: "error", message: t("toast.copyFailed") });
    }
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className={cx(styles.iconButton, styles.closeButton, "springPressIcon")}
        onClick={onClose}
        aria-label={t("threadDetails.close")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="thread-details-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.head}>
          <h2 className={styles.title} id="thread-details-title">
            {t("threadDetails.title")}
          </h2>
        </div>

        <dl className={styles.rows}>
          <Row icon={<HashIcon />} label={t("threadDetails.threadId")}>
            {details.threadId ? (
              /* The profile's hash-pill language: the WHOLE mono pill is the
                 copy button — one obvious target, machine-data mono tone. */
              <button
                type="button"
                className={styles.idPill}
                onClick={copyId}
                aria-label={t("threadDetails.copy")}
                title={t("threadDetails.copy")}
              >
                <span className={styles.idText}>{details.threadId}</span>
                {copied ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                  </svg>
                )}
              </button>
            ) : (
              EMPTY
            )}
          </Row>

          <Row icon={<UserIcon />} label={t("threadDetails.author")}>
            {t("threadDetails.anonymous")}
          </Row>

          <Row icon={<CalendarIcon />} label={t("threadDetails.published")}>
            {publishedAt}
          </Row>

          <Row icon={<ReplyIcon />} label={t("threadDetails.replies")}>
            {details.repliesCount == null ? EMPTY : details.repliesCount}
          </Row>

          <Row icon={<HeartIcon />} label={t("threadDetails.reactions")}>
            {details.reactionsTotal}
          </Row>
        </dl>
      </div>
    </div>,
    document.body
  );
}

export default ThreadDetailsModal;
