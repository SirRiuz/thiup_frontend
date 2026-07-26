import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrandLogo from "../components/BrandLogo";
import MaskAvatar from "../components/MaskAvatar";
import PostCommentBox from "../components/post/PostCommentBox";
import PostOptionsMenu from "../components/post/PostOptionsMenu";
import PostProfileTrigger from "../components/post/PostProfileTrigger";
import PostReactionPicker from "../components/post/PostReactionPicker";
import PostRepliesBar from "../components/post/PostRepliesBar";
import ReactionStack from "../components/post/ReactionStack";
import PostAncestor from "../components/post/PostAncestor";
import PostInitialSkeleton from "../components/post/PostInitialSkeleton";
import PostReply from "../components/post/PostReply";
import PostReplySkeleton from "../components/post/PostReplySkeleton";
import ThreadMedia from "../components/media/ThreadMedia";
import PostThreadNotFound from "../components/post/PostThreadNotFound";
import HomeFeedRetryBanner from "../components/home/HomeFeedRetryBanner";
import { hasSavedScrollPosition } from "../components/ScrollToTop";
import { useThread } from "../hooks/useThread";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import usePageTitle from "../hooks/usePageTitle";
import useMobileSurfacePage from "../hooks/useMobileSurfacePage";
import { useIsMobile } from "../hooks/useIsMobile";
import cx from "../utils/cx";
import {
  addInteraction,
  extractTags,
  AFFINITY_WEIGHTS,
  DWELL_THRESHOLD_MS,
} from "../utils/affinity";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import { useToast } from "../contexts/ToastContext";
import { useScrollLock } from "../utils/scrollLock";
import { renderTextWithHashtags } from "../components/home/homeHelpers";
import { fullDateTitle } from "../utils/formatDate";
import styles from "../styles/screens/Post.module.css";

