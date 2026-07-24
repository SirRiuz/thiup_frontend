import { useState } from "react";
import PostScanResult, { PostScanDetails } from "../post/PostScanResult";
import styles from "../../styles/components/media/MediaScanList.module.css";

/**
 * The attached-media STRIP for a composer (new thread or reply): one compact
 * tile per file (thumbnail-first, no filenames), laid out horizontally with
 * x-scroll — many files never grow the composer vertically. The compression
 * details panel (ⓘ) opens BELOW the strip, one file at a time.
 *
 * Props:
 *   - media: the value returned by useMediaComposer().
 */
function MediaScanList({ media }) {
  // Which tile's compression details are open (null = none). If that file is
  // removed the derived lookup misses and the panel simply closes.
  const [detailsId, setDetailsId] = useState(null);

  if (!media || media.items.length === 0) return null;

  const expandedItem = media.items.find((i) => i.id === detailsId) || null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.strip}>
        {media.items.map((item) => (
          <PostScanResult
            key={item.id}
            item={item}
            compression={media.compressionByFile.get(item.file)}
            upload={media.uploadsById.get(item.id)}
            onRetry={() => media.retryUpload(item.id)}
            onRemove={() => media.removeItem(item.id)}
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
