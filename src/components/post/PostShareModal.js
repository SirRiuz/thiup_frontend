import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../../utils/scrollLock";
import cx from "../../utils/cx";
import styles from "../../styles/components/post/PostShareModal.module.css";

// Simplified, recognizable single-path renditions of each platform's mark
// (the common open-icon-set style — not the literal trademarked asset).
// Filled, not outline: these are brand logos riding a colored badge, not
// app-chrome glyphs, so they follow a different (solid) convention on
// purpose — same reasoning ThreadMedia's mono trending badge etc. already
// use real-world tone where it matters.
const WhatsAppIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.77.46 3.45 1.34 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.09c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.11.11-1.8-.11-.41-.13-.95-.31-1.63-.6-2.87-1.24-4.74-4.13-4.89-4.32-.14-.2-1.17-1.56-1.17-2.98s.75-2.11 1.02-2.4c.26-.29.57-.36.76-.36h.55c.18 0 .41-.07.64.49.24.57.81 1.97.88 2.11.07.15.12.32.02.51-.09.2-.14.32-.28.49-.14.17-.29.38-.42.51-.14.14-.29.29-.12.57.16.29.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.26 1.39.29.14.46.12.63-.07.17-.2.72-.84.92-1.13.19-.29.38-.24.64-.14.26.09 1.66.78 1.95.93.28.14.47.21.53.33.07.13.07.72-.17 1.4Z" />
  </svg>
);
const XIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const FacebookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.878h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.918 8.437-9.94z" />
  </svg>
);
const EmailIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);
// Same glyph as the menu trigger's "Share" row — Feather's share-2 (three
// linked nodes), the generic action for "more apps" via the OS share sheet.
const NativeShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * "Share" panel, opened from the thread options menu — lets the user hand
 * the thread's own permalink (`/p/:id`, same URL "Copy link" copies) to
 * WhatsApp, X, Facebook, Email, or (where the browser exposes it) the OS's
 * own native share sheet, which lists every app actually installed.
 *
 * PRIVACY: only the generic caption ("Check out this thread on Thiup") and
 * the bare link ever leave the app — never the thread's own text/author,
 * matching the app's rule that every shareable surface (OG image, "Copy
 * link", the QR code) stays generic. Facebook's own dialog additionally
 * only reads the URL (no custom text field), so it can only ever show the
 * app's static brand OG card.
 *
 * Each platform opens through its real share-intent URL in a new tab/popup
 * — on mobile this resolves straight into the installed app (WhatsApp's
 * wa.me link in particular is the platform's own universal link); on
 * desktop it's the standard share popup every site uses. Same canonical
 * "details panel" chrome as ThreadDetailsModal/ReportModal (centered modal
 * on desktop, bottom sheet on mobile).
 */
function PostShareModal({ post, onClose }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useScrollLock(true);

  const threadId = post?.id || post?.uid || "";
  const url = threadId ? `${window.location.origin}/p/${threadId}` : "";
  const caption = t("share.genericCaption");
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
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

  // A real popup (not just a background tab) — the established pattern for
  // every "share to X" button on the web; on mobile the target URL itself
  // (e.g. wa.me) is what redirects into the installed app, this just opens
  // the destination.
  const openPopup = (shareUrl) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=640");
  };

  const OPTIONS = [
    {
      key: "whatsapp",
      label: t("share.whatsapp"),
      icon: <WhatsAppIcon />,
      bg: "#25D366",
      onSelect: () =>
        openPopup(`https://wa.me/?text=${encodeURIComponent(`${caption} ${url}`)}`),
    },
    {
      key: "x",
      label: t("share.x"),
      icon: <XIcon />,
      bg: "#000000",
      onSelect: () =>
        openPopup(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(caption)}`
        ),
    },
    {
      key: "facebook",
      label: t("share.facebook"),
      icon: <FacebookIcon />,
      bg: "#1877F2",
      onSelect: () =>
        openPopup(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        ),
    },
    {
      key: "email",
      label: t("share.email"),
      icon: <EmailIcon />,
      bg: "#1a1a1a",
      onSelect: () => {
        const subject = encodeURIComponent(t("share.emailSubject"));
        const body = encodeURIComponent(`${caption}\n\n${url}`);
        // Navigates THIS tab (not a popup): the OS mail client takes over
        // and the tab stays put — a popup here would just leave a blank one.
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      },
    },
    ...(canNativeShare
      ? [
          {
            key: "native",
            label: t("share.more"),
            icon: <NativeShareIcon />,
            bg: "#1a1a1a",
            onSelect: async () => {
              try {
                await navigator.share({ title: caption, url });
              } catch (err) {
                /* user dismissed the OS sheet — not an error */
              }
            },
          },
        ]
      : []),
  ];

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
        aria-labelledby="share-modal-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.head}>
          <h2 className={styles.title} id="share-modal-title">
            {t("share.title")}
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t("share.close")}
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.grid}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={cx(styles.option, "springPress")}
              onClick={opt.onSelect}
            >
              <span className={styles.badge} style={{ background: opt.bg }}>
                {opt.icon}
              </span>
              <span className={styles.label}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PostShareModal;
