import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../components/MaskAvatar";
import PostCommentBox from "../components/post/PostCommentBox";
import PostEndDivider from "../components/post/PostEndDivider";
import PostLoadMoreButton from "../components/post/PostLoadMoreButton";
import PostOptionsMenu from "../components/post/PostOptionsMenu";
import PostProfileTrigger from "../components/post/PostProfileTrigger";
import PostReactionPicker from "../components/post/PostReactionPicker";
import PostReactionPill from "../components/post/PostReactionPill";
import PostInitialSkeleton from "../components/post/PostInitialSkeleton";
import PostReply from "../components/post/PostReply";
import PostReplySkeleton from "../components/post/PostReplySkeleton";
import PostThreadNotFound from "../components/post/PostThreadNotFound";
import PostSortMenu from "../components/post/PostSortMenu";
import { useThread } from "../hooks/useThread";
import usePageTitle from "../hooks/usePageTitle";
import {
  addInteraction,
  extractTags,
  AFFINITY_WEIGHTS,
  DWELL_THRESHOLD_MS,
} from "../utils/affinity";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import { useScrollLock } from "../utils/scrollLock";
import { renderTextWithHashtags } from "../components/home/homeHelpers";
import styles from "../styles/screens/Post.module.css";

function Post() {
  const { t } = useTranslation();
  // Título GENÉRICO a propósito ("Hilo · Thiup"): el título de la pestaña
  // queda en el historial/favoritos y se ve por encima del hombro — JAMÁS
  // usar el contenido del hilo ni la máscara del autor aquí (app anónima).
  usePageTitle("pageTitle.thread", { noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
    isReloadingReplies,
    isCreatingReply,
    createReplyError,
    hasMore,
    error,
    sortBy,
    selectSort,
    createReply,
    loadMore,
    retry,
    toggleReaction,
  } = useThread(id);

  const [replyingTo, setReplyingTo] = useState(null);
  // Newly created reply: we scroll it into view and highlight it ~3s.
  const [highlightedReplyId, setHighlightedReplyId] = useState(null);
  const commentBoxRef = useRef(null);
  const repliesSectionRef = useRef(null);

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

  // Hashtag click → normal search for that hashtag (q=#tag), identical to /home.
  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

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
  const handleSubmitReply = async ({ parentId, text }) => {
    const newReply = await createReply({ parentId: parentId || thread?.id, text });
    setReplyingTo(null);
    // The new reply triggers scroll-to + highlight (see effect below).
    if (newReply?.id) setHighlightedReplyId(newReply.id);
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
    <div className={styles.page}>
      <header className={styles.appBar}>
        <div className={styles.appBarInner}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label={t("common.back")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className={styles.titleBlock}>
            <span className={styles.title}>{t("post.threadTitle")}</span>
            {repliesLabel && (
              <span className={styles.subtitle}>{repliesLabel}</span>
            )}
          </div>
          {/* Thread-level options (View details / Copy link / Report). */}
          {post && (
            <PostOptionsMenu
              post={post}
              variant="inline"
              className={styles.appBarMenu}
            />
          )}
        </div>
      </header>

      <main className={styles.main}>
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
        <PostInitialSkeleton />
      ) : (
        <>
      <section className={styles.opSection}>
        <div className={styles.opHeader}>
          <PostProfileTrigger mask={post.mask}>
            <MaskAvatar seed={post.mask.id} size={32} />
            <div className={styles.opMetaCol}>
              <span className={styles.opMaskId}>{post.mask.id}</span>
              <span className={styles.opMetaLine}>
                {t("post.postedAgo", { time: post.time })}
              </span>
            </div>
          </PostProfileTrigger>
        </div>

        <p className={styles.opBody}>
          {renderTextWithHashtags(post.text, styles.hashtag, handleHashtagClick)}
        </p>

        <div className={styles.opReactions}>
          {post.reactions.map((r) => (
            <PostReactionPill
              key={r.emoji}
              emoji={r.emoji}
              count={r.count}
              name={r.name}
              active={r.userReacted}
              variant="op"
              onClick={() =>
                toggleReaction(post.id, {
                  id: r.id || r.emoji,
                  emoji: r.emoji,
                  label: r.label || r.emoji,
                })
              }
            />
          ))}
          <PostReactionPicker
            contextId={post.id}
            currentReactionEmoji={post.currentUserReaction}
            onSelect={(reaction) => toggleReaction(post.id, reaction)}
          />
        </div>

        <div className={styles.opActions}>
          <button
            type="button"
            className={styles.actionActive}
            onClick={() =>
              handleReplyClick({
                maskId: post.mask.id,
                type: "op",
                sourceId: post.id,
              })
            }
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            {t("post.reply")}
          </button>
          <span className={styles.spacer} />
        </div>
      </section>

      {/* No replies: no separator, no sort, no message — just clean
          spacing between the main post and the comment box. */}
      {hasReplies ? (
        <>
          <div
            ref={repliesSectionRef}
            className={styles.repliesSeparator}
            role="separator"
          >
            <span className={styles.repliesSeparatorLine} />
            <span className={styles.repliesSeparatorLabel}>{t("post.replies")}</span>
            <span className={styles.repliesSeparatorLine} />
          </div>

          <PostSortMenu
            value={sortBy}
            onChange={selectSort}
            isLoading={isReloadingReplies}
          />
        </>
      ) : (
        <div className={styles.noRepliesGap} aria-hidden="true" />
      )}

      <section
        className={`${styles.repliesList} ${
          isReloadingReplies ? styles.repliesListReloading : ""
        }`}
      >
        {displayReplies.map((reply, index) => {
          // isLastInChain: the vertical threading line extends to
          // connect with the next sub-reply, EXCEPT on the last one in the
          // chain (when the next item is no longer a sub-reply, or there is none).
          const next = displayReplies[index + 1];
          const isLastInChain =
            Boolean(reply.parentId) && !(next && next.parentId);
          return (
          <PostReply
            key={reply.id}
            {...reply}
            // No border only on the last reply when there are no more pages:
            // so it connects cleanly with PostEndDivider. With 'load more' visible
            // (hasMore), the last visible one keeps its border.
            isLast={index === displayReplies.length - 1 && !hasMore}
            isLastInChain={isLastInChain}
            isHighlighted={reply.id === highlightedReplyId}
            onHashtagClick={handleHashtagClick}
            onReaction={(reaction) => toggleReaction(reply.id, reaction)}
            onReplyClick={() =>
              handleReplyClick({
                maskId: reply.mask.id,
                type: "reply",
                sourceId: reply.id,
              })
            }
          />
          );
        })}
        {isLoadingMore && (
          <>
            <PostReplySkeleton variant="medium" />
            <PostReplySkeleton variant="short" />
            <PostReplySkeleton variant="long" />
          </>
        )}
      </section>

      {hasMore && !isLoadingMore && <PostLoadMoreButton onClick={loadMore} />}

      {!hasMore && displayReplies.length > 0 && <PostEndDivider />}

      <div ref={commentBoxRef}>
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
        </>
      )}
      </main>
    </div>
  );
}

export default Post;
