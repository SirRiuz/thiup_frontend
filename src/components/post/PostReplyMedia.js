import styles from "../../styles/components/post/PostReplyMedia.module.css";

const PLACEHOLDER_BGS = ["#ddd8c8", "#d4cfbf", "#e0dccc", "#d8d3c3"];

function PhotoIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9b9591"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function PlayOverlay() {
  return (
    <div className={styles.playWrapper}>
      <div className={styles.playCircle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fdfcf8" stroke="none">
          <polygon points="6 3 21 12 6 21" />
        </svg>
      </div>
    </div>
  );
}

function Placeholder({ bg, kind = "photo", iconSize = 22 }) {
  return (
    <div className={styles.placeholder} style={{ background: bg }}>
      <PhotoIcon size={iconSize} />
      {kind === "video" && <PlayOverlay />}
    </div>
  );
}

function PostReplyMedia({ items }) {
  if (!items || items.length === 0) return null;
  const count = items.length;
  const isVideo = items[0]?.type === "video";

  if (count === 1) {
    return (
      <div className={styles.single}>
        <Placeholder
          bg={PLACEHOLDER_BGS[0]}
          kind={isVideo ? "video" : "photo"}
          iconSize={28}
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className={styles.grid2}>
        <Placeholder bg={PLACEHOLDER_BGS[0]} iconSize={22} />
        <Placeholder bg={PLACEHOLDER_BGS[1]} iconSize={22} />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={styles.grid3}>
        <div className={styles.grid3Large}>
          <Placeholder bg={PLACEHOLDER_BGS[0]} iconSize={24} />
        </div>
        <Placeholder bg={PLACEHOLDER_BGS[1]} iconSize={20} />
        <Placeholder bg={PLACEHOLDER_BGS[2]} iconSize={20} />
      </div>
    );
  }

  return (
    <div className={styles.grid4}>
      <Placeholder bg={PLACEHOLDER_BGS[0]} iconSize={20} />
      <Placeholder bg={PLACEHOLDER_BGS[1]} iconSize={20} />
      <Placeholder bg={PLACEHOLDER_BGS[2]} iconSize={20} />
      <Placeholder bg={PLACEHOLDER_BGS[3]} iconSize={20} />
    </div>
  );
}

export default PostReplyMedia;
