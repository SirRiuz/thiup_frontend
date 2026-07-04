import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostScanResult.module.css";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function PhotoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9b9591" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9b9591" strokeWidth="1.5">
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="m22 8-6 4 6 4V8Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Before/after compression comparison shown inside the details panel.
function CompressionView({ compression, t }) {
  if (!compression || compression.status === "queued" || compression.status === "compressing") {
    return (
      <div className={styles.compress}>
        <span className={styles.compLoading}>
          <span className={styles.spinner} aria-hidden="true" />
          {t("scan.compressing")}
        </span>
      </div>
    );
  }
  if (compression.status === "error" || !compression.report) {
    return (
      <div className={styles.compress}>
        <span className={`${styles.compLoading} ${styles.statusError}`}>
          {t("scan.compressError")}
        </span>
      </div>
    );
  }

  const r = compression.report;
  const up = r.savingsPct < 0;
  const savingsText = `${r.savingsPct >= 0 ? "−" : "+"}${Math.abs(r.savingsPct)}% · ${
    up ? t("scan.larger") : t("scan.saving")
  }`;

  return (
    <div className={styles.compress}>
      <div className={styles.compressHead}>
        <span className={styles.compressTitle}>{t("scan.compressTitle")}</span>
        <span className={styles.chips}>
          <span className={`${styles.savings} ${up ? styles.savingsUp : ""}`}>
            {savingsText}
          </span>
          {r.dominantColor && (
            <span
              className={styles.colorChip}
              style={{ background: r.dominantColor, color: r.dominantFg }}
              title={t("scan.dominantColor")}
            >
              {r.dominantColor}
            </span>
          )}
        </span>
      </div>
      <div className={styles.compareGrid}>
        <div className={styles.col}>
          <span className={styles.colHead}>{t("scan.before")}</span>
          <dl className={styles.kv}>
            <dt>{t("scan.format")}</dt>
            <dd>{r.formatBefore}</dd>
            <dt>{t("scan.dimensions")}</dt>
            <dd>{`${r.width}×${r.height}`}</dd>
            <dt>{t("scan.weight")}</dt>
            <dd>{formatBytes(r.sizeBefore)}</dd>
          </dl>
        </div>
        <div className={styles.col}>
          <span className={styles.colHead}>{t("scan.after")}</span>
          <dl className={styles.kv}>
            <dt>{t("scan.format")}</dt>
            <dd>{r.formatAfter}</dd>
            <dt>{t("scan.dimensions")}</dt>
            <dd>{`${r.width}×${r.height}`}</dd>
            <dt>{t("scan.weight")}</dt>
            <dd>{formatBytes(r.sizeAfter)}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

/**
 * One row in the attached-media list: thumbnail + name + status, plus (for
 * images, once compressed) an info button (ⓘ) that toggles the before/after
 * compression comparison. There is NO client-side NSFW classification — the
 * state line tracks only compression (images) → upload.
 *
 * Props:
 *   - item:        a useMediaItems item ({ id, name, size, kind, thumbnail })
 *   - compression: the matching useImageCompression result (or undefined) for this file
 *   - upload:      the matching useMediaUploads item (or undefined)
 */
function PostScanResult({ item, compression, upload, onRetry, onRemove }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { id, name, size, kind, thumbnail } = item;

  const isImage = kind === "image";
  const detailsId = `scan-details-${id}`;

  const compStatus = compression && compression.status;
  const upStatus = upload && upload.status;

  // Per-file state line across compression (images only) → upload.
  let secondary;
  let showSpinner = false;
  let showRetry = false;
  let lineError = false;
  let uploadPercent = null; // 0..100 while uploading, else null

  if (
    isImage &&
    (!compression || compStatus === "queued" || compStatus === "compressing")
  ) {
    secondary = t("scan.compressing");
    showSpinner = true;
  } else if (isImage && compStatus === "error") {
    secondary = t("scan.compressError");
    lineError = true;
  } else if (!upload || upStatus === "queued") {
    // Waiting its turn in the sequential upload queue.
    secondary = t("scan.queued");
    showSpinner = true;
  } else if (upStatus === "uploading") {
    uploadPercent = upload.progress;
    secondary = t("scan.uploading", { percent: uploadPercent });
  } else if (upStatus === "uploaded") {
    secondary = t("scan.uploaded");
  } else if (upStatus === "error") {
    secondary = t("scan.uploadError");
    lineError = true;
    showRetry = true;
  } else {
    // Settled non-image state (e.g. just-finished video) → show its size.
    secondary = formatBytes(size);
  }

  // Details (compression comparison) available once an image is compressed.
  const canShowDetails = isImage && compStatus === "done" && !!compression.report;
  const rowHasError = compStatus === "error" || upStatus === "error";

  return (
    <div className={`${styles.row} ${rowHasError ? styles.rowError : ""}`}>
      <div className={styles.main}>
        <div className={styles.thumbnail}>
          {thumbnail ? (
            <img src={thumbnail} alt="" className={styles.thumbnailImage} />
          ) : kind === "video" ? (
            <VideoIcon />
          ) : (
            <PhotoIcon />
          )}
        </div>

        <div className={styles.info}>
          <span className={styles.name} title={name}>
            {name}
          </span>
          <span
            className={`${styles.status} ${lineError ? styles.statusError : ""}`}
            role="status"
            aria-live="polite"
          >
            {showSpinner && <span className={styles.spinner} aria-hidden="true" />}
            {secondary}
          </span>
        </div>

        {showRetry && (
          <button
            type="button"
            className={styles.retryButton}
            onClick={onRetry}
          >
            {t("scan.retry")}
          </button>
        )}

        {canShowDetails && (
          <button
            type="button"
            className={`${styles.infoButton} ${
              expanded ? styles.infoButtonActive : ""
            }`}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={t("scan.details")}
            title={t("scan.details")}
          >
            <InfoIcon />
          </button>
        )}

        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          aria-label={t("scan.remove")}
        >
          <CloseIcon />
        </button>
      </div>

      {canShowDetails && expanded && (
        <div id={detailsId} className={styles.details}>
          <CompressionView compression={compression} t={t} />
        </div>
      )}

      {uploadPercent != null && (
        <div
          className={styles.progressBar}
          style={{ width: `${uploadPercent}%` }}
          role="progressbar"
          aria-valuenow={uploadPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )}
    </div>
  );
}

export default PostScanResult;
