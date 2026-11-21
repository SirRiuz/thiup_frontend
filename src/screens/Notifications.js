import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import usePageTitle from "../hooks/usePageTitle";
import useMobileSurfacePage from "../hooks/useMobileSurfacePage";
import { useIsMobile } from "../hooks/useIsMobile";
import { useNotifications } from "../contexts/NotificationsContext";
import { dismissNotification } from "../api/notificationApi";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import MaskAvatar from "../components/MaskAvatar";
import PostProfileTrigger from "../components/post/PostProfileTrigger";
import ReactionEmoji from "../components/post/ReactionEmoji";
import styles from "../styles/screens/Notifications.module.css";

// verb + whether the deep-link TARGET is itself a reply (vs a root post) →
// the i18n key. `profile_view` has no thread at all (see
// Notification.thread in the backend) so it skips the Post/Reply split
// entirely; every other verb reuses the same "post vs comment" wording
// split derived from `is_reply`, not a separate verb per case.
const VERB_KEY_BASE = {
  reaction: "reaction",
  reply: "reply",
  qr_generate: "qrGenerate",
  download: "download",
  share: "share",
  link_copy: "linkCopy",
};

function messageKey(verb, isReply) {
  if (verb === "profile_view") return "profileView";
  return `${VERB_KEY_BASE[verb]}${isReply ? "OnReply" : "OnPost"}`;
}

// Same X glyph PostQrModal/PostShareModal already use for their close
// buttons — reused verbatim, not a new icon.
function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// PostProfileTrigger's expected shape (see components/post/PostProfileTrigger.js
// and PostProfileHoverCard, which fetches the live profile itself from
// `fullHash` on hover — id/isOnline are only the pre-fetch fallback).
function toTriggerMask(actor) {
  const hash = actor?.hash || "";
  return { id: hash.slice(0, 6), fullHash: hash, isOnline: actor?.is_online };
}

function NotificationRow({ item, t, navigate, onDismiss, isNew, staggerIndex }) {
  const actors = item.actors || [];
  const primaryActorMask = actors[0] ? toTriggerMask(actors[0]) : null;
  const others = Math.max((item.actor_count || 1) - 1, 0);
  // `profile_view` carries no thread (Notification.thread is null for that
  // one verb — its target IS the actor, see app/models/notification.py) —
  // route to the viewer's own profile instead of a thread permalink.
  const isProfileView = item.verb === "profile_view";
  const target = isProfileView ? `/m/${primaryActorMask?.id || ""}` : `/p/${item.thread.uid}`;

  // Row-wide click target, except the dismiss button. Deliberately does
  // NOT check for [role='link'] here (HomeFeedCard's guard does, but its
  // clickable "navZone" is a DIFFERENT element from the outer card that
  // owns the catch-all — here .rowBody is BOTH the thing with role="link"
  // AND the element this exact handler is attached to, so that check
  // self-matched .rowBody on every click and silently ate all of them).
  // Nested PostProfileTrigger clicks (avatars, the highlighted actor name)
  // never reach this handler anyway — PostProfileTrigger already calls
  // e.stopPropagation() on its own click, so no extra guard is needed for
  // those; only the real <button> (the dismiss X) needs excluding.
  //
  // stopPropagation is REQUIRED here, not defensive: this same handler is
  // attached to BOTH .rowBody (inner) and .row (outer) — a click inside
  // .rowBody bubbles from the inner handler up to the outer one, firing
  // navigate() TWICE for one click without this, which pushed two
  // identical history entries (back needed two presses to actually leave).
  const handleRowClick = (e) => {
    if (e.target.closest("button")) return;
    e.stopPropagation();
    navigate(target);
  };
  const handleRowKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(target);
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismiss();
  };

  return (
    <div
      className={isNew ? `${styles.row} ${styles.rowNew}` : styles.row}
      style={isNew ? { animationDelay: `${Math.min(staggerIndex, 8) * 60}ms` } : undefined}
      onClick={handleRowClick}
    >
      <button
        type="button"
        className={styles.closeButton}
        onClick={handleDismiss}
        aria-label={t("notifications.dismiss")}
      >
        <CloseIcon />
      </button>
      {isNew && <span className={styles.unreadDot} aria-hidden="true" />}
      <span className={styles.avatars}>
        {actors.slice(0, 3).map((actor, i) => (
          <span key={actor.hash} className={styles.avatarWrap} style={{ zIndex: 3 - i }}>
            <PostProfileTrigger mask={toTriggerMask(actor)} variant="avatar">
              <MaskAvatar seed={actor.hash} size={24} online={actor.is_online} />
            </PostProfileTrigger>
          </span>
        ))}
      </span>
      <div
        className={styles.rowBody}
        role="link"
        tabIndex={0}
        aria-label={t(isProfileView ? "notifications.openProfile" : "home.openThread")}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
      >
        <span className={styles.rowText}>
          {item.reaction && (
            <span className={styles.rowReactionIcon}>
              <ReactionEmoji name={item.reaction.name} emoji={item.reaction.emoji} size={16} />
            </span>
          )}
          <Trans
            i18nKey={`notifications.${messageKey(item.verb, item.thread?.is_reply)}`}
            count={item.actor_count || 1}
            values={{ actor: primaryActorMask ? `@${primaryActorMask.id}` : "", others }}
            components={{
              actor: primaryActorMask ? (
                <PostProfileTrigger
                  mask={primaryActorMask}
                  variant="hash"
                  className={styles.actorName}
                />
              ) : (
                <span />
              ),
            }}
          />
        </span>
        {item.thread?.text && (
          <span className={styles.rowSnippet}>{item.thread.text}</span>
        )}
        <span className={styles.rowMeta}>{item.create_at}</span>
      </div>
    </div>
  );
}

