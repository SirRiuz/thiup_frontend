import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/media/MediaDetailsModal.module.css";

// Real file extension from the media URL's last path segment — never
// fabricated, just read off the actual filename (a presigned query string,
// if any, lives past the "?" and never reaches `pathname`).
function formatFromUrl(url) {
  try {
    const { pathname } = new URL(url, window.location.href);
    const seg = pathname.split("/").pop() || "";
    const dot = seg.lastIndexOf(".");
    if (dot === -1 || dot === seg.length - 1) return null;
    return seg.slice(dot + 1).toUpperCase();
  } catch (err) {
    return null;
  }
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Simplified W:H ratio (e.g. 1920x1080 → "16:9") — a real derived value,
// never a guess: only rendered when the backend actually stored dimensions.
function simplifiedRatio(width, height) {
  if (!width || !height) return null;
  const d = gcd(width, height) || 1;
  return `${width / d}:${height / d}`;
}

const TypeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const FormatIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
const DimensionsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);
const RatioIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6.13 1 6 16a2 2 0 0 0 2 2h15" />
    <path d="M1 6.13 16 6a2 2 0 0 1 2 2v15" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const LayersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
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

/**
 * "Media details" panel, opened from the fullscreen viewer's right-click
 * menu (both images and videos). Reads REAL fields off the media item
 * already in memory — width/height/type/isNsfw are the entire public shape
 * the backend sends for a file (see ThreadMediaSerializer); everything
 * shown here is either that or a value plainly DERIVED from it (the file
 * extension off the URL, the simplified aspect ratio, the position in the
 * set) — never a fabricated byte size, filename or upload date the backend
 * doesn't actually provide.
 *
 * Escape is owned by MediaViewer's own keydown handler (it already shields
 * the viewer itself from closing underneath any open sub-layer) — this
 * component only owns its own Tab focus trap and initial focus.
 */
function MediaDetailsModal({ item, index, total, onClose }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

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
    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
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
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const isVideo = item?.type === "video";
  const width = item?.width || 0;
  const height = item?.height || 0;
  const format = item?.url ? formatFromUrl(item.url) : null;
  const ratio = simplifiedRatio(width, height);

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
        aria-labelledby="media-details-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.head}>
          <h2 className={styles.title} id="media-details-title">
            {t("media.details.title")}
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t("media.details.close")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <dl className={styles.rows}>
          <Row icon={<TypeIcon />} label={t("media.details.type")}>
            {t(isVideo ? "media.details.typeVideo" : "media.details.typeImage")}
          </Row>

          <Row icon={<FormatIcon />} label={t("media.details.format")}>
            {format || t("media.details.unknown")}
          </Row>

          <Row icon={<DimensionsIcon />} label={t("media.details.dimensions")}>
            {width && height ? `${width} × ${height}px` : t("media.details.unknown")}
          </Row>

          {ratio && (
            <Row icon={<RatioIcon />} label={t("media.details.aspectRatio")}>
              {ratio}
            </Row>
          )}

          <Row icon={<EyeOffIcon />} label={t("media.details.sensitive")}>
            {t(item?.isNsfw ? "media.details.yes" : "media.details.no")}
          </Row>

          {total > 1 && (
            <Row icon={<LayersIcon />} label={t("media.details.position")}>
              {t("media.details.positionValue", { current: index + 1, total })}
            </Row>
          )}
        </dl>
      </div>
    </div>,
    document.body
  );
}

export default MediaDetailsModal;
