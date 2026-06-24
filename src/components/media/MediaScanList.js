import { useTranslation } from "react-i18next";
import PostScanResult from "../post/PostScanResult";
import styles from "../../styles/components/media/MediaScanList.module.css";

/**
 * Renders the attached-media rows for a composer (new thread or reply): one
 * PostScanResult per file (status / verdict / compression / upload progress) +
 * an "analyzing N" header while files are still being classified.
 *
 * Props:
 *   - media: the value returned by useMediaComposer().
 */
function MediaScanList({ media }) {
  const { t } = useTranslation();
  if (!media || media.items.length === 0) return null;

  return (
    <div className={styles.list}>
      {media.analyzingCount > 0 && (
        <p className={styles.progress} role="status" aria-live="polite">
          {t("scan.pending", { count: media.analyzingCount })}
        </p>
      )}
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
