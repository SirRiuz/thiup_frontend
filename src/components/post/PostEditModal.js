import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import { useToast } from "../../contexts/ToastContext";
import { ACCEPT_ATTR } from "../../services/media/allowedFormats";
import cx from "../../utils/cx";
import MediaScanList from "../media/MediaScanList";
import RateLimitNotice from "../RateLimitNotice";
import ErrorNotice from "../ErrorNotice";
import { isRateLimitError } from "../../utils/rateLimit";
import DiscardDialog from "../compose/DiscardDialog";
import PostOptionsPanel from "../compose/PostOptionsPanel";
import useMediaComposer from "../../hooks/useMediaComposer";
import useEditMediaComposer from "../../hooks/useEditMediaComposer";
import { useScrollLock } from "../../utils/scrollLock";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import { editPost } from "../../api/threadApi";
import { toggleSpoiler as toggleSpoilerApi } from "../../api/threadFileApi";
import { mapBackendPostToFrontend } from "../../api/mappers/postMapper";
import styles from "../../styles/components/post/PostEditModal.module.css";

const MIN_HEIGHT = 96;
// Threads' exact limit — same as ComposeModal/PostCommentBox, mirrored
// server-side by THREAD_TEXT_MAX_LENGTH.
const MAX_CHARS = 500;
const ERROR_AUTO_DISMISS_MS = 8000;

function getErrorMessage(err, t) {
  if (!err || !err.status) return t("errors.network");
  if (err.status === 400) {
    const payload = err.payload;
    if (Array.isArray(payload?.text) && payload.text[0]) return payload.text[0];
    if (payload?.detail) return payload.detail;
    if (Array.isArray(payload?.non_field_errors) && payload.non_field_errors[0])
      return payload.non_field_errors[0];
    return t("errors.badRequest");
  }
  if (err.status === 401) return t("errors.unauthorized");
  if (err.status === 403) return t("errors.forbidden");
  if (err.status === 429) return t("errors.rateLimit");
  if (err.status >= 500) return t("errors.server");
  return t("errors.generic");
}

// A minimal single-block DraftJS blob synthesized from the plain text — this
// feature only edits plain text (no rich-formatting change scoped here); the
// OP/reply body renders from `text` alone (renderTextWithHashtags), never
// from `content`, so this is purely to satisfy the backend's required field.
function buildDraftContent(text) {
  return {
    blocks: [
      {
        key: "editblk",
        text,
        type: "unstyled",
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {},
      },
    ],
    entityMap: {},
  };
}

/**
 * PostEditModal — the edit form for a post/reply the caller owns. A
 * dedicated component (not a mode-flag on ComposeModal/PostReplyExpandModal
 * — both carry creation-only baggage that doesn't apply here), but it reuses
 * their exact patterns: same modal chrome, same MAX_CHARS textarea + hashtag
 * overlay, same DiscardDialog-gated close, same loading→success toast
 * sequence and RateLimitNotice/ErrorNotice handling. Seeded from the post's
 * CURRENT text/media (not empty). Serves both the OP and replies — the
 * backend contract is identical either way.
 */
