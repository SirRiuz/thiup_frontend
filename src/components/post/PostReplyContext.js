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
 *   - target: { maskId, type, sourceId } or null
 *   - onCancel: handler invoked when the user dismisses the context
 */
function PostReplyContext({ target, onCancel }) {
  if (!target) return null;
  if (target.type === "op") return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.label}>replying to</span>
      <span className={styles.identiconWrap}>
        <MaskAvatar seed={target.maskId} size={14} />
      </span>
      <span className={styles.maskId}>{target.maskId}</span>
      <span className={styles.spacer} />
      <button
        type="button"
        className={styles.cancelButton}
        onClick={onCancel}
        aria-label="Cancel replying to"
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
  );
}

export default PostReplyContext;
