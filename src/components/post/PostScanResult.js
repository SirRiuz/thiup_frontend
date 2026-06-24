import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/PostScanResult.module.css";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const pct = (value) => Math.round((value || 0) * 100);

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

// Tiny verdict glyphs (Feather-style outline) used inside the details panel.
function VerdictIcon({ verdict }) {
  if (verdict === "block") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
      </svg>
    );
  }
  if (verdict === "review") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
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
 * One row in the analysis list: thumbnail + name + status, plus (when done) an
 * info button (ⓘ) that toggles a details panel with the colored verdict label,
 * the explicit/suggestive breakdown, and — for images — the before/after
 * compression comparison (format, dimensions, size) plus savings and dominant
 * color chips. Full metadata before/after is logged to the DevTools console.
 *
 * Props:
 *   - item:        a useNsfwScan item ({ id, name, size, kind, status, frame, result, error, thumbnail })
 *   - compression: the matching useImageCompression result (or undefined) for this file
 *   - onRemove:    handler invoked when the user clicks the X
 */
function PostScanResult({ item, compression, upload, onRetry, onRemove }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { id, name, size, kind, status, frame, result, error, thumbnail } = item;

  const isAnalyzing = status === "analyzing";
  const isQueued = status === "queued";
  const isDone = status === "done";
  const isError = status === "error";
  const isImage = kind === "image";
  const verdict = result && result.verdict;
  const detailsId = `scan-details-${id}`;

  const compStatus = compression && compression.status;
  const upStatus = upload && upload.status;

  // Combined per-file state machine across the three phases (analyze →
  // compress → upload): one status line + a flag set driving spinner / progress
  // bar / retry.
  let secondary;
  let showSpinner = false;
  let showRetry = false;
  let lineError = false;
  let uploadPercent = null; // 0..100 while uploading, else null

  if (isQueued) {
    secondary = t("scan.queued");
    showSpinner = true;
  } else if (isAnalyzing) {
    secondary =
      kind === "video" && frame
        ? t("scan.analyzingFrame", { current: frame.current, total: frame.total })
        : t("scan.analyzing");
    showSpinner = true;
  } else if (isError) {
    const code = error && error.code;
    if (code === "hevc") secondary = t("scan.errorHevc");
    else if (code === "decode") secondary = t("scan.errorDecode");
    else if (code === "model") secondary = t("scan.errorModel");
    else secondary = t("scan.errorAnalyze");
    lineError = true;
  } else if (isDone && isImage) {
    // Image: NSFW done → compression → upload.
    if (!compression || compStatus === "queued" || compStatus === "compressing") {
      secondary = t("scan.compressing");
      showSpinner = true;
    } else if (compStatus === "error") {
      secondary = t("scan.compressError");
      lineError = true;
    } else if (!upload || upStatus === "uploading") {
      uploadPercent = upload ? upload.progress : 0;
      secondary = t("scan.uploading", { percent: uploadPercent });
    } else if (upStatus === "uploaded") {
      secondary = t("scan.uploaded");
    } else if (upStatus === "error") {
      secondary = t("scan.uploadError");
      lineError = true;
      showRetry = true;
    }
  } else if (isDone) {
    // Video (no compression/upload this iteration): show size.
    secondary = formatBytes(size);
  }

  const rowHasError = isError || compStatus === "error" || upStatus === "error";

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

        {isDone && result && (
          <button
            type="button"
            className={`${styles.infoButton} ${styles[`info_${verdict}`]} ${
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

      {isDone && result && expanded && (
        <div id={detailsId} className={styles.details}>
          <div className={styles.verdictRow}>
            <span className={`${styles.badge} ${styles[`badge_${verdict}`]}`}>
              <VerdictIcon verdict={verdict} />
              <span className={styles.badgeLabel}>{t(`scan.verdict_${verdict}`)}</span>
              <span className={styles.badgeScore}>
                {t("scan.scorePercent", { percent: pct(result.score) })}
              </span>
            </span>
            <span className={styles.detail}>
              {t("scan.detail", {
                explicit: pct(result.explicit),
                suggestive: pct(result.sexy),
              })}
            </span>
          </div>
          {kind === "image" && <CompressionView compression={compression} t={t} />}
        </div>
      )}

      {isAnalyzing && kind === "video" && frame && (
        <div
          className={styles.progressBar}
          style={{ width: `${(frame.current / frame.total) * 100}%` }}
          role="progressbar"
          aria-valuenow={frame.current}
          aria-valuemin={0}
          aria-valuemax={frame.total}
        />
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
