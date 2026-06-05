import React from "react";
import MaskAvatar from "../MaskAvatar";
import PostProfileTrigger from "../post/PostProfileTrigger";
import { splitByMatch } from "../../utils/matchText";
import styles from "../../styles/components/search/SearchUserCard.module.css";

function SearchUserCard({ user, highlightQuery, onClick }) {
  // Mismo hover card de máscara que el thread/feed. fullHash permite el
  // fetch del perfil real; joined/posts del listado quedan como fallback.
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
          {user.postsCount} posts &middot; joined {formatJoinDate(user.joinedAt)}
        </span>
      </div>
    </button>
  );
}

// Insensible a tildes y case (espejo del unaccent del backend): buscar 'peru'
// resalta 'perú'. Muestra siempre el texto original.
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
