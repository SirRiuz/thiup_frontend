import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PostProfileHoverCard from "./PostProfileHoverCard";
import PostProfileMobileModal from "./PostProfileMobileModal";
import { useCurrentUser } from "../../contexts/CurrentUserContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import styles from "../../styles/components/post/PostProfileTrigger.module.css";

const SHOW_DELAY_MS = 300;
const HIDE_DELAY_MS = 150;

/**
 * Wraps a profile trigger area and shows a profile preview — a hover card on
 * desktop, a bottom-sheet modal on mobile (avatar only — see `variant`).
 *
 * Desktop is untouched: hover (with show/hide delays and a "safe zone" so the
 * cursor can move from the trigger to the card without it disappearing) shows
 * PostProfileHoverCard; a click navigates straight to the profile.
 *
 * Mobile never wires mouseenter/mouseleave at all — touch has no real "hover
 * exit", so a held tap that crossed SHOW_DELAY_MS used to leave the tooltip
 * stuck open forever (nothing to ever hide it again; on a browser-back
 * bfcache restore the frozen "stuck open" state came right back). Instead:
 *   - variant="avatar" (the profile picture): a tap opens PostProfileMobileModal
 *     (an explicit, dismissible bottom sheet) instead of navigating straight
 *     away — Threads' own split (they ship the avatar and the username as two
 *     separate hovercard implementations, not one combined trigger).
 *   - variant="hash" (the mask @id text): a tap just navigates, no preview at
 *     all — never a tooltip, never the modal.
 *
 * Props:
 *   - mask: { id, joinedAt, postsCount, repliesCount }
 *   - children: the trigger content (typically <Identicon /> OR a hash span —
 *     most call sites already wrap each in its OWN trigger; see `variant`)
 *   - variant: "avatar" | "hash" — which mobile behavior applies (irrelevant
 *     on desktop, where both behave identically)
 *   - className: optional class composed onto the wrapper
 */
function PostProfileTrigger({ mask, children, className, variant = "hash" }) {
  const [isVisible, setIsVisible] = useState(false);
  // True from hover-enter (show pending) until the card is fully hidden —
  // gates the document scroll listener so idle triggers register NOTHING
  // (every feed card mounts several of these; an always-on capture scroll
  // listener per trigger meant hundreds firing on every scroll).
  const [isArmed, setIsArmed] = useState(false);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserMask } = useCurrentUser();
  const isMobile = useIsMobile();

  // Click on the avatar/mask → the anonymous profile (your own mask goes to
  // /profile, the private version). stopPropagation: the trigger lives inside
  // clickable rows (feed card nav zone) that must not also fire.
  const handleClick = (e) => {
    if (!mask?.id) return;
    e.stopPropagation();
    e.preventDefault();
    // Mobile avatar tap: open the sheet instead of navigating straight away.
    const target =
      currentUserMask?.id && mask.id === currentUserMask.id
        ? "/profile"
        : `/m/${mask.id}`;
    // Already on that profile (your own rows on /profile, or the author's on
    // /m/:id): a click does nothing — navigating again would remount the
    // screen and replay its entrance, and the mobile modal would be a
    // redundant preview of the exact page already on screen.
    if (location.pathname === target) return;
    if (isMobile && variant === "avatar") {
      setMobileModalOpen(true);
      return;
    }
    navigate(target);
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
  // reaction picker. capture:true because scroll events don't bubble. Only
  // registered while armed (show pending or card visible) — same observable
  // behavior, without one live listener per idle trigger.
  useEffect(() => {
    if (!isArmed) return undefined;
    const hideOnScroll = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      setIsVisible(false);
      setIsArmed(false);
    };
    document.addEventListener("scroll", hideOnScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener("scroll", hideOnScroll, { capture: true });
  }, [isArmed]);

  const handleMouseEnter = () => {
    // Moving back onto the trigger (or onto the card) cancels any pending hide.
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (isVisible) return;
    setIsArmed(true);
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
      setIsArmed(false);
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
      // Never wired on mobile: touch has no real "hover exit", so arming the
      // show timer here with nothing to ever un-arm it is exactly the stuck-
      // tooltip bug this split was built to remove.
      onMouseEnter={isMobile ? undefined : handleMouseEnter}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
    >
      {children}
      {!isMobile && isVisible && (
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
      {isMobile && variant === "avatar" && mobileModalOpen && (
        <PostProfileMobileModal
          mask={mask}
          onClose={() => setMobileModalOpen(false)}
        />
      )}
    </span>
  );
}

export default PostProfileTrigger;
