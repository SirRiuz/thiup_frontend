import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostReplyContext from "./PostReplyContext";
import MediaScanList from "../media/MediaScanList";
import useMediaComposer from "../../hooks/useMediaComposer";
import { ACCEPT_ATTR } from "../../services/media/allowedFormats";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import { HASHTAG_RE } from "../../utils/hashtags";
import styles from "../../styles/components/post/PostCommentBox.module.css";

const MIN_HEIGHT = 24;
const MAX_HEIGHT = 140;
const MAX_CHARS = 500;

function PostCommentBox({
  thread,
  currentUserMask,
  replyingTo,
  onCancelReply,
  onSubmit,
  isSubmitting = false,
  submitError = null,
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  // True for the WHOLE submit (create + media confirmation), so the loading
  // state doesn't end before the confirmation finishes (matches the main thread).
  const [isFinalizing, setIsFinalizing] = useState(false);
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const fileInputRef = useRef(null);
  const boxRef = useRef(null);
  // Re-entrancy guard for the whole submit (create reply + media upload), so a
  // second click during the upload window can't post a duplicate reply.
  const busyRef = useRef(false);
  // Shared media flow (scan + compress + auto-upload + confirm). The reply box
  // and the thread composer use the same hook.
  const media = useMediaComposer();

  // Virtual keyboard (mobile): with the textarea focused, the `resize` event
  // of window.visualViewport detects the APPEARANCE of the keyboard (the
  // visible viewport shrinks) — at the real moment, on any device, without
  // delays or hardcoded keyboard heights. If the box ended up covered by the
  // keyboard (its bottom falls outside the REAL visible area: offsetTop +
  // height of the visualViewport), auto-scroll to leave it visible above.
  // The box is part of the flow (not fixed), so scrollIntoView is enough and
  // everything reverts on its own when the keyboard closes. Desktop: the
  // visualViewport doesn't shrink on focus → no-op.
  useEffect(() => {
    if (!isInputFocused) return undefined;

    // Breathing room between the bottom edge of the box and the keyboard:
    // the scroll is computed with an exact delta (not scrollIntoView, which
    // left it flush).
    const KEYBOARD_GAP = 24;

    // Scrolls just enough so the bottom of the box ends up KEYBOARD_GAP px
    // above the given visible limit.
    const liftAbove = (visibleBottom) => {
      const rect = boxRef.current?.getBoundingClientRect();
      if (!rect) return;
      const delta = rect.bottom - (visibleBottom - KEYBOARD_GAP);
      if (delta > 0) {
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
    };

    const viewport = window.visualViewport;

    if (!viewport) {
      // Fallback (browsers without visualViewport): same calculation with
      // window.innerHeight, with a small delay after the focus.
      const timer = setTimeout(() => liftAbove(window.innerHeight), 300);
      return () => clearTimeout(timer);
    }

    let lastHeight = viewport.height;
    const ensureVisible = () => {
      // Only when the viewport SHRINKS (keyboard opening/growing);
      // when it closes (grows) we don't force anything.
      const shrank = viewport.height < lastHeight - 1;
      lastHeight = viewport.height;
      if (!shrank) return;
      // Bottom edge of the actually visible area (discounting the keyboard).
      liftAbove(viewport.offsetTop + viewport.height);
    };

    viewport.addEventListener("resize", ensureVisible);
    return () => viewport.removeEventListener("resize", ensureVisible);
  }, [isInputFocused]);

  const charCount = text.length;
  const atLimit = charCount >= MAX_CHARS;

  // `submitting` spans the WHOLE submit (create + media confirmation), not just
  // the create request, so the spinner/disabled state stays until everything is
  // done — same as the main thread (the button doesn't re-enable mid-confirm).
  const submitting = isSubmitting || isFinalizing;

  // Submit is gated while media is still being analyzed / compressed / uploaded
  // (media.pending) so we never post a reply that references an incomplete upload.
  const isSubmittable =
    text.trim().length > 0 && !media.pending && !submitting;

  // Counter of unique hashtags detected (case-insensitive)
  const tagsDetected = useMemo(() => {
    const matches = text.match(HASHTAG_RE) || [];
    return new Set(matches.map((m) => m.toLowerCase())).size;
  }, [text]);

  // Automatic focus when activating a new replyingTo
  useEffect(() => {
    if (!replyingTo) return;
    const timer = setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, [replyingTo]);

  // Autoresize of the textarea + sync of the overlay height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const scrollH = ta.scrollHeight;
    const newHeight = Math.min(Math.max(scrollH, MIN_HEIGHT), MAX_HEIGHT);
    ta.style.height = `${newHeight}px`;
    ta.style.overflowY = scrollH > MAX_HEIGHT ? "auto" : "hidden";
    if (overlayRef.current) {
      overlayRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  // Auto-dismiss of the error banner
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Sync of the overlay scroll with the textarea
  const handleScroll = (e) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Hard limit: truncate to MAX_CHARS on every change (covers typing + paste)
  const handleTextChange = (e) => {
    setText(e.target.value.slice(0, MAX_CHARS));
  };

  // Paste: normalizes the external text (CRLF→LF, nbsp, zero-width) before
  // inserting it at the cursor position. Rebuilds the value with React state
  // (without deprecated execCommand) and repositions the cursor after the
  // re-render.
  const handlePaste = (e) => {
    if (submitting) return;
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const clean = normalizePastedText(pasted);
    const el = textareaRef.current;
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    const next = (text.slice(0, start) + clean + text.slice(end)).slice(
      0,
      MAX_CHARS
    );
    setText(next);
    const caret = Math.min(start + clean.length, MAX_CHARS);
    requestAnimationFrame(() => {
      if (el) el.setSelectionRange(caret, caret);
    });
  };

  // Validate + start processing the picked files; show the first error (if any).
  const handleFileChange = (e) => {
    const { error } = media.addFiles(e.target.files);
    e.target.value = "";
    if (error) setErrorMessage(t(error.key, error.params));
  };

  const handleAttachClick = () => {
    if (media.attachDisabled) return;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleSubmit = async () => {
    if (busyRef.current) return;
    if (!isSubmittable) return;
    busyRef.current = true;
    setIsFinalizing(true);
    // parentId: sub-comment on a reply (replyingTo.sourceId) or direct comment
    // on the thread (thread.id). The parent invokes createReply from useThread.
    const parentId = replyingTo?.sourceId || thread?.id;
    try {
      // The parent (handleSubmitReply) creates the reply AND awaits the media
      // confirmation before completing — same single sequence as the main
      // thread. We hand it the confirm function (the media hook lives here); it
      // attaches the confirmed media before flipping to "posted". If confirm
      // fails, no media is attached (never a broken reply).
      await onSubmit?.({
        parentId,
        text,
        confirmMedia: (uid) => media.confirmTo(uid),
      });
      // We only clear on success — the text is preserved if the POST fails.
      setText("");
      media.clear();
      setErrorMessage(null);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      // The error banner is rendered by submitError (controlled by the
      // parent). We don't clear the textarea: the user can retry with the
      // same text.
    } finally {
      setIsFinalizing(false);
      busyRef.current = false;
    }
  };

  return (
    <div className={styles.wrapper} ref={boxRef}>
      <PostReplyContext target={replyingTo} onCancel={onCancelReply} />

      {currentUserMask && (
        <div className={styles.header}>
          <span className={styles.identiconWrap}>
            <MaskAvatar seed={currentUserMask.id} size={20} />
          </span>
          <span className={styles.label}>{t("compose.postingAs")}</span>
          <span className={styles.maskId}>{currentUserMask.id}</span>
        </div>
      )}

      {submitError && (
        <div className={styles.errorBanner} role="alert">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c53030"
            strokeWidth="1.5"
            className={styles.errorIcon}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className={styles.errorText}>{t("post.replyError")}</span>
        </div>
      )}

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c53030"
            strokeWidth="1.5"
            className={styles.errorIcon}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className={styles.errorText}>{errorMessage}</span>
          <button
            type="button"
            className={styles.errorClose}
            onClick={() => setErrorMessage(null)}
            aria-label={t("common.closeError")}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <MediaScanList media={media} />

      <div className={styles.textareaWrapper}>
        <div
          ref={overlayRef}
          className={styles.highlightLayer}
          aria-hidden="true"
        >
          {renderTextWithHashtags(text, styles.highlightHashtag)}
          {text === "" && <span>&#8203;</span>}
        </div>
        <textarea
          ref={textareaRef}
          id="comment-textarea"
          name="comment"
          className={styles.input}
          placeholder={
            replyingTo
              ? t("post.commentPlaceholderUser")
              : t("post.commentPlaceholderDefault")
          }
          value={text}
          onChange={handleTextChange}
          onPaste={handlePaste}
          onScroll={handleScroll}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          disabled={submitting}
          style={submitting ? { opacity: 0.6 } : undefined}
          rows={1}
        />
      </div>

      <input
        ref={fileInputRef}
        id="comment-file-input"
        name="comment-files"
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={handleFileChange}
        className={styles.hiddenFileInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.attachButton}
          onClick={handleAttachClick}
          disabled={media.attachDisabled}
          aria-label={t("post.attachMedia")}
          title={t("post.attachMedia")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </button>
        <span className={styles.spacer} />
        {tagsDetected > 0 && (
          <span className={styles.tagsDetected}>
            {t("common.tagsDetected", { count: tagsDetected })}
          </span>
        )}
        <span
          className={`${styles.charCount} ${
            atLimit ? styles.charCountAtLimit : ""
          }`}
        >
          {t("common.charCount", { count: charCount, max: MAX_CHARS })}
        </span>
        <button
          type="button"
          className={`${styles.submitButton} springPress`}
          onClick={handleSubmit}
          disabled={!isSubmittable}
          aria-busy={submitting || undefined}
          aria-label={submitting ? t("post.replying") : undefined}
        >
          {/* Label always renders "Reply" to keep the button's exact width;
              while submitting it's hidden (box kept) and a spinner is centered
              over it — no resize. */}
          <span className={submitting ? styles.submitLabelHidden : undefined}>
            {t("post.reply")}
          </span>
          {submitting && (
            <span className={styles.spinner} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export default PostCommentBox;
