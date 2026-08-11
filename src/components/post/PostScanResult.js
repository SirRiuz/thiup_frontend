import { useTranslation } from "react-i18next";
import MediaSpoilerMenu from "../media/MediaSpoilerMenu";
import styles from "../../styles/components/post/PostScanResult.module.css";
import cx from "../../utils/cx";
import { DEBUG } from "../../settings";

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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
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
        <span className={cx(styles.compLoading, styles.statusError)}>
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
          <span className={cx(styles.savings, up ? styles.savingsUp : "")}>
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
 * The compression before/after panel, rendered by MediaScanList BELOW the
 * tile strip (one open at a time) so the strip's height never changes.
 */
export function PostScanDetails({ compression }) {
  const { t } = useTranslation();
  return (
    <div className={styles.details}>
      <CompressionView compression={compression} t={t} />
    </div>
  );
}

/**
 * One attached file as a compact media TILE (IG/Threads composer standard):
 * the THUMBNAIL is the row — no filename (they're noise; the name survives as
 * the tile's tooltip). State lives as overlays on the tile:
 *   - compressing / queued  → dim + centered spinner
 *   - uploading             → bottom progress bar
 *   - upload error          → danger scrim, the tile becomes a RETRY button
 *   - compress error        → danger scrim + alert glyph
 *   - ready (image)         → tiny ⓘ disc toggling the compression details
 * Remove is the scrim × disc riding the top-right corner. A visually-hidden
 * live region narrates the state for screen readers.
 *
 * Props:
 *   - item:        a useMediaItems item ({ id, name, size, kind, thumbnail })
 *   - compression: the matching useImageCompression result (or undefined)
 *   - upload:      the matching useMediaUploads item (or undefined)
 *   - detailsOpen / onToggleDetails: the strip-level details panel state
 */
