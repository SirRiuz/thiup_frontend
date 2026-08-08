import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import { useScrollLock } from "../../utils/scrollLock";
import { fullDateTitle } from "../../utils/formatDate";
import { getEditHistory, getEditHistoryPage } from "../../api/threadApi";
import { mapEditHistoryEntry } from "../../api/mappers/postMapper";
import ErrorNotice from "../ErrorNotice";
import cx from "../../utils/cx";
import styles from "../../styles/components/post/EditHistoryModal.module.css";

const PlusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const MinusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// Row → row threadline segment — see .rowConnector in the CSS module for
// the exact geometry (born 4px below this row's own avatar, reaching 4px
// short of the next one). Omitted after the last row.
function RowConnector() {
  return <div className={styles.rowConnector} aria-hidden="true" />;
}

// Body-line widths per variant — the SAME three shapes PostReplySkeleton
// already uses (short/medium/long), reused verbatim so a stack of skeleton
// rows reads as organic placeholders instead of three identical clones.
const SKELETON_VARIANTS = {
  short: [styles.skeletonLine100, styles.skeletonLine62],
  medium: [styles.skeletonLine100, styles.skeletonLine88, styles.skeletonLine62],
  long: [styles.skeletonLine94, styles.skeletonLine100, styles.skeletonLine48],
};

// Mirrors the row grid (avatar-gutter + content + threadline) with pulsing
// bars instead of real content — same skeleton language as
// PostReplySkeleton (same #ebe7dd bars, same pulse timing), so this reads
// as "one more thread row loading", not a bespoke placeholder.
function HistorySkeletonRow({ variant = "medium", isLast = false }) {
  return (
    <div className={styles.row} aria-hidden="true">
      <span className={styles.avatarCell}>
        <div className={cx(styles.skeletonBar, styles.skeletonAvatar)} />
      </span>
      <div className={styles.contentCell}>
        <div className={cx(styles.skeletonBar, styles.skeletonTime)} />
        {SKELETON_VARIANTS[variant].map((lineClass, i) => (
          <div key={i} className={cx(styles.skeletonBar, styles.skeletonLine, lineClass)} />
        ))}
      </div>
      {!isLast && <RowConnector />}
    </div>
  );
}

/**
 * EditHistoryModal — text-only revision history of a post/reply, PUBLIC to
 * every viewer (not owner-gated, not even gated on isEdited — a never-edited
 * post simply shows the empty state).
 *
 * Chrome mirrors PostEditModal/PostReplyExpandModal (Threads' own dialog
 * anatomy): "Cancel" lives INSIDE the header bar (left, grid-centered
 * title), same 18px radius, full-screen sheet on mobile — not a floating
 * close button over the backdrop.
 *
 * The body is a small THREAD (same avatar-gutter + threadline language as
 * PostReply/HomeFeedCard, single lane, no branching): each past revision,
 * newest first, connected by one continuous line through the avatars — just
 * the revisions themselves, no synthetic "current version" row.
 */
function EditHistoryModal({ post, onClose }) {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [state, setState] = useState({ status: "loading", entries: [], next: null });

  useScrollLock(true);

  useEffect(() => {
    let active = true;
    getEditHistory(post.uid)
      .then((res) => {
        if (!active) return;
        setState({
          status: "ready",
          entries: (res.results || []).map(mapEditHistoryEntry),
          next: res.next || null,
        });
      })
      .catch((err) => {
        if (active) setState({ status: "error", entries: [], next: null, error: err });
      });
    return () => {
      active = false;
    };
  }, [post.uid]);

  const loadMore = async () => {
    if (!state.next || state.status === "loadingMore") return;
    setState((s) => ({ ...s, status: "loadingMore" }));
    try {
      const res = await getEditHistoryPage(state.next);
      setState((s) => ({
        status: "ready",
        entries: [...s.entries, ...(res.results || []).map(mapEditHistoryEntry)],
        next: res.next || null,
      }));
    } catch (err) {
      setState((s) => ({ ...s, status: "ready" }));
    }
  };

  useEffect(() => {
    previousFocusRef.current = typeof document !== "undefined" ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const hasHistory = state.entries.length > 0;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      // EditedTag (the trigger) renders this modal as a PORTAL, but React's
      // synthetic events still bubble through the REACT tree, not the DOM
      // tree — a click anywhere in here would otherwise reach whatever
      // navigable row rendered EditedTag (feed card / reply / OP header) and
      // trigger its navigate-to-thread handler. Nothing in this modal should
      // ever act on the page behind it.
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-history-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            {t("compose.cancel")}
          </button>
          <h2 className={styles.title} id="edit-history-title">
            {t("editHistory.title")}
          </h2>
          <span className={styles.headerSpacer} aria-hidden="true" />
        </header>

        <div className={styles.body}>
          {state.status === "loading" && (
            <div className={styles.list}>
              <HistorySkeletonRow variant="medium" />
              <HistorySkeletonRow variant="short" />
              <HistorySkeletonRow variant="long" isLast />
            </div>
          )}

          {state.status === "error" && (
            <ErrorNotice
              title={t("editHistory.errorTitle")}
              detail={state.error?.message}
            />
          )}

          {state.status !== "loading" && state.status !== "error" && !hasHistory && (
            <p className={styles.status}>{t("editHistory.empty")}</p>
          )}

          {hasHistory && (
            <ul className={cx(styles.list, styles.listEnter)}>
              {state.entries.map((entry, index) => (
                <li key={entry.id} className={styles.row}>
                  <span className={styles.avatarCell}>
                    {post.mask && <MaskAvatar seed={post.mask.id} size={36} />}
                  </span>
                  <div className={styles.contentCell}>
                    <div className={styles.rowHead}>
                      <time
                        className={styles.rowTime}
                        title={fullDateTitle(entry.editedAt, i18n.language)}
                      >
                        {entry.editedAtShort}
                      </time>
                      {(entry.mediaAddedCount > 0 || entry.mediaRemovedCount > 0) && (
                        <span className={styles.mediaChips}>
                          {entry.mediaAddedCount > 0 && (
                            <span className={cx(styles.mediaChip, styles.mediaChipAdded)}>
                              <PlusIcon />
                              {t("editHistory.mediaAddedCount", {
                                count: entry.mediaAddedCount,
                              })}
                            </span>
                          )}
                          {entry.mediaRemovedCount > 0 && (
                            <span className={cx(styles.mediaChip, styles.mediaChipRemoved)}>
                              <MinusIcon />
                              {t("editHistory.mediaRemovedCount", {
                                count: entry.mediaRemovedCount,
                              })}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <p className={styles.rowText}>{entry.previousText}</p>
                  </div>
                  {index < state.entries.length - 1 && <RowConnector />}
                </li>
              ))}
            </ul>
          )}

          {state.next && (
            <button
              type="button"
              className={styles.loadMore}
              onClick={loadMore}
              disabled={state.status === "loadingMore"}
            >
              {t("editHistory.loadMore")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default EditHistoryModal;