// Rows aren't individually addressable server-side (no id survives
// grouping) — this composite key is what both React's list key AND the
// FE-only dismiss preview use to identify a row.
function rowKey(item, i) {
  // `profile_view` has no thread — verb + index alone is still unique
  // within one rendered page.
  return `${item.thread?.uid || "profile"}-${item.verb}-${i}`;
}

function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const isMobile = useIsMobile();
  usePageTitle("pageTitle.notifications", { noindex: true });
  useMobileSurfacePage(pageRef);
  const {
    notifications,
    hasMore,
    isLoading,
    loadFirstPage,
    loadMore,
    markAllRead,
  } = useNotifications();

  // Dismiss ("X"): optimistic — hides the row immediately, fires the real
  // DELETE-by-(thread_uid, verb) call, and rolls back (un-hides) on
  // failure so a lost request doesn't leave a still-existing notification
  // silently missing until the next full reload.
  const [dismissedKeys, setDismissedKeys] = useState(() => new Set());
  const visibleNotifications = notifications.filter(
    (item, i) => !dismissedKeys.has(rowKey(item, i))
  );

  // Which rows were unread AT LOAD TIME — a STABLE snapshot, deliberately
  // NOT the live `item.is_read` field. markAllRead's POST races the GET
  // above server-side (both fire close together): if the POST lands first,
  // the GET can come back with everything already is_read=true, and the
  // unread dot/entrance animation would never show at all. Worse, even when
  // sequenced correctly, flipping every row's `is_read` right after the
  // list renders made the dot flash and immediately vanish. Snapshotting
  // "was this new when I opened the tray" once, before markAllRead ever
  // runs, gives a stable answer for the whole visit regardless of when the
  // backend actually processes the read-flip.
  const [newKeys, setNewKeys] = useState(() => new Set());

  useEffect(() => {
    // Sequenced on purpose: capture the real unread state from the GET
    // BEFORE firing mark-read, so the snapshot above is never racing the
    // POST that's about to flip everything server-side.
    loadFirstPage().then((results) => {
      const keys = new Set(
        (results || [])
          .map((item, i) => (item.is_read ? null : rowKey(item, i)))
          .filter(Boolean)
      );
      setNewKeys(keys);
      markAllRead();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  return (
    <div className={styles.page} ref={pageRef}>
      {/* Threads' masthead: 60px solid bar, centered "Notifications" title —
          same anatomy as SearchNew, desktop-only (mobile falls back to the
          shared NavRail app bar). */}
      <header className={styles.appBar}>
        <div className={styles.appBarInner}>
          <h1 className={styles.mastheadTitle}>{t("notifications.title")}</h1>
        </div>
      </header>
      {/* Sticky corner mask (desktop): pins the surface card's rounded top
          under the masthead — same anatomy as home/search/thread. */}
      {!isMobile && (
        <div className={styles.cornerMask} aria-hidden="true">
          <div className={styles.cornerMaskWindow}>
            <div className={styles.cornerMaskShape} />
          </div>
        </div>
      )}
      <div className={styles.main}>
        <div className={styles.surface}>
          {visibleNotifications.length === 0 && !isLoading ? (
            <div className={styles.empty}>
              {/* The EXACT same heart glyph as the nav item that leads here
                  (NavRail.js's barIconIdle) — a generic heart outline read as
                  a mismatch with what you just tapped; this one visually
                  confirms "you're in the right, empty, place". */}
              <span className={styles.iconWrap} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 2C14.8335 2 13.2217 2.70703 12 3.93652C10.7783 2.70704 9.1665 2 7.5 2C3.3785 2 0.5 5.08423 0.5 9.5C0.5 14.1284 4.84516 19.4619 11.311 22.7719C11.5267 22.8827 11.7633 22.9379 12 22.9379C12.2367 22.9379 12.4733 22.8827 12.689 22.7719C19.1548 19.4619 23.5 14.1284 23.5 9.5C23.5 5.08423 20.6217 2 16.5 2ZM12 20.8764C6.30767 17.8962 2.5 13.3467 2.5 9.5C2.5 6.15893 4.4625 4 7.5 4C9.5 4 11.25 5.75 12 7.5C12.75 5.75 14.5 4 16.5 4C19.5377 4 21.5 6.15893 21.5 9.5C21.5 13.3467 17.6923 17.8962 12 20.8764Z" />
                </svg>
              </span>
              <p className={styles.title}>{t("notifications.emptyTitle")}</p>
              <p className={styles.subtitle}>{t("notifications.emptyBody")}</p>
            </div>
          ) : (
            <div className={styles.list}>
              {notifications.map((item, i) => {
                const key = rowKey(item, i);
                if (dismissedKeys.has(key)) return null;
                return (
                  <NotificationRow
                    key={key}
                    item={item}
                    t={t}
                    navigate={navigate}
                    onDismiss={() => {
                      setDismissedKeys((prev) => new Set(prev).add(key));
                      dismissNotification({
                        threadUid: item.thread?.uid || null,
                        verb: item.verb,
                      }).catch(() => {
                        setDismissedKeys((prev) => {
                          const next = new Set(prev);
                          next.delete(key);
                          return next;
                        });
                      });
                    }}
                    isNew={newKeys.has(key)}
                    staggerIndex={i}
                  />
                );
              })}
              {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
