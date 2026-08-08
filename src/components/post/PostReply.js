import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostOptionsMenu from "./PostOptionsMenu";
import EditedTag from "./EditedTag";
import PostProfileTrigger from "./PostProfileTrigger";
import PostReactionPicker from "./PostReactionPicker";
import ReactionStack from "./ReactionStack";
import ThreadMedia from "../media/ThreadMedia";
import useMediaViewerUrlSync from "../../hooks/useMediaViewerUrlSync";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { fullDateTitle } from "../../utils/formatDate";
import styles from "../../styles/components/post/PostReply.module.css";

// Reddit-style nesting geometry. Each depth level shifts the comment right by
// one STEP; the avatar lives in a STEP-wide gutter and the thread lines run down
// the CENTER of each ancestor's gutter (LANE). STEP === gutter width so a child's
// gutter starts exactly where its parent's content does → lines stack cleanly.
// Gutter = 36 (Threads' avatar size; their feed lane is 36 avatar + 12 gap = 48).
const STEP = 36;
const LANE = 18; // center of a STEP-wide gutter
// Threads' threadline is 2px wide — offset by half so the line CENTERS on the
// lane (their inset-inline-start: calc(50% - 1px)).
const LINE_W = 2;
const lineLeft = (level) => laneLeft(level) - LINE_W / 2;
const laneLeft = (level) => level * STEP + LANE;

function PostReply({
  id,
  mask,
  text,
  time,
  reactions = [],
  repliesCount,
  publishedAt,
  media,
  isOp,
  isMine,
  isEdited,
  editedAt,
  currentUserReaction,
  isLast = false,
  depth = 0,
  guides = [],
  hasChildren = false,
  dividerBelow = false,
  isHighlighted = false,
  onReaction,
  onReplyClick,
  onHashtagClick,
  onEdited,
}) {
  const { t, i18n } = useTranslation();
  // This reply's OWN media, addressable at its own /p/:id — opening it
  // navigates there (a real permalink, same as tapping the row itself),
  // landing with the viewer already open. See useMediaViewerUrlSync.
  const mediaSync = useMediaViewerUrlSync(id, media);
  // Shared shape for both PostOptionsMenu (edit) and EditedTag (edit
  // history) — same minimal post subset, built once.
  const postForModals = { id, uid: id, repliesCount, reactions, publishedAt, mask, text, media, isMine };
  const replyClassName = `${styles.reply} ${
    dividerBelow ? styles.withDivider : ""
  } ${isLast ? styles.lastReply : ""} ${
    isHighlighted ? styles.highlighted : ""
  }`;

  return (
    <div
      className={replyClassName}
      data-reply-id={id}
      style={{ paddingLeft: depth * STEP }}
    >
      {/* === Threading lines (Reddit-style) ===
          One vertical guide per ancestor lane whose line continues past this
          reply; a curved branch from the parent's lane into this avatar; and,
          when this reply has children, a trunk descending into them. */}
      {guides.map((cont, level) =>
        cont ? (
          <div
            key={`g${level}`}
            className={styles.guideLine}
            style={{ left: lineLeft(level) }}
            aria-hidden="true"
          />
        ) : null
      )}
      {depth >= 1 && (
        <div
          className={styles.branch}
          /* The arm stops 4px short of the avatar's left edge (Threads'
             breathing gap): STEP reaches the avatar CENTER, so trim the
             avatar radius (18) + the gap (4), minus the 1px the lane is
             already offset. */
          style={{ left: lineLeft(depth - 1), width: STEP - 21 }}
          aria-hidden="true"
        />
      )}
      {hasChildren && (
        <div
          className={styles.childTrunk}
          style={{ left: lineLeft(depth) }}
          aria-hidden="true"
        />
      )}

      <div className={styles.main}>
        <div className={styles.avatarCell}>
          <PostProfileTrigger mask={mask} variant="avatar">
            <MaskAvatar seed={mask.id} size={36} online={mask.isOnline} />
          </PostProfileTrigger>
        </div>

        <div className={styles.contentCell}>
          <div className={styles.header}>
            <PostProfileTrigger mask={mask} variant="hash">
              <span className={styles.maskId}>{mask.id}</span>
            </PostProfileTrigger>
            <span
              className={styles.timestamp}
              title={fullDateTitle(publishedAt, i18n.language)}
            >
              {time}
            </span>
            {/* OP: this reply's author is the thread's Original Poster (is_op, a
                backend boolean local to this thread). Threads-style "· Author"
                meta instead of a badge. */}
            {(isOp || isEdited) && (
              // Trailing meta tags get their OWN tighter gap (4px) instead of
              // inheriting the header's primary 6px (Threads' documented
              // single mask·time jump) — chaining "· Author · Edited" at 6px
              // each compounded into visibly loose spacing with no direct
              // Threads reference (Threads has no multi-tag chain like this).
              <span className={styles.metaTrail}>
                {isOp && (
                  <span className={styles.authorTag} aria-label={t("post.opAuthor")}>
                    <span className={styles.authorDivider} aria-hidden="true">·</span>
                    {t("post.author")}
                  </span>
                )}
                {isEdited && (
                  <EditedTag
                    post={postForModals}
                    editedAt={editedAt}
                    language={i18n.language}
                    className={styles.editedTag}
                    dividerClassName={styles.editedDivider}
                  />
                )}
              </span>
            )}
            <span className={styles.spacer} />
            <PostOptionsMenu
              post={postForModals}
              variant="inline"
              onEdited={onEdited}
              isReply
            />
          </div>

          {/* Replies (and replies-of-replies) show their FULL text — no clamp /
              "Show more" toggle (same as the OP head). */}
          <p className={styles.body}>
            {renderTextWithHashtags(text, styles.hashtag, onHashtagClick)}
          </p>

          {media && media.length > 0 && (
            <ThreadMedia items={media} {...mediaSync} />
          )}

          {/* FB-style stacked reaction summary above the action bar. */}
          <ReactionStack
            reactions={reactions}
            className={styles.reactionSummary}
          />

          {/* Threads-style action bar: react (opens picker) + reply. */}
          <div className={styles.actions}>
            <PostReactionPicker
              variant="action"
              contextId={id}
              currentReactionEmoji={currentUserReaction}
              onSelect={onReaction}
            />
            <button
              type="button"
              className={styles.actionActive}
              onClick={onReplyClick}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {t("post.reply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostReply;
