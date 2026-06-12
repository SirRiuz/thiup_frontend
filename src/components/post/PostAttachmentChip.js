import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostAttachmentChip.module.css";

/**
 * Format bytes as a short, human-friendly string.
 *   < 1 KB        → "512 B"
 *   < 1 MB        → "248 KB"
 *   1–9.9 MB     → "4.2 MB"
 *   >= 10 MB      → "12 MB"
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

function PhotoIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9b9591"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <div className={styles.videoOverlay}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="#fdfcf8" stroke="none">
        <polygon points="6 3 21 12 6 21" />
      </svg>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Compact horizontal chip for an attached file.
 *
 * Props:
 *   - attachment: { id, name, size, type ('image' | 'video'), progress, uploading, thumbnail }
 *   - onRemove:   handler invoked when the user clicks the X
 */
function PostAttachmentChip({ attachment, onRemove }) {
  const { t } = useTranslation();
  const { name, size, type, progress, uploading, thumbnail } = attachment;
  const isImage = type === "image";
  const isVideo = type === "video";

  return (
    <div className={styles.chip}>
      <div className={styles.thumbnail}>
        {isImage && thumbnail ? (
          <img src={thumbnail} alt="" className={styles.thumbnailImage} />
        ) : isVideo ? (
          <PlayIcon />
        ) : (
          <PhotoIcon />
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.name} title={name}>
          {name}
        </span>
        <span className={styles.size}>{formatBytes(size)}</span>
      </div>
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        aria-label={uploading ? t("attachment.cancelUpload") : t("attachment.remove")}
      >
        <CloseIcon />
      </button>
      {uploading && (
        <div
          className={styles.progressBar}
          style={{ width: `${Math.min(progress, 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )}
    </div>
  );
}

export default PostAttachmentChip;
