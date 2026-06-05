import React from "react";
import TagSparkline from "./TagSparkline";
import { splitByMatch } from "../../utils/matchText";
import styles from "../../styles/components/search/SearchTagCard.module.css";

/**
 * Card de un tag en el tab 'Tags' del SearchNew modo query.
 * `activityMax` = máximo global entre los tags visibles → escala compartida
 * de los sparklines (alturas comparables entre tags).
 */
function SearchTagCard({ tag, activityMax, highlightQuery, onClick }) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.tagChip}>
        #{renderHighlighted(tag.name, highlightQuery, styles.highlight)}
      </span>
      <span className={styles.count}>{tag.postsCount} posts</span>
      <span className={styles.spark}>
        {/* data = serie real (posts/día); seed = fallback mock si no viene */}
        <TagSparkline
          data={tag.activity}
          maxValue={activityMax}
          seed={tag.name}
        />
      </span>
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

export default SearchTagCard;