function PostEditModal({ post, onClose, onEdited, isReply = false }) {
  const { t } = useTranslation();
  const [text, setText] = useState(post.text || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Editable-anytime options — seeded from the post's CURRENT flags. Snap is
  // deliberately absent here (showSnap={false} below): it has no edit path
  // anywhere, server or client — it's immutable once set at creation.
  const [isPrivate, setIsPrivate] = useState(Boolean(post.isPrivate));
  const [repliesDisabled, setRepliesDisabled] = useState(Boolean(post.repliesDisabled));
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const errorTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const showToast = useToast();

  const mediaBase = useMediaComposer();
  const media = useEditMediaComposer(post.media, mediaBase);

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;
  const isDisabled = isSubmitting;
  const isSubmittable =
    text.trim().length > 0 && !overLimit && !isDisabled && !media.pending;
  const hasChanges =
    text.trim() !== (post.text || "").trim() ||
    media.hasPendingUploads ||
    media.hasRemovals ||
    media.hasSpoilerChanges ||
    isPrivate !== Boolean(post.isPrivate) ||
    repliesDisabled !== Boolean(post.repliesDisabled);
  const rateLimited = isRateLimitError(submitError?.error);

  const requestClose = () => {
    if (isSubmitting) return;
    if (hasChanges) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  const handleDiscard = () => {
    media.clear();
    setSubmitError(null);
    setConfirmingDiscard(false);
    onClose();
  };

  useScrollLock(true);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    if (!window.matchMedia("(max-width: 700px)").matches) {
      textareaRef.current?.focus();
    }
    return () => {
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        requestCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'
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
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.max(ta.scrollHeight, MIN_HEIGHT);
    ta.style.height = `${newHeight}px`;
    ta.style.overflowY = "hidden";
    if (overlayRef.current) overlayRef.current.style.height = `${newHeight}px`;
  }, [text]);

  useEffect(() => {
    if (!submitError || rateLimited) return undefined;
    errorTimerRef.current = setTimeout(() => setSubmitError(null), ERROR_AUTO_DISMISS_MS);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [submitError, rateLimited]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleScroll = (e) => {
    if (overlayRef.current) overlayRef.current.scrollTop = e.target.scrollTop;
  };

  const handleTextChange = (e) => {
    if (isDisabled) return;
    setText(e.target.value);
  };

  const handlePaste = (e) => {
    if (isDisabled) return;
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const clean = normalizePastedText(pasted);
    const el = textareaRef.current;
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    setText(text.slice(0, start) + clean + text.slice(end));
    const caret = start + clean.length;
    requestAnimationFrame(() => {
      if (el) el.setSelectionRange(caret, caret);
    });
  };

  const attachFiles = async (fileList) => {
    const { error } = await media.addFiles(fileList);
    if (error) {
      setSubmitError({
        title: t("post.attachErrorTitle"),
        message: t(error.key, error.params),
        timestamp: Date.now(),
      });
    }
  };

  const handleFileChange = async (e) => {
    const input = e.target;
    await attachFiles(input.files);
    input.value = "";
  };

  // Toggling spoiler on an ALREADY-published file is a DRAFT now — same
  // pattern as remove/restore: local only, folded into hasChanges, and only
  // sent (via the dedicated /thread-files/spoiler/ endpoint, one call per
  // changed file) when the form is actually saved. It used to fire live and
  // independently of Save, which meant a spoiler-only edit never enabled
  // the Save button.
  const handleToggleExistingSpoiler = (id, isSpoiler) => {
    media.setExistingItemSpoiler(id, isSpoiler);
  };

  const handleAttachClick = () => {
    if (isDisabled || media.attachDisabled) return;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleSubmit = async () => {
    if (!isSubmittable) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const toastId = showToast({ type: "loading", message: t("toast.editing"), duration: 0 });
    try {
      const confirmedNew = await media.confirmNewTo(post.uid);
      const spoilerChanges = media.spoilerChanges;
      // Fire the text/media edit and every changed file's spoiler flag
      // together — they're independent resources (Thread vs ThreadFile),
      // no reason to serialize them.
      const [updated] = await Promise.all([
        editPost({
          id: post.uid,
          text,
          content: buildDraftContent(text),
          removeMedia: media.removedExistingIds,
          addMedia: confirmedNew.map((m) => m.id),
          isPrivate,
          repliesDisabled,
        }),
        ...spoilerChanges.map(({ id, isSpoiler }) => toggleSpoilerApi({ uid: id, isSpoiler })),
      ]);
      const mapped = mapBackendPostToFrontend(updated);
      // editPost's own response can race the parallel spoiler calls above —
      // never trust it to already reflect them. Overlay the LOCALLY known
      // values instead, so the caller sees the change instantly and
      // correctly the moment the modal closes (optimistic, no extra fetch).
      if (spoilerChanges.length > 0 && mapped.media) {
        const spoilerById = new Map(spoilerChanges.map(({ id, isSpoiler }) => [id, isSpoiler]));
        mapped.media = mapped.media.map((m) =>
          spoilerById.has(m.id) ? { ...m, isSpoiler: spoilerById.get(m.id) } : m
        );
      }
      onEdited?.(mapped);
      media.clear();
      onClose();
      showToast.update(toastId, { type: "success", message: t("toast.edited"), duration: 3000 });
    } catch (err) {
      showToast.dismiss(toastId);
      if (err?.status === 404) {
        setSubmitError({
          title: t("post.editErrorGone"),
          message: t("post.editErrorGoneDetail"),
          timestamp: Date.now(),
          error: err,
        });
      } else {
        setSubmitError({
          title: t("post.editErrorTitle"),
          message: getErrorMessage(err, t),
          timestamp: Date.now(),
          error: err,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissError = () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setSubmitError(null);
  };

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) requestClose();
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-edit-modal-title"
      >
        <header className={styles.header}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={requestClose}
            disabled={isSubmitting}
          >
            {t("compose.cancel")}
          </button>
          <h2 id="post-edit-modal-title" className={styles.title}>
            {t("post.editTitle")}
          </h2>
          <span className={styles.headerSpacer} aria-hidden="true" />
        </header>

        <div className={styles.body} ref={bodyRef}>
          <div className={styles.identityRow}>
            <span className={styles.avatarSlot} aria-hidden="true">
              {post.mask ? (
                <MaskAvatar seed={post.mask.id} size={36} />
              ) : (
                <span className={styles.avatarGhost} />
              )}
            </span>
            <div className={styles.contentCol}>
              <div className={styles.identityLine}>
                <span className={styles.maskId}>{post.mask?.id}</span>
              </div>
              <div className={styles.textareaWrapper}>
                <div ref={overlayRef} className={styles.highlightLayer} aria-hidden="true">
                  {renderTextWithHashtags(text, styles.highlightHashtag)}
                  {text === "" && <span>&#8203;</span>}
                </div>
                <textarea
                  ref={textareaRef}
                  id="post-edit-textarea"
                  name="post-edit"
                  className={styles.input}
                  value={text}
                  onChange={handleTextChange}
                  onPaste={handlePaste}
                  onScroll={handleScroll}
                  disabled={isDisabled}
                  rows={3}
                />
              </div>

              <MediaScanList
                media={media}
                existingItems={media.existingItems}
                onRemoveExisting={media.removeExisting}
                onRestoreExisting={media.restoreExisting}
                onToggleExistingSpoiler={handleToggleExistingSpoiler}
              />
            </div>
          </div>

          {submitError && rateLimited && (
            <RateLimitNotice
              variant="edit"
              error={submitError.error}
              onDismiss={handleDismissError}
              onExpire={handleDismissError}
              className={styles.rateLimitNotice}
            />
          )}

          {submitError && !rateLimited && (
            <ErrorNotice
              className={styles.errorNotice}
              title={submitError.title}
              detail={submitError.message}
              onDismiss={handleDismissError}
            />
          )}
        </div>

        <input
          ref={fileInputRef}
          id="post-edit-file-input"
          name="post-edit-files"
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          onChange={handleFileChange}
          className={styles.hiddenFileInput}
          aria-hidden="true"
          tabIndex={-1}
        />

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.toolButton}
            onClick={handleAttachClick}
            disabled={isDisabled || media.attachDisabled}
            aria-label={t("post.attachMedia")}
            title={t("post.attachMedia")}
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
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span className={styles.toolLabel}>{t("compose.mediaLabel")}</span>
          </button>
          {/* Private has no effect below a root thread (feed/search only
              ever filter root threads), and this surface doesn't offer
              disable-replies-on-a-reply either — so the whole trigger is
              pointless on a reply's own edit form. */}
          {!isReply && (
            <>
              <button
                ref={optionsButtonRef}
                type="button"
                className={cx(
                  styles.toolButton,
                  isPrivate || repliesDisabled ? styles.toolButtonActive : ""
                )}
                onClick={() => setOptionsOpen((v) => !v)}
                disabled={isDisabled}
                aria-haspopup="menu"
                aria-expanded={optionsOpen}
                title={t("postOptions.title")}
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
                  aria-hidden="true"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className={styles.toolLabel}>{t("postOptions.title")}</span>
              </button>
              <PostOptionsPanel
                open={optionsOpen}
                onClose={() => setOptionsOpen(false)}
                anchorRef={optionsButtonRef}
                isPrivate={isPrivate}
                onIsPrivateChange={setIsPrivate}
                showSnap={false}
                repliesDisabled={repliesDisabled}
                onRepliesDisabledChange={setRepliesDisabled}
              />
            </>
          )}
          <span className={styles.footerSpacer} />
          {overLimit && <span className={styles.overLimit}>{remaining}</span>}
          <button
            type="button"
            className={cx(styles.postButton, "springPress")}
            onClick={handleSubmit}
            disabled={!isSubmittable || !hasChanges}
            aria-busy={isSubmitting || undefined}
            aria-label={isSubmitting ? t("compose.posting") : undefined}
          >
            <span className={isSubmitting ? styles.postLabelHidden : undefined}>
              {t("compose.editSubmit")}
            </span>
            {isSubmitting && <span className={styles.spinner} aria-hidden="true" />}
          </button>
        </footer>
      </div>

      {confirmingDiscard && (
        <DiscardDialog
          title={t("compose.discardEditTitle")}
          onDiscard={handleDiscard}
          onKeep={() => setConfirmingDiscard(false)}
        />
      )}
    </div>,
    document.body
  );
}

export default PostEditModal;
