import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import PostProfileHoverCard from "./PostProfileHoverCard";
import PostProfileMobileModal from "./PostProfileMobileModal";
import { useCurrentUser } from "../../contexts/CurrentUserContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import useMenuVerticalFlip from "../../hooks/useMenuVerticalFlip";
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
  // Fixed-viewport coords for the portaled card (see the render below) —
  // set once, right when the show timer fires, from the trigger's OWN
  // position at that moment (matches PostOptionsMenu's desktop popover:
  // a one-time snapshot on open, not tracked live — scroll instead HIDES
  // the card via the existing armed/scroll effect below, same as before).
  const [pos, setPos] = useState(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserMask } = useCurrentUser();
  const isMobile = useIsMobile();

  // Smart open: flips the card ABOVE the trigger instead of below when
  // there isn't room (a mask mention near the bottom of the viewport used
  // to get the card clipped by the screen edge) — same hook PostOptionsMenu
  // already uses for its desktop popover.
  const correctedTop = useMenuVerticalFlip({
    open: isVisible && !isMobile,
    triggerRef,
    menuRef: cardRef,
  });

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
      // Snapshot the trigger's viewport position right as the card is about
      // to mount — the portal below renders it at document.body, so it no
      // longer inherits position from the DOM tree here.
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, left: r.left });
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
      ref={triggerRef}
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
      {!isMobile &&
        isVisible &&
        pos &&
        createPortal(
          // Portaled to document.body (was an inline `position: absolute`
          // child of the trigger) — an in-tree card is trapped inside
          // whatever stacking context its ancestors happen to create
          // (position+z-index, transform, opacity<1…), so unrelated
          // elements elsewhere on the page could end up rendering on top of
          // it depending on where the trigger happened to sit. Portaling
          // escapes that entirely, matching every other trigger-anchored
          // popover in the app (PostOptionsMenu's desktop popover,
          // MediaContextMenu) and this component's OWN mobile sibling
          // (PostProfileMobileModal, already portaled).
          // data-hover-card: lets clickable ancestors (the feed card's
          // whole-row navigation) ignore clicks landing on the card — moot
          // for DOM bubbling now that it's portaled out of that subtree,
          // kept for anything still querying the attribute directly.
          <div
            ref={cardRef}
            className={styles.cardContainer}
            data-hover-card=""
            style={{ top: correctedTop ?? pos.top, left: pos.left }}
          >
            <PostProfileHoverCard
              mask={mask}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </div>,
          document.body
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
