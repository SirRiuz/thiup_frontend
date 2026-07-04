import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import styles from "../../styles/components/post/PostReplyContext.module.css";

/**
 * Banner shown above the comment textarea indicating who the user is replying to.
 *
 * Not rendered when:
 *   - target is null (no active reply context)
 *   - target.type === "op" (replying to the OP is the default behavior of the
 *     comment box; the placeholder already communicates that, so the banner
 *     would be redundant)
 *
 * Props:
 *   - target: { maskId, type, sourceId, text } or null
 *   - onCancel: handler invoked when the user dismisses the context
 *
 * Threads-style: an identity row ("Replying to <mask>") with a muted preview of
 * the message being replied to below it, so the user sees exactly what they're
 * responding to.
 */
function PostReplyContext({ target, onCancel }) {
  const { t } = useTranslation();
  if (!target) return null;
  if (target.type === "op") return null;

  // Collapse the parent's line breaks into a single-spaced snippet (the preview
  // is clamped to 2 lines via CSS) and trim so leading newlines don't show.
  const preview = (target.text || "").replace(/\s+/g, " ").trim();

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div className={styles.header}>
        <span className={styles.identiconWrap}>
          <MaskAvatar seed={target.maskId} size={16} />
        </span>
        <span className={styles.label}>{t("post.replyingTo")}</span>
        <span className={styles.maskId}>{target.maskId}</span>
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          aria-label={t("post.cancelReplyingTo")}
        >
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
        </button>
      </div>
      {preview && <p className={styles.preview}>{preview}</p>}
    </div>
  );
}

export default PostReplyContext;
