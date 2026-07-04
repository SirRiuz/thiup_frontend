import PostScanResult from "../post/PostScanResult";
import styles from "../../styles/components/media/MediaScanList.module.css";

/**
 * Renders the attached-media rows for a composer (new thread or reply): one
 * PostScanResult per file (compression + upload progress). No NSFW analysis on
 * the client — that moves to a server-side service.
 *
 * Props:
 *   - media: the value returned by useMediaComposer().
 */
function MediaScanList({ media }) {
  if (!media || media.items.length === 0) return null;

  return (
    <div className={styles.list}>
      {media.items.map((item) => (
        <PostScanResult
          key={item.id}
          item={item}
          compression={media.compressionByFile.get(item.file)}
          upload={media.uploadsById.get(item.id)}
          onRetry={() => media.retryUpload(item.id)}
          onRemove={() => media.removeItem(item.id)}
        />
      ))}
    </div>
  );
}

export default MediaScanList;
