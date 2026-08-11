import { useState } from "react";
import PostScanResult, { PostScanDetails } from "../post/PostScanResult";
import ExistingMediaTile from "../post/ExistingMediaTile";
import styles from "../../styles/components/media/MediaScanList.module.css";

/**
 * The attached-media STRIP for a composer (new thread or reply): one compact
 * tile per file (thumbnail-first, no filenames), laid out horizontally with
 * x-scroll — many files never grow the composer vertically. The compression
 * details panel (ⓘ) opens BELOW the strip, one file at a time.
 *
 * Props:
 *   - media: the value returned by useMediaComposer() (or useEditMediaComposer()).
 *   - existingItems / onRemoveExisting / onRestoreExisting: optional — the
 *     edit form's already-attached media, rendered as ExistingMediaTiles
 *     BEFORE the local-upload tiles in the same strip ("what's already
 *     there" first, then new pending uploads).
 *   - onToggleExistingSpoiler: optional — re-toggles the spoiler flag on an
 *     ALREADY-published file (live API call, independent of Save). Pending
 *     uploads (media.items) always get their spoiler toggle from `media`
 *     itself (media.toggleSpoiler), since that flag only takes effect at
 *     confirm.
 */
function MediaScanList({
  media,
  existingItems,
  onRemoveExisting,
  onRestoreExisting,
  onToggleExistingSpoiler,
}) {
  // Which tile's compression details are open (null = none). If that file is
  // removed the derived lookup misses and the panel simply closes.
  const [detailsId, setDetailsId] = useState(null);

  const hasExisting = existingItems && existingItems.length > 0;
  if (!hasExisting && (!media || media.items.length === 0)) return null;

  const expandedItem = media?.items.find((i) => i.id === detailsId) || null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.strip}>
        {hasExisting &&
          existingItems.map((item) => (
            <ExistingMediaTile
              key={item.id}
              item={item}
              onRemove={onRemoveExisting}
              onRestore={onRestoreExisting}
              onToggleSpoiler={onToggleExistingSpoiler}
            />
          ))}
        {media.items.map((item) => (
          <PostScanResult
            key={item.id}
            item={item}
            compression={media.compressionByFile.get(item.file)}
            upload={media.uploadsById.get(item.id)}
            onRetry={() => media.retryUpload(item.id)}
            onRemove={() => media.removeItem(item.id)}
            onToggleSpoiler={media.toggleSpoiler ? (id) => media.toggleSpoiler(id) : undefined}
            detailsOpen={detailsId === item.id}
            onToggleDetails={() =>
              setDetailsId((cur) => (cur === item.id ? null : item.id))
            }
          />
        ))}
      </div>

      {expandedItem && (
        <div id={`scan-details-${expandedItem.id}`}>
          <PostScanDetails
            compression={media.compressionByFile.get(expandedItem.file)}
          />
        </div>
      )}
    </div>
  );
}

export default MediaScanList;