function PostScanResult({
  item,
  compression,
  upload,
  onRetry,
  onRemove,
  onToggleSpoiler,
  detailsOpen = false,
  onToggleDetails,
}) {
  const { t } = useTranslation();
  const { id, name, size, kind, thumbnail, isSpoiler } = item;

  const isImage = kind === "image";
  const detailsId = `scan-details-${id}`;

  const compStatus = compression && compression.status;
  const upStatus = upload && upload.status;

  // Per-file state line across compression (images only) → upload.
  let secondary;
  let showSpinner = false;
  let showRetry = false;
  let uploadPercent = null; // 0..100 while uploading, else null

  if (
    isImage &&
    (!compression || compStatus === "queued" || compStatus === "compressing")
  ) {
    secondary = t("scan.compressing");
    showSpinner = true;
  } else if (isImage && compStatus === "error") {
    secondary = t("scan.compressError");
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
    showRetry = true;
  } else {
    // Settled non-image state (e.g. just-finished video) → show its size.
    secondary = formatBytes(size);
  }

  // Details (compression comparison) available once an image is compressed.
  // DEV-ONLY inspection tool (src/settings.js): the ⓘ disc and its
  // before/after panel show only with REACT_APP_DEBUG=true — in production
  // the flag is false and users never see the debugger.
  const canShowDetails =
    DEBUG && isImage && compStatus === "done" && !!compression.report;
  const hasError = compStatus === "error" || upStatus === "error";

  return (
    <div
      className={cx(styles.tile, hasError ? styles.tileError : "")}
      title={name}
    >
      {thumbnail ? (
        kind === "video" ? (
          // First-frame preview: a muted inline <video> over the local blob —
          // no upload, no canvas. The #t=0.001 fragment makes iOS Safari
          // actually paint the frame (it shows blank until a seek otherwise).
          <video
            src={`${thumbnail}#t=0.001`}
            className={cx(styles.tileImage, styles.tileVideo, isSpoiler ? styles.tileImageBlurred : "")}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            aria-hidden="true"
          />
        ) : (
          <img
            src={thumbnail}
            alt=""
            className={cx(styles.tileImage, isSpoiler ? styles.tileImageBlurred : "")}
          />
        )
      ) : (
        <span className={styles.tileKind} aria-hidden="true">
          {kind === "video" ? <VideoIcon /> : <PhotoIcon />}
        </span>
      )}

      {/* Type mark over a video thumbnail (the grids' Reel/video glyph) so
          the tile still reads "video" once the frame looks like a photo. */}
      {kind === "video" && thumbnail && (
        <span className={styles.videoMark} role="img" aria-label={t("media.video")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22.942 7.464c-.062-1.36-.306-2.143-.511-2.671a5.366 5.366 0 0 0-1.272-1.952 5.364 5.364 0 0 0-1.951-1.27c-.53-.207-1.312-.45-2.673-.513-1.2-.054-1.557-.066-4.535-.066s-3.336.012-4.536.066c-1.36.062-2.143.306-2.672.511-.769.3-1.371.692-1.951 1.272s-.973 1.182-1.27 1.951c-.207.53-.45 1.312-.513 2.673C1.004 8.665.992 9.022.992 12s.012 3.336.066 4.536c.062 1.36.306 2.143.511 2.671.298.77.69 1.373 1.272 1.952.58.581 1.182.974 1.951 1.27.53.207 1.311.45 2.673.513 1.199.054 1.557.066 4.535.066s3.336-.012 4.536-.066c1.36-.062 2.143-.306 2.671-.511a5.368 5.368 0 0 0 1.953-1.273c.58-.58.972-1.181 1.27-1.95.206-.53.45-1.312.512-2.673.054-1.2.066-1.557.066-4.535s-.012-3.336-.066-4.536Zm-7.085 6.055-5.25 3c-1.167.667-2.619-.175-2.619-1.519V9c0-1.344 1.452-2.186 2.619-1.52l5.25 3c1.175.672 1.175 2.368 0 3.04Z" />
          </svg>
        </span>
      )}

      {/* Busy: dim the tile and center a spinner. */}
      {showSpinner && (
        <span className={styles.busyOverlay} aria-hidden="true">
          <span className={styles.busySpinner} />
        </span>
      )}

      {/* Error: danger scrim; retryable → the overlay IS the retry button. */}
      {hasError &&
        (showRetry ? (
          <button
            type="button"
            className={styles.errorOverlay}
            onClick={onRetry}
            aria-label={t("scan.retry")}
            title={t("scan.retry")}
          >
            <span className={styles.errorDisc}>
              <RetryIcon />
            </span>
          </button>
        ) : (
          <span className={styles.errorOverlay} aria-hidden="true">
            <span className={styles.errorDisc}>
              <AlertIcon />
            </span>
          </span>
        ))}

      {/* Remove — scrim disc riding the top-right corner (media standard). */}
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        aria-label={t("scan.remove")}
        title={t("scan.remove")}
      >
        <CloseIcon />
      </button>

      {/* Spoiler toggle — top-left corner, the only free one (remove is
          top-right, info is bottom-right). Available whenever there's
          something to confirm (busy/error tiles can still be marked before
          they finish). */}
      {onToggleSpoiler && (
        <MediaSpoilerMenu isSpoiler={!!isSpoiler} onToggle={(v) => onToggleSpoiler(id, v)} />
      )}

      {/* Compression details toggle — quiet ⓘ disc, bottom-right. */}
      {canShowDetails && (
        <button
          type="button"
          className={cx(styles.infoButton, detailsOpen ? styles.infoButtonActive : "")}
          onClick={onToggleDetails}
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          aria-label={t("scan.details")}
          title={t("scan.details")}
        >
          <InfoIcon />
        </button>
      )}

      {/* Upload progress along the tile's bottom edge. */}
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

      {/* State narration for screen readers (the tile shows it visually). */}
      <span className={styles.srStatus} role="status" aria-live="polite">
        {secondary}
      </span>
    </div>
  );
}

export default PostScanResult;
