import React from "react";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostProfileTrigger from "../post/PostProfileTrigger";
import { splitByMatch } from "../../utils/matchText";
import styles from "../../styles/components/search/SearchUserCard.module.css";

function SearchUserCard({ user, highlightQuery, onClick }) {
  const { t } = useTranslation();
  // Same mask hover card as the thread/feed. fullHash enables the real
  // profile fetch; joined/posts from the listing remain as fallback.
  const hoverMask = {
    id: user.maskId,
    fullHash: user.fullHash,
    joinedAt: user.joinedAt,
    postsCount: user.postsCount,
  };

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <PostProfileTrigger mask={hoverMask}>
        <div className={styles.identiconWrap}>
          <MaskAvatar seed={user.maskId} size={36} />
        </div>
      </PostProfileTrigger>
      <div className={styles.info}>
        <span className={styles.maskId}>
          {renderHighlighted(user.maskId, highlightQuery, styles.highlight)}
        </span>
        <span className={styles.meta}>
          {user.postsCount} {t("profile.posts")} &middot;{" "}
          {t("profile.joined", { date: formatJoinDate(user.joinedAt) })}
        </span>
      </div>
    </button>
  );
}

// Accent- and case-insensitive (mirror of the backend's unaccent): searching
// 'peru' highlights 'perú'. Always shows the original text.
function renderHighlighted(text, query, className) {
  if (!query || !text) return text;
  return splitByMatch(text, query).map((segment, idx) =>
    segment.match ? (
      <mark key={idx} className={className}>
        {segment.text}
      </mark>
    ) : (
      <React.Fragment key={idx}>{segment.text}</React.Fragment>
    )
  );
}

function formatJoinDate(iso) {
  try {
    const date = new Date(iso);
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${month} ${year}`;
  } catch (e) {
    return iso;
  }
}

export default SearchUserCard;
