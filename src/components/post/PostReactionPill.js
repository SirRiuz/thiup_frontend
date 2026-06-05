import AnimatedCounter from "./AnimatedCounter";
import styles from "../../styles/components/post/PostReactionPill.module.css";

function PostReactionPill({
  emoji,
  count,
  active = false,
  variant = "reply",
  onClick,
}) {
  const variantClass = variant === "op" ? styles.pill_op : styles.pill_reply;
  const className = `${styles.pill} ${variantClass} ${active ? styles.pillActive : ""}`;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={styles.emoji}>{emoji}</span>
      <AnimatedCounter value={count} className={styles.count} />
    </button>
  );
}

export default PostReactionPill;
