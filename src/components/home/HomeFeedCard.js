import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostProfileTrigger from "../post/PostProfileTrigger";
import PostOptionsMenu from "../post/PostOptionsMenu";
import ReactionStack from "../post/ReactionStack";
import ThreadMedia from "../media/ThreadMedia";
import { formatCount, renderTextWithHashtags } from "./homeHelpers";
import { DEBUG } from "../../settings";
import styles from "../../styles/components/home/HomeFeedCard.module.css";
import cx from "../../utils/cx";

// Optional explanatory badge on the just-created card ("Your new thread").
// Prepared but OFF by default — flip to true to make the reason for the
// highlight explicit. Copy lives in i18n (home.newThreadBadge).
const SHOW_NEW_BADGE = false;

function HomeFeedCard({
  post,
  onClick,
  onReplyClick,
  onHashtagClick,
  isLast,
  isNew,
  hideMineTag,
  highlightQuery,
  activeTag,
}) {
  const { t } = useTranslation();
  const {
    mask,
    text,
    time,
    isTrending,
    isMine,
    momentum,
    repliesCount,
    viewsCount,
    reactions = [],
    media,
    topReply,
  } = post;

  const renderOptions = {
    highlightQuery,
    highlightClassName: styles.highlight,
    activeTag,
    activeTagClassName: styles.hashtagActive,
  };

  // Navigate from the text/identity zone (role=link, keyboard-accessible) AND,
  // as a pointer convenience, from anywhere else on the card that isn't media
  // or a control (Threads: the whole row opens the thread). The card is still
  // NOT a button (no role/tabindex): a card-wide role=button made iOS paint its
  // native tap highlight over everything and capture the carousel's swipe —
  // a plain click handler that EXCLUDES the media zone keeps that fix.
  const handleNavKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(e);
    }
  };

  // Card-level click: ignore anything self-handled — media frames (they open
  // the viewer), real controls (options, reveal, sound…), and the navZone
  // (its own handler already navigated; without this guard the bubbled click
  // would navigate twice). The blank space BESIDE a narrow single image AND
  // the empty track space after a short carousel are none of these, so they
  // navigate (Threads' pressable row: only the media itself opts out — the
  // carousel swallows its own drag-end/panorama clicks before they get here).
  const handleCardClick = (e) => {
    if (
      e.target.closest(
        "[data-frame], [data-hover-card], button, a, [role='link'], [role='button']"
      )
    ) {
      return;
    }
    onClick?.(e);
  };

  // Conversation preview (X-style): the preview block navigates to the
  // REPLY's own permalink (which opens with its ancestor chain). Same
  // guard pattern as the card: media frames, the options menu, the profile
  // triggers and the keyboard navZone keep their own behavior.
  //
  // The seed carries the STRUCTURE this card already knows — the reply as
  // head + the root as its ancestor chain (a preview reply is always
  // depth 1) — so the permalink paints chain-complete on its FIRST frame
  // and anchors pre-paint: nothing pops in above the head later (the fetch
  // only reconciles and fills the reply's own replies BELOW the fold).
  // Reloads/deep links have no seed and keep the normal fetch-first flow.
  const openPreviewReply = () => {
    if (!onReplyClick || !topReply) return;
    const { topReply: _omit, ...rootCard } = post;
    onReplyClick({ ...topReply, ancestors: [rootCard] });
  };

  const handlePreviewClick = (e) => {
    e.stopPropagation(); // never bubble into the root card's navigation
    if (
      e.target.closest(
        "[data-frame], [data-hover-card], button, a, [role='link'], [role='button']"
      )
    ) {
      return;
    }
    openPreviewReply();
  };

  const handlePreviewNavClick = (e) => {
    e.stopPropagation();
    openPreviewReply();
  };

  const handlePreviewKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      openPreviewReply();
    }
  };

  return (
    <article
      className={cx(styles.card, isLast ? styles.cardLast : "", isNew ? styles.cardNew : "")}
      onClick={handleCardClick}
    >
      {/* Three-dots options (View details / Copy link / Report). Self-contained;
          stops propagation so it never triggers the card's navigation. */}
      <PostOptionsMenu post={post} />

      {/* Optional "why is this highlighted" badge — fades with the card. Off by
          default (SHOW_NEW_BADGE); shown only on the just-created thread. */}
      {isNew && SHOW_NEW_BADGE && (
        <span className={styles.newBadge}>{t("home.newThreadBadge")}</span>
      )}

      {/* Threads feed-row layout (their 48px threadline lane): avatar in a left
          gutter; username + body + media + stats stacked in the content column
          — same two-column grid as PostReply. Wrapped in .rootSection so the
          conversation preview's trunk can anchor on ITS box (top = below the
          root avatar, bottom overshoots into the preview's avatar). */}
      <div className={styles.rootSection}>
      {topReply && <div className={styles.previewTrunk} aria-hidden="true" />}
      <div className={styles.grid}>
        <div className={styles.avatarCell}>
          <PostProfileTrigger mask={mask}>
            <MaskAvatar seed={mask.id} size={36} online={mask.isOnline} />
          </PostProfileTrigger>
        </div>

        <div className={styles.contentCell}>
      {/* Navigable zone: header (identity) + body text. The media carousel and
          footer live OUTSIDE it, so swiping the carousel never hits a clickable
          ancestor (the iOS fix). Accessible: a focusable role=link with Enter/
          Space + aria-label. Hashtags / the show-more toggle / the profile
          trigger keep their own handlers (they stopPropagation). */}
      <div
        className={styles.navZone}
        role="link"
        tabIndex={0}
        aria-label={t("home.openThread")}
        onClick={onClick}
        onKeyDown={handleNavKeyDown}
      >
      <header className={styles.header}>
        {/* Same mask hover card as the thread (reused component). The avatar
            lives in the gutter; here only the mask id. */}
        <PostProfileTrigger mask={mask}>
          <span className={styles.maskId}>{mask.id}</span>
        </PostProfileTrigger>
        {/* No "·" separator — id and date sit close, spaced only by the
            header's small flex gap (e.g. "6be4a5 2w"). */}
        <span className={styles.timestamp}>{time}</span>
        {/* "Your thread" — PRIVATE tag, shown only to the author on their own
            threads (is_mine, a backend boolean). Feed/search only; suppressed on
            the /me screen via hideMineTag (redundant there). */}
        {isMine && !hideMineTag && (
          <>
            {/* Dot separator (same language as the replies' "· Author" meta). */}
            <span className={styles.badgeDivider} aria-hidden="true">
              ·
            </span>
            <span className={styles.mineBadge}>{t("home.yourThread")}</span>
          </>
        )}
        {/* DEBUG tool (src/settings.js): momentum from the For You engine,
            visible only with REACT_APP_DEBUG=true. In production the flag is
            off and this badge is not rendered. */}
        {DEBUG && momentum != null && (
          <span
            className={styles.momentumBadge}
            title="momentum score (For You) — visible solo en DEBUG"
          >
            <svg
              className={styles.momentumIcon}
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13 2 L4.5 13.5 H11 L9.5 22 L19.5 9.5 H12.5 Z" />
            </svg>
            {momentum.toFixed(3)}
          </span>
        )}
        {isTrending && (
          <span className={styles.trendingBadge}>
            <span className={styles.trendingTriangle}>▲</span>
            trending
          </span>
        )}
      </header>

      {/* Full text, no clamp / "Show more" (removed app-wide — same as the
          thread view). */}
      <p className={styles.body}>
        {renderTextWithHashtags(
          text,
          styles.hashtag,
          onHashtagClick,
          renderOptions
        )}
      </p>
      </div>

      {media && media.length > 0 && <ThreadMedia items={media} />}

      <footer className={styles.stats}>
        {/* Facebook-style stacked reaction summary first, then the replies
            count (thread-view speech bubble, 16px stroke 1.8 + Inter 13). */}
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
        {viewsCount > 0 && (
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
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {formatCount(viewsCount)}
          </span>
        )}
      </footer>
        </div>
      </div>
      </div>

      {/* Conversation preview (X-style second story): the root's BEST direct
          reply — attached by the backend only when it EARNED it (self-thread
          or the reactors gates), so most cards carry none. Threadline-
          connected to the root avatar; the row opens the reply's own
          permalink (which renders the full ancestor chain). Header carries
          the reply's OWN three-dots menu (outside the navZone — PostAncestor's
          anatomy); body is 3-line clamped; media renders for real (carousel/
          video/NSFW via ThreadMedia, reply-style bleed). */}
      {topReply && (
        <div className={styles.replyPreview} onClick={handlePreviewClick}>
          <div className={styles.previewAvatarCell}>
            <PostProfileTrigger mask={topReply.mask}>
              <MaskAvatar
                seed={topReply.mask.id}
                size={36}
                online={topReply.mask.isOnline}
              />
            </PostProfileTrigger>
          </div>
          <div className={styles.previewContent}>
            <header className={cx(styles.header, styles.previewHeader)}>
              <PostProfileTrigger mask={topReply.mask}>
                <span className={styles.maskId}>{topReply.mask.id}</span>
              </PostProfileTrigger>
              <span className={styles.timestamp}>{topReply.time}</span>
              {/* The OP continuing their own thread — quiet "· Author" meta
                  (is_op computed vs the ROOT author, boolean only). */}
              {topReply.isOp && (
                <span
                  className={styles.previewAuthorTag}
                  aria-label={t("post.opAuthor")}
                >
                  <span className={styles.badgeDivider} aria-hidden="true">
                    ·
                  </span>
                  {t("post.author")}
                </span>
              )}
              <span className={styles.previewSpacer} />
              {/* The reply's own three-dots (View details / Copy link /
                  Report) — full post shape, every option functional;
                  .previewMenu column-aligns its glyph with the root's. */}
              <PostOptionsMenu
                post={topReply}
                variant="inline"
                className={styles.previewMenu}
              />
            </header>
            {/* Keyboard-accessible navigable zone (the body) — the menu and
                media stay outside it, PostAncestor's exact anatomy. */}
            <div
              className={styles.previewNavZone}
              role="link"
              tabIndex={0}
              aria-label={t("home.openThread")}
              onClick={handlePreviewNavClick}
              onKeyDown={handlePreviewKeyDown}
            >
              <p className={styles.previewBody}>
                {renderTextWithHashtags(
                  topReply.text,
                  styles.hashtag,
                  onHashtagClick,
                  renderOptions
                )}
              </p>
            </div>
            {topReply.media && topReply.media.length > 0 && (
              <ThreadMedia items={topReply.media} />
            )}
            <footer className={styles.stats}>
              <ReactionStack
                reactions={topReply.reactions}
                className={styles.statReactions}
              />
              {topReply.repliesCount > 0 && (
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
                  {topReply.repliesCount}
                </span>
              )}
            </footer>
          </div>
        </div>
      )}
    </article>
  );
}

export default HomeFeedCard;
