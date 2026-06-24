import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostProfileTrigger from "../post/PostProfileTrigger";
import PostOptionsMenu from "../post/PostOptionsMenu";
import ThreadMedia from "../media/ThreadMedia";
import ThreadText from "../post/ThreadText";
import { formatCount, renderTextWithHashtags } from "./homeHelpers";
import { DEBUG } from "../../settings";
import { ensureScrollSuppressor } from "../../utils/scrollSuppressor";
import styles from "../../styles/components/home/HomeFeedCard.module.css";

// Optional explanatory badge on the just-created card ("Your new thread").
// Prepared but OFF by default — flip to true to make the reason for the
// highlight explicit. Copy lives in i18n (home.newThreadBadge).
const SHOW_NEW_BADGE = false;

function HomeFeedCard({
  post,
  onClick,
  onHashtagClick,
  isLast,
  isNew,
  hideMineTag,
  highlightQuery,
  activeTag,
}) {
  const { t } = useTranslation();
  // Hides the reaction tooltips during scroll (global listener, idempotent:
  // it only registers once even with many cards).
  useEffect(() => {
    ensureScrollSuppressor();
  }, []);
  // Translatable reaction name (reactions.<name> in i18n). Falls back to the
  // raw backend name if there's no key.
  const reactionLabel = (name) =>
    name ? t(`reactions.${name}`, { defaultValue: name }) : "";
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
  } = post;

  // ALL the reactions, same as the thread (previously: slice(0,3) truncated
  // the feed to top-3 and hid the rest).
  const visibleReactions = reactions;

  const renderOptions = {
    highlightQuery,
    highlightClassName: styles.highlight,
    activeTag,
    activeTagClassName: styles.hashtagActive,
  };

  return (
    <article
      className={`${styles.card} ${isLast ? styles.cardLast : ""} ${
        isNew ? styles.cardNew : ""
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {/* Three-dots options (View details / Copy link / Report). Self-contained;
          stops propagation so it never triggers the card's navigation. */}
      <PostOptionsMenu post={post} />

      {/* Optional "why is this highlighted" badge — fades with the card. Off by
          default (SHOW_NEW_BADGE); shown only on the just-created thread. */}
      {isNew && SHOW_NEW_BADGE && (
        <span className={styles.newBadge}>{t("home.newThreadBadge")}</span>
      )}

      <header className={styles.header}>
        {/* Same mask hover card as the thread (reused component, same
            delays/safe-zone). Its internal gap (10px) = the header's. */}
        <PostProfileTrigger mask={mask}>
          <span className={styles.identiconWrap}>
            <MaskAvatar seed={mask.id} size={22} />
          </span>
          <span className={styles.maskId}>{mask.id}</span>
        </PostProfileTrigger>
        {/* No "·" separator — id and date sit close, spaced only by the
            header's small flex gap (e.g. "6be4a5 2w"). */}
        <span className={styles.timestamp}>{time}</span>
        {/* "Your thread" — PRIVATE tag, shown only to the author on their own
            threads (is_mine, a backend boolean). Feed/search only; suppressed on
            the /me screen via hideMineTag (redundant there). */}
        {isMine && !hideMineTag && (
          <span className={styles.mineBadge}>{t("home.yourThread")}</span>
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

      <ThreadText text={text} className={styles.body}>
        {renderTextWithHashtags(
          text,
          styles.hashtag,
          onHashtagClick,
          renderOptions
        )}
      </ThreadText>

      {media && media.length > 0 && <ThreadMedia items={media} />}

      <footer className={styles.stats}>
        <span className={styles.statWithIcon}>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {repliesCount}
        </span>
        {viewsCount > 0 && (
          <span className={styles.statWithIcon}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {formatCount(viewsCount)}
          </span>
        )}
        {visibleReactions.map((r, idx) => {
          const label = reactionLabel(r.name);
          return (
            <span
              key={idx}
              className={`${styles.statReaction} ${
                r.userReacted ? styles.statReactionActive : ""
              }`}
              // Accessible name (SR + mobile long-press). The visual desktop
              // tooltip is provided by .reactionTooltip (CSS hover).
              aria-label={label}
              title={label}
            >
              <span className={styles.statReactionEmoji}>{r.emoji}</span>
              {r.count}
              {label && (
                <span className={styles.reactionTooltip} aria-hidden="true">
                  {label}
                </span>
              )}
            </span>
          );
        })}
      </footer>
    </article>
  );
}

export default HomeFeedCard;
