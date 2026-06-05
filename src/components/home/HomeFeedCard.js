import MaskAvatar from "../MaskAvatar";
import PostProfileTrigger from "../post/PostProfileTrigger";
import { formatCount, renderTextWithHashtags } from "./homeHelpers";
import { DEBUG } from "../../settings";
import styles from "../../styles/components/home/HomeFeedCard.module.css";

function HomeFeedCard({
  post,
  onClick,
  onHashtagClick,
  isLast,
  highlightQuery,
  activeTag,
}) {
  const {
    mask,
    text,
    time,
    isTrending,
    momentum,
    repliesCount,
    viewsCount,
    reactions = [],
  } = post;

  // TODAS las reacciones, igual que el thread (antes: slice(0,3) truncaba
  // el feed a top-3 y ocultaba el resto).
  const visibleReactions = reactions;

  const renderOptions = {
    highlightQuery,
    highlightClassName: styles.highlight,
    activeTag,
    activeTagClassName: styles.hashtagActive,
  };

  return (
    <article
      className={`${styles.card} ${isLast ? styles.cardLast : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <header className={styles.header}>
        {/* Mismo hover card de máscara que el thread (componente reutilizado,
            mismos delays/safe-zone). Su gap interno (10px) = el del header. */}
        <PostProfileTrigger mask={mask}>
          <span className={styles.identiconWrap}>
            <MaskAvatar seed={mask.id} size={22} />
          </span>
          <span className={styles.maskId}>{mask.id}</span>
        </PostProfileTrigger>
        <span className={styles.divider}>·</span>
        <span className={styles.timestamp}>{time}</span>
        {/* Herramienta de DEBUG (src/settings.js): momentum del motor For
            You, visible solo con REACT_APP_DEBUG=true. En producción el
            flag va apagado y este badge no se renderiza. */}
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

      <p className={styles.body}>
        {renderTextWithHashtags(
          text,
          styles.hashtag,
          onHashtagClick,
          renderOptions
        )}
      </p>

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
        {visibleReactions.map((r, idx) => (
          <span key={idx} className={styles.statReaction}>
            <span className={styles.statReactionEmoji}>{r.emoji}</span>
            {r.count}
          </span>
        ))}
      </footer>
    </article>
  );
}

export default HomeFeedCard;
