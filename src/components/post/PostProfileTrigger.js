import { useEffect, useRef, useState } from "react";
import PostProfileHoverCard from "./PostProfileHoverCard";
import styles from "../../styles/components/post/PostProfileTrigger.module.css";

const SHOW_DELAY_MS = 300;
const HIDE_DELAY_MS = 150;

/**
 * Wraps a profile trigger area (identicon + hash) and shows a profile hover
 * card on hover with show/hide delays and a "safe zone": the cursor can move
 * from the trigger to the card without the card disappearing.
 *
 * Props:
 *   - mask: { id, joinedAt, postsCount, repliesCount }
 *   - children: the trigger content (typically <Identicon /> + a hash span)
 *   - className: optional class composed onto the wrapper
 */
function PostProfileTrigger({ mask, children, className }) {
  const [isVisible, setIsVisible] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    // Moving back onto the trigger (or onto the card) cancels any pending hide.
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (isVisible) return;
    showTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      showTimerRef.current = null;
    }, SHOW_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  };

  const wrapperClassName = className
    ? `${styles.trigger} ${className}`
    : styles.trigger;

  return (
    <span
      className={wrapperClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={styles.cardContainer}>
          <PostProfileHoverCard
            mask={mask}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        </div>
      )}
    </span>
  );
}

export default PostProfileTrigger;
