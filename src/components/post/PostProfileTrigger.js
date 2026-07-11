import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostProfileHoverCard from "./PostProfileHoverCard";
import { useCurrentUser } from "../../contexts/CurrentUserContext";
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
  const navigate = useNavigate();
  const { currentUserMask } = useCurrentUser();

  // Click on the avatar/mask → the anonymous profile (your own mask goes to
  // /me, the private version). stopPropagation: the trigger lives inside
  // clickable rows (feed card nav zone) that must not also fire.
  const handleClick = (e) => {
    if (!mask?.id) return;
    e.stopPropagation();
    e.preventDefault();
    navigate(
      currentUserMask?.id && mask.id === currentUserMask.id
        ? "/me"
        : `/m/${mask.id}`
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick(e);
    }
  };

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Hide the card (and cancel any pending show) as soon as the page scrolls —
  // the card is anchored to the trigger and would otherwise drift. Same as the
  // reaction picker. capture:true because scroll events don't bubble.
  useEffect(() => {
    const hideOnScroll = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      setIsVisible(false);
    };
    document.addEventListener("scroll", hideOnScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener("scroll", hideOnScroll, { capture: true });
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
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        // data-hover-card: lets clickable ancestors (the feed card's whole-row
        // navigation) ignore clicks landing on the floating profile card.
        <div className={styles.cardContainer} data-hover-card="">
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
