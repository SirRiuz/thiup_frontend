import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

function mediaPath(postId, mediaId) {
  return `/p/${postId}/m/${mediaId}`;
}

/**
 * Wires a SINGLE post/reply's own media (whatever `media` array a
 * `ThreadMedia` instance renders) to the URL: `/p/:postId/m/:mediaId`.
 * Every post is independently addressable at `/p/:id` (OP, reply, or
 * ancestor alike — the ancestor-chain architecture already treats any of
 * them as a valid "head"), so this is the ONE mechanism every consumer uses
 * — Post.js's own OP, PostReply, PostAncestor, HomeFeedCard (both its own
 * media and its embedded top-reply preview) — each just supplies the id of
 * the post the media belongs to.
 *
 * CRITICAL product decision: opening a photo NEVER navigates the app
 * anywhere, from anywhere — open it from /home, close it, you're still on
 * /home, scroll and all. Only the ADDRESS BAR reflects it, via the RAW
 * History API (`window.history.pushState`/`replaceState`, never
 * react-router's `navigate()`), which is deliberately invisible to
 * react-router: it only reacts to its OWN push/replace calls or to a real
 * `popstate` (an actual back/forward traversal) — so open/slide/close never
 * touch what's actually rendered underneath the viewer. The URL only
 * becomes "real" the moment something ELSE reads it as a fresh navigation:
 * a reload, a pasted share link, or the user actually pressing the
 * browser's back button (a genuine popstate, which DOES resolve through
 * react-router normally, landing on this post's own page with the viewer
 * pre-opened via `initialIndex` below — the same mechanism a cold deep link
 * uses).
 */
export default function useMediaViewerUrlSync(postId, media) {
  const navigate = useNavigate();
  const { id: routeId, mediaId: routeMediaId } = useParams();
  // True only when react-router itself put us here — a REAL route match on
  // this exact post's page (a fresh load, reload, or a real back/forward
  // landing on it), never a cosmetic pushState from elsewhere.
  const isOwnPage = !!postId && routeId === postId;

  const initialIndex = useMemo(() => {
    if (!isOwnPage || !routeMediaId || !media) return null;
    const i = media.findIndex((m) => m.id === routeMediaId);
    return i === -1 ? null : i;
  }, [isOwnPage, routeMediaId, media]);

  // A stale/invalid mediaId on a REAL page load (bad link, or the item is
  // gone): correct it through react-router (a real replace) — we ARE
  // legitimately on this route via normal routing, so its internal state
  // should resync properly instead of silently drifting out of sync.
  useEffect(() => {
    if (!isOwnPage || !routeMediaId || !media || media.length === 0) return;
    if (initialIndex == null) {
      navigate(`/p/${routeId}`, { replace: true });
    }
  }, [isOwnPage, routeMediaId, media, initialIndex, routeId, navigate]);

  // True while a viewer opened FROM HERE has pushed a decorative history
  // entry (see onViewerOpen) — read on close to undo exactly that entry,
  // regardless of what screen it was opened from.
  const pushedRef = useRef(false);

  const onViewerOpen = useCallback(
    (index, item) => {
      if (!item || !postId) return;
      pushedRef.current = true;
      window.history.pushState(null, "", mediaPath(postId, item.id));
    },
    [postId]
  );

  const onViewerIndexChange = useCallback(
    (index, item) => {
      if (!item || !postId || !pushedRef.current) return;
      window.history.replaceState(null, "", mediaPath(postId, item.id));
    },
    [postId]
  );

  const onViewerClose = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      // Undoes exactly the entry our own open pushed — a real back step,
      // landing on whatever screen the user actually had open, completely
      // undisturbed (react-router never left it, so there's nothing to
      // restore: it was never touched in the first place).
      window.history.back();
      return;
    }
    // No entry of ours to undo: a genuine deep link/reload landed directly
    // on this post's own page with the viewer auto-opened from the URL
    // (initialIndex) — a REAL route, so closing goes through react-router
    // normally (keeps its internal state in sync) instead of history.back(),
    // which could leave the app (there's no in-app entry before this one).
    if (isOwnPage) {
      navigate(`/p/${routeId}`, { replace: true });
    }
  }, [isOwnPage, routeId, navigate]);

  const shareUrlBuilder = useCallback(
    (item) =>
      item && postId
        ? `${window.location.origin}${mediaPath(postId, item.id)}`
        : null,
    [postId]
  );

  return {
    initialIndex,
    onViewerOpen,
    onViewerIndexChange,
    onViewerClose,
    shareUrlBuilder,
  };
}
