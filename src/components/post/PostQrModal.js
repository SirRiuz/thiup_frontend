import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useScrollLock } from "../../utils/scrollLock";
import { useToast } from "../../contexts/ToastContext";
import { drawQrCard } from "../../services/qrCode";
import cx from "../../utils/cx";
import styles from "../../styles/components/post/PostQrModal.module.css";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}

/**
 * QR code panel, opened from the thread options menu — deliberately just the
 * code itself: the "modal" IS the card (see drawQrCard). Close/download are
 * NOT painted on top of the card — they float over the BACKDROP, outside the
 * card's own bounds, the same way ProfileAvatarModal's close sits at the
 * viewport's corner (not over the blown-up avatar) and MediaViewer's
 * controlsTop bar sits above the media stage rather than on it. No title
 * row, no hint paragraph, no wordmark — the code is self-explanatory and the
 * center badge already carries the brand. Portal to <body> + focus trap +
 * Escape + click-outside, same a11y contract as the app's other dialogs.
 */
function PostQrModal({ post, onClose }) {
  const { t } = useTranslation();
  const showToast = useToast();
  const canvasRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const threadId = post?.id || post?.uid || "";
  const url = threadId ? `${window.location.origin}/p/${threadId}` : "";

  useScrollLock(true);

  // Draws BEFORE paint so the canvas never flashes empty.
  useLayoutEffect(() => {
    if (!url || !canvasRef.current) return;
    drawQrCard(canvasRef.current, url);
  }, [url]);

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

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    canvas.toBlob((blob) => {
      setDownloading(false);
      if (!blob) {
        showToast({ type: "error", message: t("qrCode.downloadFailed") });
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `thiup-${threadId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    }, "image/png");
  };

  return createPortal(
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={t("qrCode.title")}
      ref={dialogRef}
      tabIndex={-1}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className={cx(styles.iconButton, styles.closeButton, "springPressIcon")}
        onClick={onClose}
        aria-label={t("qrCode.close")}
      >
        <CloseIcon />
      </button>

      <button
        type="button"
        className={cx(styles.iconButton, styles.downloadButton, "springPressIcon")}
        onClick={handleDownload}
        disabled={downloading}
        aria-busy={downloading || undefined}
        aria-label={t("qrCode.download")}
      >
        {downloading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          <DownloadIcon />
        )}
      </button>

      <div className={styles.panel}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </div>,
    document.body
  );
}

export default PostQrModal;