function Post() {
  const { t, i18n } = useTranslation();
  const showToast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Desktop vs mobile app-bar anatomy: the DESKTOP bar is Threads' new one
  // (circular floating back + centered title, options on the OP header); the
  // MOBILE bar keeps the previous design untouched (plain arrow + right menu).
  const isMobile = useIsMobile();
  // REAL current user (from /me/): a single global request, cached in the
  // context — here it is only consumed.
  const { currentUserMask } = useCurrentUser();

  // 'Go back' robust against deep links: location.key === "default" is React
  // Router v6's idiomatic signal of the FIRST entry of the session (direct
  // entry, no internal history) — navigate(-1) would have no destination, so
  // we fall back to /home. With history: normal back (preserves the
  // feed/search scroll via the scroll manager). Same pattern as /search's ←.
  const handleBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/home", { replace: true });
    }
  };

  const {
    thread,
    replies,
    isLoading,
    isLoadingMore,
    loadMoreError,
    isReloadingReplies,
    isCreatingReply,
    createReplyError,
    hasMore,
    error,
    sortBy,
    selectSort,
    createReply,
    attachMediaToReply,
    loadMore,
    retry,
    toggleReaction,
    // Seed from the feed navigation (router state): the clicked card's post —
    // paints the OP instantly; only the replies show a loading state. Absent
    // on hard reloads / direct links → normal full-skeleton flow.
  } = useThread(id, location.state?.seedThread);

  // Título de pestaña estilo Threads: muestra el texto del hilo una vez
  // cargado; mientras carga (o si falla) cae al genérico "Thread · Thiup".
  // La ruta sigue noindex — esto solo afecta la pestaña/historial, no SEO.
  usePageTitle(thread ? null : "pageTitle.thread", {
    noindex: true,
    prefix: thread?.text || "",
  });

  const [replyingTo, setReplyingTo] = useState(null);
  // Newly created reply: we scroll it into view and highlight it ~3s.
  const [highlightedReplyId, setHighlightedReplyId] = useState(null);
  const commentBoxRef = useRef(null);
  const repliesSectionRef = useRef(null);
  const opSectionRef = useRef(null);
  const ancestorChainRef = useRef(null);
  const pageRef = useRef(null);

  // Auto-scroll to the very top of the document after a successful sort change
  // (smooth, so the re-sorted thread is seen from the start). Mirrors HomeNew's
  // justSwitchedRef.
  const previousSortByRef = useRef(sortBy);
  const justSwitchedRef = useRef(false);

  useEffect(() => {
    if (previousSortByRef.current !== sortBy) {
      justSwitchedRef.current = true;
      previousSortByRef.current = sortBy;
    }
  }, [sortBy]);

  useEffect(() => {
    if (justSwitchedRef.current && !isReloadingReplies) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      justSwitchedRef.current = false;
    }
  }, [isReloadingReplies]);

  // ── Dwell time (client-side affinity profile) ────────────────────────
  // If the user spends > DWELL_THRESHOLD_MS with the thread VISIBLE, it counts
  // as "they read it" → weak signal of interest in its tags. Page Visibility
  // pauses the counting with the tab in the background (switching tabs and
  // coming back an hour later is not reading). Open-and-leave quickly adds nothing.
  //
  // The thread loads async: the tags are read from a ref that updates when it
  // arrives. Keyed by `id` — navigating between posts (same component, different
  // param) closes the previous post's dwell in the cleanup, with no dangling
  // timers or listeners.
  const dwellTagsRef = useRef([]);
  useEffect(() => {
    dwellTagsRef.current = thread ? extractTags(thread.text) : [];
  }, [thread]);

  useEffect(() => {
    let visibleMs = 0;
    let visibleSince = document.hidden ? null : Date.now();

    const onVisibility = () => {
      if (document.hidden) {
        // To background: accumulate the visible stretch and pause.
        if (visibleSince != null) {
          visibleMs += Date.now() - visibleSince;
          visibleSince = null;
        }
      } else if (visibleSince == null) {
        // Back to foreground: resume the counting.
        visibleSince = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (visibleSince != null) {
        visibleMs += Date.now() - visibleSince;
      }
      if (visibleMs >= DWELL_THRESHOLD_MS) {
        addInteraction(dwellTagsRef.current, AFFINITY_WEIGHTS.dwell);
      }
    };
  }, [id]);

  // The hook is the single source of truth. Reactions are updated
  // optimistically INSIDE the hook (toggleReaction + rollback on error), so
  // here we only render its state. Aliases for JSX readability.
  const post = thread;
  const displayReplies = replies;
  // Comment permalink (Threads' thread continuity): when the head is a reply,
  // the backend sends its ancestor chain — root thread FIRST. Rendered above
  // the OP section, threadline-connected. Empty for root threads and while a
  // seeded/loading head hasn't resolved yet (the chain pops in with the fetch).
  const ancestors = post?.ancestors || [];
  // Stable STRUCTURE flag for the chain effects: the seed→fetch transition
  // replaces the `post` OBJECT (new identity, same structure) — effects
  // keyed on `post` were cleaned up right then (killing the scroll-anchoring
  // observer mid-flight, feed clicks only; deep links set post once and
  // never hit this) while the entry gate blocked their re-run. Keying on
  // the boolean keeps them alive across the swap.
  const hasAncestorChain = ancestors.length > 0;

  // Total replies from the backend (DRF count, already mapped to thread.replyCount).
  // Empty while loading; plural-aware once the thread is resolved.
  const replyCount = post?.replyCount ?? 0;
  // The local list covers the first just-created reply (count still 0).
  const hasReplies = replyCount > 0 || replies.length > 0;
  const repliesLabel = !post
    ? ""
    : replyCount === 0
    ? t("post.noReplies")
    : t("post.replyCount", { count: replyCount });

  // Scroll lock during the initial loading — the comment box doesn't appear,
  // so we also don't want the user to scroll to an empty layout.
  // Uses the centralized scroll-lock (counter): coexists with the splash
  // without clobbering it (before, restoring here could leave the body in
  // eternal 'hidden').
  useScrollLock(isLoading && !thread);

  // Mobile: full-bleed #fdfcf8 sheet — paint html/body/AppShell to match so the
  // iOS elastic overscroll never shows a mismatched warm strip (shared hook,
  // also used by /home; restores on unmount / desktop).
  useMobileSurfacePage(pageRef);

  // Hashtag click → normal search for that hashtag (q=#tag), identical to /home.
  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

  // Ancestor row click → that node's OWN permalink (Threads' continuity: every
  // node of the chain is a link to its page). Seeded like a feed-card
  // navigation — INCLUDING the part of the chain we already know (everything
  // above the clicked node), so the target page paints chain-complete on its
  // first frame and anchors pre-paint; the fetch only reconciles below.
  const handleOpenAncestor = (ancestor, index) => {
    navigate(`/p/${ancestor.id}`, {
      state: {
        seedThread: { ...ancestor, ancestors: ancestors.slice(0, index) },
      },
    });
  };

  // === Comment-permalink landing anchor (Threads' behavior) ===============
  // A permalink with an ancestor chain must land FOCUSED on the clicked
  // reply, not on the root: the chain renders ABOVE the head, so without
  // this the fetch shoves the head below the fold (scroll stays at 0 from
  // the navigation) and the user reads the wrong post.
  //
  // WHEN: whenever this history entry has NO saved scroll position in the
  // scroll manager — one rule that covers every fresh arrival: a PUSH from a
  // preview/ancestor click, a cold deep link, a RELOAD (the entry keeps its
  // location.key but the in-memory positions are gone — nothing to restore,
  // so anchor), and re-entering the same permalink. Real back/forward HAS a
  // saved position → stand down and let the manager restore it exactly.
  //
  // HOW: pin the head section just under the 60px app bar. First pass runs
  // pre-paint (layout effect, after ScrollToTop's scroll-to-0 — it mounts
  // earlier in the tree), then RE-ASSERTS per frame for ~0.5s: late layout
  // (the initial-load scroll lock releasing, ancestor media resolving)
  // otherwise drifts the head after the single early scroll — the same
  // per-frame retry technique as the manager's own restoreTo. Any real user
  // scroll input aborts immediately (never fight the user).
  // GUARANTEED scroll room — deterministic and present on EVERY visit type
  // (push, back/forward AND reload), not just when the anchor fires: the
  // surface stretches to `100vh - 60px + head offset`, i.e. exactly one full
  // column BELOW the head plus the chain above it, so the head can always
  // dock under the bar AND any position the scroll manager saved on a
  // previous visit stays reachable after remount (the old post-anchor grow
  // was cleaned up on exit, which stranded POP restores mid-way — and it
  // measured transient layouts, skeletons included, causing the grow-then-
  // shrink jump). Function of the CHAIN's height only (ResizeObserver tracks
  // ancestor media resolving) — never of the replies below.
  useLayoutEffect(() => {
    const op = opSectionRef.current;
    const chain = ancestorChainRef.current;
    if (!hasAncestorChain || !op || !chain) return undefined;
    const surface = op.parentElement; // .opSection is a direct child of .surface
    if (!surface) return undefined;
    const apply = () => {
      surface.style.minHeight = `calc(100vh - 60px + ${op.offsetTop}px)`;
    };
    apply();
    // Observe the CHAIN wrapper, never the surface: the surface's box is
    // stretched to this very min-height, so its size does not change when
    // the chain grows (ancestor media resolving) and a surface observer
    // never fires. Re-applying the same value causes no resize loop.
    const observer = new ResizeObserver(apply);
    observer.observe(chain);
    return () => {
      observer.disconnect();
      surface.style.minHeight = "";
    };
  }, [hasAncestorChain]);

  useLayoutEffect(() => {
    if (!hasAncestorChain) return undefined;
    // Real back/forward: the manager restores the exact saved position.
    // (No "once per entry" ref gate here: StrictMode double-invokes mount
    // effects — the first cleanup disconnected the pinning observer and a
    // ref gate blocked the second run from re-registering it, which is why
    // seeded feed clicks drifted while deep links held. Re-running the
    // whole effect is idempotent: it can only fire pre-paint at the chain's
    // first render for this entry, never after a user scroll.)
    if (hasSavedScrollPosition(location.key)) return undefined;
    const op = opSectionRef.current;
    if (!op) return undefined;

    // The scroll-room effect above (declared FIRST → already ran in this
    // commit) guarantees the target is reachable — the anchor only scrolls.
    // Landing = the head section's top edge at the bar's bottom: the parent
    // content is FULLY hidden above the fold and only the threadline stub in
    // the chained section's 16px top padding peeks — the "there is thread
    // above, scroll up" indicator.
    let aborted = false;
    const anchor = () => {
      if (aborted) return;
      // +1px bias: sub-pixel layout rounding could leave a hairline of the
      // parent peeking above the bar — land one pixel deeper so the parent
      // is ALWAYS fully hidden (the trunk stub in the chained padding stays
      // the only "there is thread above" indicator).
      window.scrollTo(
        0,
        Math.max(0, op.getBoundingClientRect().top + window.scrollY - 60 + 1)
      );
    };

    anchor();

    // MANUAL SCROLL ANCHORING: content ABOVE the head keeps settling after
    // the landing (ancestor media resolving, font swap) and every growth
    // shifted the head down, exposing the parent's tail — a fixed-length
    // retry loop always lost that race. Instead, compensate: whenever the
    // CHAIN's height changes, re-anchor so the head stays visually pinned.
    // The observed box MUST be the chain wrapper: the surface's box is
    // min-height-stretched (scroll room), so it does not resize when the
    // chain grows and a surface observer never fires — the exact bug that
    // kept exposing the parent's tail on production media without stored
    // dimensions. Active until the FIRST user scroll gesture — from then on
    // the page belongs to the user.
    const observer = new ResizeObserver(anchor);
    const chain = ancestorChainRef.current;
    if (chain) observer.observe(chain);

    // One extra assert right after first paint (belt: the pre-paint scroll
    // can clamp if the room's min-height landed in this same commit).
    const rafId = requestAnimationFrame(anchor);

    const stop = () => {
      aborted = true;
      observer.disconnect();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });

    return () => {
      stop();
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
    };
  }, [hasAncestorChain, location.key]);

  // Infinite scroll for the replies (same engine as the feeds): a sentinel
  // after the list prefetches the next page one screen ahead. Stands down
  // while ANY fetch is in flight and after a pagination failure (the retry
  // banner takes over — no self-re-firing loop on persistent errors).
  const repliesSentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore || isReloadingReplies || !!loadMoreError,
  });

  const handleReplyClick = (target) => {
    setReplyingTo(target);
    setTimeout(() => {
      commentBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Creates a comment/sub-comment. parentId = thread.id for a direct comment, or
  // the id of the reply being replied to (replyingTo.sourceId) for a sub-comment.
  // Resets replyingTo only if the POST succeeded (createReply re-throws on error).
  const handleSubmitReply = async ({ parentId, text, confirmMedia }) => {
    // Reuse the shared loading→success toast (same as publishing a thread), but
    // WITHOUT a "View" action — the user is already in the thread.
    const toastId = showToast({
      type: "loading",
      message: t("toast.publishing"),
      duration: 0,
    });
    try {
      const newReply = await createReply({ parentId: parentId || thread?.id, text });
      // WAIT for the media confirmation BEFORE completing — same single
      // sequence as the main thread. The files were already uploaded; confirm
      // creates the relation and returns the media, which we attach to the
      // just-inserted reply so its images are ready when we flip to "posted".
      if (newReply?.uid && confirmMedia) {
        const mediaItems = await confirmMedia(newReply.uid);
        attachMediaToReply(newReply.uid, mediaItems);
      }
      setReplyingTo(null);
      // The new reply triggers scroll-to + highlight (see effect below).
      if (newReply?.id) setHighlightedReplyId(newReply.id);
      // Morph the SAME toast into the confirmation: white check + "Reply posted",
      // no link. Auto-dismisses (~3s). Now AFTER the media confirmation.
      showToast.update(toastId, {
        type: "success",
        message: t("toast.replyPosted"),
        duration: 3000,
      });
      return newReply;
    } catch (err) {
      // Never leave the spinner hanging; re-throw so PostCommentBox keeps the
      // text and its inline error banner (createReplyError) shows.
      showToast.dismiss(toastId);
      throw err;
    }
  };

  // After creating a reply: smooth scroll to it (already in the DOM) and clear
  // the highlight after 3s (the CSS animation fades it on its own). rAF ensures
  // the new node is committed before the scroll; cleanup avoids leaks/jumps.
  useEffect(() => {
    if (!highlightedReplyId) return undefined;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-reply-id="${highlightedReplyId}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = setTimeout(() => setHighlightedReplyId(null), 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [highlightedReplyId]);

  // Guard: without an id there is no thread to show — go to /home immediately,
  // during RENDER (no flash and no fetch: useThread without an id doesn't fetch)
  // and with replace (the invalid URL doesn't stay in the history). After the
  // hooks (rule).
  if (!id) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.appBar}>
        <div className={styles.appBarInner}>
          {/* Back button. Desktop = Threads' exact floating circle (24px
              elevated, hairline + soft shadow, their 12×12 arrow); mobile =
              Threads' exact mobile-header Back (23×23 glyph, stroke 2, their
              line/polyline coords verbatim, in a 52px circular target with
              their press scale — see .backButton). */}
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label={t("common.back")}
          >
            {isMobile ? (
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="2.909" y1="12.004" x2="22.001" y2="12.004" />
                <polyline points="9.276 4.726 2.001 12.004 9.276 19.274" />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 6h10M1 6l4-4M1 6l4 4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </button>
          {isMobile ? (
            /* Mobile: Threads' thread header carries the centered BRAND, not
               a title — the same 32px logo slot/press as the NavRail app bar,
               a button home. */
            <button
              type="button"
              className={styles.appBarBrand}
              onClick={() => navigate("/home")}
              aria-label={t("nav.home")}
            >
              <BrandLogo size={32} variant="plain" fit="glyph" />
            </button>
          ) : (
            <div className={styles.titleBlock}>
              {post ? (
                <>
                  <span className={styles.title}>{t("post.threadTitle")}</span>
                  {repliesLabel && (
                    <span className={styles.subtitle}>{repliesLabel}</span>
                  )}
                </>
              ) : isLoading ? (
                // While loading, BOTH lines are skeletons — reserving the
                // subtitle row so the real "N replies" doesn't pop in and
                // shift the title block (no jump).
                <>
                  <span
                    className={cx(styles.titleSkeleton, styles.skeletonBar)}
                    aria-hidden="true"
                  />
                  <span
                    className={cx(styles.subtitleSkeleton, styles.skeletonBar)}
                    aria-hidden="true"
                  />
                </>
              ) : (
                // Error / not-found: static title, no skeleton (it would
                // never resolve), no subtitle.
                <span className={styles.title}>{t("post.threadTitle")}</span>
              )}
            </div>
          )}
          {/* The thread options live on the parent thread's header row
              (Threads' anatomy) at EVERY breakpoint — an empty span balances
              the grid's right column so the title stays truly centered. */}
          <span aria-hidden="true" />
        </div>
      </header>

      <main className={styles.main}>
      {/* Threads-style sticky corner mask (desktop only, CSS-hidden on mobile):
          pins the surface card's rounded top edge just below the app bar while
          the content scrolls underneath. Two "inverted corner" caps (a clipped
          box whose huge box-shadow spread paints the page bg OUTSIDE the arc —
          Threads' exact trick) + a page-bg strip carrying the top border between
          them. At rest it paints pixel-identical to the card's own top, so it's
          invisible until you scroll. Only rendered alongside the surface. */}
      {(post || isLoading) && (
        <div className={styles.cornerMask} aria-hidden="true">
          <div className={styles.cornerMaskEdge} />
          <div className={cx(styles.cornerCap, styles.cornerCapLeft)}>
            <div className={styles.cornerCapBox} />
          </div>
          <div className={cx(styles.cornerCap, styles.cornerCapRight)}>
            <div className={styles.cornerCapBox} />
          </div>
        </div>
      )}
      {error && !post && error.status === 404 ? (
        <PostThreadNotFound threadId={id || post?.id} />
      ) : error && !post ? (
        <div className={styles.errorState} role="alert">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9b9591"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.7a3 3 0 0 0-2.5-4.7 5.5 5.5 0 0 0-10.6-1.5" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <p className={styles.errorText}>{t("post.couldNotLoad")}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={retry}
          >
            {t("common.tryAgain")}
          </button>
        </div>
      ) : !post ? (
        // Same elevated surface as the loaded thread, so the skeleton matches
        // the real layout exactly (full-bleed + 16px inset on mobile, card on
        // desktop) instead of floating bare on the page.
        <div className={styles.surface}>
          <PostInitialSkeleton />
        </div>
      ) : (
        <>
      {/* Elevated surface: lifts the thread off the page bg so it isn't flat. */}
      <div className={styles.surface}>
      {/* Ancestor chain (comment permalink): root → … → immediate parent,
          each row navigable to its own /p/:id, threadline-connected down to
          the focused head below. Nothing renders for a root thread. The
          wrapper is the CHAIN's own resize target: the surface's box is
          min-height-stretched (scroll room), so observing IT never fires
          when the chain grows — this box's height IS the chain's. */}
      {ancestors.length > 0 && (
        <div ref={ancestorChainRef}>
          {ancestors.map((ancestor, i) => (
            <PostAncestor
              key={ancestor.id}
              post={ancestor}
              isRoot={i === 0}
              onOpen={() => handleOpenAncestor(ancestor, i)}
              onHashtagClick={handleHashtagClick}
            />
          ))}
        </div>
      )}
      <section
        ref={opSectionRef}
        className={cx(
          styles.opSection,
          hasReplies ? styles.opSectionDivided : "",
          ancestors.length > 0 ? styles.opSectionChained : ""
        )}
      >
        <div className={styles.opHeader}>
          {/* One line (Threads-style), same pattern as replies: avatar + mask
              inside the profile trigger, then '·' + the short timestamp. */}
          <PostProfileTrigger mask={post.mask}>
            {/* 36px — Threads' avatar size everywhere (feed, OP and replies). */}
            <MaskAvatar seed={post.mask.id} size={36} online={post.mask.isOnline} />
            <span className={styles.opMaskId}>{post.mask.id}</span>
          </PostProfileTrigger>
          {/* Short relative time ('20h'); full date on hover via `title`. */}
          <span
            className={styles.opMetaLine}
            title={fullDateTitle(post.publishedAt, i18n.language)}
          >
            {post.time}
          </span>
          {/* Thread options on the parent thread's header row (Threads' new
              anatomy) — every breakpoint; the app bar carries no menu. Sorting
              is NOT here anymore: it lives in the replies bar below the OP. */}
          <span className={styles.opHeaderSpacer} />
          <PostOptionsMenu post={post} variant="inline" />
        </div>

        {/* The opened thread's head shows its FULL text — no "show more"
            clamp: you came here to read the whole thread. */}
        <p className={styles.opBody}>
          {renderTextWithHashtags(post.text, styles.hashtag, handleHashtagClick)}
        </p>

        {post.media && post.media.length > 0 && (
          <ThreadMedia items={post.media} />
        )}

        {/* Facebook-style stacked reaction summary (display-only) — the counts
            sit ABOVE the action bar, Threads/FB-style. Renders nothing when the
            thread has no reactions yet. */}
        <ReactionStack
          reactions={post.reactions}
          className={styles.opReactionSummary}
        />

        {/* Threads-style action bar: react (opens the picker) + reply. The 6-
            reaction system is unchanged — the picker still drives it. */}
        <div className={styles.opActions}>
          <PostReactionPicker
            variant="action"
            contextId={post.id}
            currentReactionEmoji={post.currentUserReaction}
            onSelect={(reaction) => toggleReaction(post.id, reaction)}
          />
          <button
            type="button"
            className={styles.actionActive}
            onClick={() =>
              handleReplyClick({
                maskId: post.mask.id,
                // Full mask (incl. fullHash) so the expand dialog's profile
                // hover card can fetch the real stats.
                mask: post.mask,
                type: "op",
                sourceId: post.id,
                text: post.text,
                media: post.media,
              })
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {t("post.reply")}
          </button>
        </div>
      </section>

      {/* Threads' bar between the OP and the replies: sort (Top / Recent) +
          the "View activity" placeholder. Doubles as the scroll anchor after
          a sort change. Only rendered when there is something to sort. */}
      {hasReplies ? (
        <div ref={repliesSectionRef}>
          <PostRepliesBar
            sortValue={sortBy}
            onSortChange={selectSort}
            isLoading={isReloadingReplies}
          />
        </div>
      ) : (
        <div className={styles.noRepliesGap} aria-hidden="true" />
      )}

      <section
        className={cx(styles.repliesList, isReloadingReplies ? styles.repliesListReloading : "")}
      >
        {(() => {
          // === Reddit-style nested threading metadata ===
          // The list is in DFS order (each comment followed by its subtree) with
          // a real parentId at ANY depth. We derive, per reply:
          //  • depth        → indentation level (0 = top-level)
          //  • guides[L]    → for each ancestor lane L, whether its thread line
          //                   CONTINUES past this reply (i.e. that ancestor has a
          //                   later sibling) → a vertical guide line is drawn.
          //  • hasChildren  → draw the line descending into its own children.
          //  • dividerBelow → separator only BETWEEN top-level trees (next is
          //                   depth 0); never inside a tree (lines join them).
          const byId = new Map(displayReplies.map((r) => [r.id, r]));
          const depthOf = new Map();
          const lastChildOf = new Map(); // parentId → id of its LAST child (DFS)
          const parents = new Set();
          displayReplies.forEach((r) => {
            depthOf.set(
              r.id,
              r.parentId != null && depthOf.has(r.parentId)
                ? depthOf.get(r.parentId) + 1
                : 0
            );
            if (r.parentId != null) {
              lastChildOf.set(r.parentId, r.id);
              parents.add(r.parentId);
            }
          });

          return displayReplies.map((reply, index) => {
            const next = displayReplies[index + 1];
            const depth = depthOf.get(reply.id) || 0;
            // Walk ancestors to fill the path by depth, then a lane continues if
            // the node one level deeper on the path is NOT its parent's last child.
            const path = [];
            for (let cur = reply; cur; cur = cur.parentId != null ? byId.get(cur.parentId) : null) {
              path[depthOf.get(cur.id)] = cur;
            }
            const guides = [];
            for (let L = 0; L < depth; L++) {
              const node = path[L + 1];
              guides[L] = node ? lastChildOf.get(node.parentId) !== node.id : false;
            }
            const hasChildren = parents.has(reply.id);
            const dividerBelow = Boolean(next) && (depthOf.get(next.id) || 0) === 0;
            return (
              <PostReply
                key={reply.id}
                {...reply}
                depth={depth}
                guides={guides}
                hasChildren={hasChildren}
                dividerBelow={dividerBelow}
                // No border on the last reply when fully loaded → connects cleanly
                // with PostEndDivider.
                isLast={index === displayReplies.length - 1 && !hasMore}
                isHighlighted={reply.id === highlightedReplyId}
                onHashtagClick={handleHashtagClick}
                onReaction={(reaction) => toggleReaction(reply.id, reaction)}
                onReplyClick={() =>
                  handleReplyClick({
                    maskId: reply.mask.id,
                    mask: reply.mask,
                    type: "reply",
                    sourceId: reply.id,
                    text: reply.text,
                    media: reply.media,
                  })
                }
              />
            );
          });
        })()}
        {/* Seeded navigation (OP painted from the feed card, replies still
            fetching): skeleton ONLY the replies — as many as the thread has,
            capped at 3, so a 1-reply thread doesn't flash 3 ghosts. */}
        {isLoading && displayReplies.length === 0 && hasReplies && (
          <>
            {["medium", "short", "long"]
              .slice(0, Math.max(1, Math.min(replyCount, 3)))
              .map((v) => (
                <PostReplySkeleton key={v} variant={v} />
              ))}
          </>
        )}
        {isLoadingMore && (
          <>
            <PostReplySkeleton variant="medium" />
            <PostReplySkeleton variant="short" />
            <PostReplySkeleton variant="long" />
          </>
        )}
      </section>

      {/* Invisible pagination sentinel (replaces the old "Load more replies"
          button): kept mounted through pagination (the hook's isLoading gate
          guards re-fires) so consecutive pages chain seamlessly; unmounted on
          failure — the retry banner below is the only affordance then. */}
      {hasMore && !isLoading && !loadMoreError && (
        <div
          ref={repliesSentinelRef}
          className={styles.sentinel}
          aria-hidden="true"
        />
      )}
      {loadMoreError && (
        <HomeFeedRetryBanner
          error={loadMoreError}
          onRetry={loadMore}
          isRetrying={isLoadingMore}
        />
      )}

      {/* Composer lives INSIDE the elevated card (Threads-style), separated from
          the replies by its own top divider. .composerDock pins it to the
          card's BOTTOM edge on short threads (the surface is min-height full
          viewport — without the pin the composer floats mid-card over dead
          space). */}
      <div ref={commentBoxRef} className={styles.composerDock}>
        <PostCommentBox
          thread={post}
          currentUserMask={currentUserMask}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          onSubmit={handleSubmitReply}
          isSubmitting={isCreatingReply}
          submitError={createReplyError}
        />
      </div>
      </div>
        </>
      )}
      </main>
    </div>
  );
}

export default Post;
