import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostOptionsMenu from "./PostOptionsMenu";
import PostProfileTrigger from "./PostProfileTrigger";
import PostReactionPicker from "./PostReactionPicker";
import PostReactionPill from "./PostReactionPill";
import ThreadMedia from "../media/ThreadMedia";
import ThreadText from "./ThreadText";
import { renderTextWithHashtags } from "../home/homeHelpers";
import styles from "../../styles/components/post/PostReply.module.css";

function PostReply({
  id,
  mask,
  text,
  time,
  reactions = [],
  repliesCount,
  publishedAt,
  media,
  parentId,
  parentMaskId,
  isOp,
  currentUserReaction,
  isLast = false,
  isLastInChain = false,
  isHighlighted = false,
  onReaction,
  onReplyClick,
  onHashtagClick,
}) {
  const { t } = useTranslation();
  const isSubReply = Boolean(parentId);
  const identiconSize = isSubReply ? 18 : 20;
  const replyClassName = `${styles.reply} ${isSubReply ? styles.subReply : ""} ${
    isLast ? styles.lastReply : ""
  } ${isHighlighted ? styles.highlighted : ""}`;
  // Same size at ALL nesting levels (15/20px, like the first-level ones) —
  // previously the sub-replies dropped to 14px.
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
        {/* OP: this reply's author is the thread's Original Poster (is_op, a
            backend boolean local to this thread). Visible to everyone in the
            thread. "OP" is a literal convention; aria-label spells it out. */}
        {isOp && (
          <span className={styles.opBadge} aria-label={t("post.opAuthor")}>
            OP
          </span>
        )}
        {/* No "·" between id and date — spaced only by the header's small flex
            gap ("6be4a5 2w"). The "·" before "re:" below is kept. */}
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
        <PostOptionsMenu
          post={{ id, uid: id, repliesCount, reactions, publishedAt }}
          variant="inline"
        />
      </div>

      <ThreadText text={text} className={bodyClassName}>
        {renderTextWithHashtags(text, styles.hashtag, onHashtagClick)}
      </ThreadText>

      {media && media.length > 0 && <ThreadMedia items={media} />}

      <div className={styles.reactions}>
        {reactions.map((r) => (
          <PostReactionPill
            key={r.emoji}
            emoji={r.emoji}
            count={r.count}
            name={r.name}
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
          {t("post.reply")}
        </button>
      </div>
    </div>
  );
}

export default PostReply;
