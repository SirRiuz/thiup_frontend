import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AnimatedCounter from "./AnimatedCounter";
import { ensureScrollSuppressor } from "../../utils/scrollSuppressor";
import styles from "../../styles/components/post/PostReactionPill.module.css";

function PostReactionPill({
  emoji,
  count,
  name,
  active = false,
  variant = "reply",
  onClick,
}) {
  const { t } = useTranslation();
  // Hides the tooltip during scroll (idempotent global listener).
  useEffect(() => {
    ensureScrollSuppressor();
  }, []);

  const variantClass = variant === "op" ? styles.pill_op : styles.pill_reply;
  const className = `${styles.pill} ${variantClass} ${active ? styles.pillActive : ""}`;
  // Translatable reaction name (reactions.<name>), falling back to the raw
  // name. Same tooltip as the feed cards.
  const label = name ? t(`reactions.${name}`, { defaultValue: name }) : "";

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label || undefined}
      title={label || undefined}
    >
      <span className={styles.emoji}>{emoji}</span>
      <AnimatedCounter value={count} className={styles.count} />
      {label && (
        <span className={styles.tooltip} aria-hidden="true">
          {label}
        </span>
      )}
    </button>
  );
}

export default PostReactionPill;
