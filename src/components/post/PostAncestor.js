import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostOptionsMenu from "./PostOptionsMenu";
import EditedTag from "./EditedTag";
import PostProfileTrigger from "./PostProfileTrigger";
import ReactionStack from "./ReactionStack";
import ThreadMedia from "../media/ThreadMedia";
import useMediaViewerUrlSync from "../../hooks/useMediaViewerUrlSync";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { fullDateTitle } from "../../utils/formatDate";
import cx from "../../utils/cx";
import styles from "../../styles/components/post/PostAncestor.module.css";

/**
 * One node of the ancestor chain on a comment permalink (Threads' thread
 * continuity): when /p/:id opens a REPLY, its parents render ABOVE the head —
 * root thread first — each connected to the next avatar by a threadline
 * trunk, so the user reads the full sequence down to the focused comment.
 *
 * Anatomy = a depth-0 reply row (36px avatar gutter + identity row + body +
 * media + quiet stats), whole row navigable to that node's OWN permalink
 * (same clickable-row pattern as HomeFeedCard: a keyboard-accessible navZone
 * over the text, plus a pointer convenience on the rest of the row with
 * media/controls opting out).
 */
function PostAncestor({ post, isRoot = false, onOpen, onHashtagClick }) {
  const { t, i18n } = useTranslation();
  const {
    mask,
    text,
    time,
    publishedAt,
    repliesCount,
    reactions = [],
    media,
    isOp,
    isEdited,
    editedAt,
  } = post;
  // This ancestor's OWN media, addressable at its own /p/:id — opening it
  // navigates there, same as tapping the row itself. See
  // useMediaViewerUrlSync.
  const mediaSync = useMediaViewerUrlSync(post?.id || post?.uid, media);

  const handleNavKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.(e);
    }
  };

  // Row-level click: ignore anything self-handled — media frames (they open
  // the viewer), real controls and the navZone (its own handler already
  // navigated). Same guard as HomeFeedCard.
  const handleRowClick = (e) => {
    if (
      e.target.closest(
        "[data-frame], [data-hover-card], button, a, [role='link'], [role='button']"
      )
    ) {
      return;
    }
    onOpen?.(e);
  };

  return (
    <article
      className={cx(styles.ancestor, isRoot ? styles.first : "")}
      onClick={handleRowClick}
    >
      {/* Trunk descending into the next node's avatar (next ancestor or the
          focused head) — Threads' floating segment with breathing gaps. */}
      <div className={styles.trunk} aria-hidden="true" />

      <div className={styles.grid}>
        <div className={styles.avatarCell}>
          <PostProfileTrigger mask={mask} variant="avatar">
            <MaskAvatar seed={mask.id} size={36} online={mask.isOnline} />
          </PostProfileTrigger>
        </div>

        <div className={styles.contentCell}>
          {/* Header OUTSIDE the navZone (PostReply's exact anatomy) so the
              three-dots menu is a sibling control, never a button nested in a
              role=link. Row clicks still navigate (the guard excludes it). */}
          <header className={styles.header}>
            <PostProfileTrigger mask={mask} variant="hash">
              <span className={styles.maskId}>{mask.id}</span>
            </PostProfileTrigger>
            <span
              className={styles.timestamp}
              title={fullDateTitle(publishedAt, i18n.language)}
            >
              {time}
            </span>
            {((isOp && !isRoot) || isEdited) && (
              // Trailing meta tags get their OWN tighter gap (4px) instead of
              // the header's primary 6px — same pattern as PostReply, so an
              // ancestor row reads identically to a reply row.
              <span className={styles.metaTrail}>
                {/* "· Author" only on intermediate ancestors authored by the
                    OP — on the root itself it's redundant (the root IS the OP). */}
                {isOp && !isRoot && (
                  <span className={styles.authorTag} aria-label={t("post.opAuthor")}>
                    <span className={styles.authorDivider} aria-hidden="true">
                      ·
                    </span>
                    {t("post.author")}
                  </span>
                )}
                {isEdited && (
                  <EditedTag
                    post={post}
                    editedAt={editedAt}
                    language={i18n.language}
                    className={styles.editedTag}
                    dividerClassName={styles.editedDivider}
                  />
                )}
              </span>
            )}
            <span className={styles.spacer} />
            {/* Same three-dots menu as replies/OP (View details / Copy link /
                Report) — full post shape, so every option works here too. */}
            <PostOptionsMenu post={post} variant="inline" />
          </header>

          <div
            className={styles.navZone}
            role="link"
            tabIndex={0}
            aria-label={t("home.openThread")}
            onClick={onOpen}
            onKeyDown={handleNavKeyDown}
          >
            <p className={styles.body}>
              {renderTextWithHashtags(text, styles.hashtag, onHashtagClick)}
            </p>
          </div>

          {media && media.length > 0 && (
            <ThreadMedia items={media} {...mediaSync} />
          )}

          {/* Quiet display-only stats (feed-card language): reaction cluster +
              replies count. Interactions live on each node's own page. */}
          <footer className={styles.stats}>
            <ReactionStack reactions={reactions} className={styles.statReactions} />
            <span className={styles.statWithIcon}>
              <svg
                width="16"
                height="16"
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
              {repliesCount}
            </span>
          </footer>
        </div>
      </div>
    </article>
  );
}

export default PostAncestor;
