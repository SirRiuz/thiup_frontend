import MaskAvatar from "../MaskAvatar";
// PostMoreMenu (los tres puntos) oculto temporalmente — se usará más adelante.
// import PostMoreMenu from "./PostMoreMenu";
import PostProfileTrigger from "./PostProfileTrigger";
import PostReactionPicker from "./PostReactionPicker";
import PostReactionPill from "./PostReactionPill";
import PostReplyMedia from "./PostReplyMedia";
import { renderTextWithHashtags } from "../home/homeHelpers";
import styles from "../../styles/components/post/PostReply.module.css";

function PostReply({
  id,
  mask,
  text,
  time,
  reactions = [],
  media,
  parentId,
  parentMaskId,
  isOP,
  currentUserReaction,
  isLast = false,
  isLastInChain = false,
  isHighlighted = false,
  onReaction,
  onReplyClick,
  onHashtagClick,
}) {
  const isSubReply = Boolean(parentId);
  const identiconSize = isSubReply ? 18 : 20;
  const replyClassName = `${styles.reply} ${isSubReply ? styles.subReply : ""} ${
    isLast ? styles.lastReply : ""
  } ${isHighlighted ? styles.highlighted : ""}`;
  // Mismo tamaño en TODOS los niveles de anidamiento (15/20px, como las de
  // primer nivel) — antes las sub-replies bajaban a 14px.
  const bodyClassName = styles.body;

  return (
    <div className={replyClassName} data-reply-id={id}>
      {isSubReply && (
        <>
          <div
            className={`${styles.subVerticalLine} ${
              isLastInChain ? styles.subVerticalLineLast : ""
            }`}
          />
          <div className={styles.subHorizontalConnector} />
        </>
      )}

      <div className={styles.header}>
        <PostProfileTrigger mask={mask}>
          <MaskAvatar seed={mask.id} size={identiconSize} />
          <span className={styles.maskId}>{mask.id}</span>
        </PostProfileTrigger>
        {isOP && <span className={styles.opBadge}>OP</span>}
        <span className={styles.divider}>·</span>
        <span className={styles.timestamp}>{time}</span>
        {parentMaskId && (
          <>
            <span className={styles.divider}>·</span>
            <span className={styles.parentRef}>
              re: <span className={styles.parentRefId}>{parentMaskId}</span>
            </span>
          </>
        )}
        <span className={styles.spacer} />
        {/* Oculto temporalmente — se usará más adelante:
        <PostMoreMenu maskId={mask?.id} /> */}
      </div>

      <p className={bodyClassName}>
        {renderTextWithHashtags(text, styles.hashtag, onHashtagClick)}
      </p>

      {media && media.length > 0 && <PostReplyMedia items={media} />}

      <div className={styles.reactions}>
        {reactions.map((r) => (
          <PostReactionPill
            key={r.emoji}
            emoji={r.emoji}
            count={r.count}
            active={r.userReacted}
            variant="reply"
            onClick={() =>
              onReaction?.({
                id: r.id || r.emoji,
                emoji: r.emoji,
                label: r.label || r.emoji,
              })
            }
          />
        ))}
        <PostReactionPicker
          contextId={id}
          currentReactionEmoji={currentUserReaction}
          onSelect={onReaction}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionActive}
          onClick={onReplyClick}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
          reply
        </button>
      </div>
    </div>
  );
}

export default PostReply;
