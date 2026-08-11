import { useTranslation } from "react-i18next";
import MediaSpoilerMenu from "../media/MediaSpoilerMenu";
import styles from "../../styles/components/post/ExistingMediaTile.module.css";
import cx from "../../utils/cx";

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * One ALREADY-attached media item in the edit form, as a removable tile —
 * same 84×84 footprint/anatomy as PostScanResult's local-upload tile, but
 * for a real, already-persisted file (a CDN url, nothing pending/uploading).
 * Removing it here only marks it `removed` in local state (useEditMediaComposer);
 * nothing is deleted until Save. Reversible via "Undo" until then.
 */
function ExistingMediaTile({ item, onRemove, onRestore, onToggleSpoiler }) {
  const { t } = useTranslation();
  const isVideo = item.type === "video";

  return (
    <div className={cx(styles.tile, item.removed ? styles.tileRemoved : "")} title={item.url}>
      {isVideo ? (
        <video
          src={item.url}
          className={cx(styles.tileImage, styles.tileVideo, item.isSpoiler ? styles.tileImageBlurred : "")}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : (
        <img
          src={item.url}
          alt=""
          className={cx(styles.tileImage, item.isSpoiler ? styles.tileImageBlurred : "")}
        />
      )}

      {item.removed ? (
        <div className={styles.removedOverlay}>
          <button type="button" className={styles.undoButton} onClick={() => onRestore(item.id)}>
            {t("post.undoRemove")}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => onRemove(item.id)}
            aria-label={t("scan.remove")}
            title={t("scan.remove")}
          >
            <CloseIcon />
          </button>
          {onToggleSpoiler && (
            <MediaSpoilerMenu
              isSpoiler={!!item.isSpoiler}
              onToggle={(v) => onToggleSpoiler(item.id, v)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default ExistingMediaTile;
