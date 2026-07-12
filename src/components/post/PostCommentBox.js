import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostReplyContext from "./PostReplyContext";
import MediaScanList from "../media/MediaScanList";
import useMediaComposer from "../../hooks/useMediaComposer";
import { warmHumanPass } from "../../api/humanPass";
import { ACCEPT_ATTR } from "../../services/media/allowedFormats";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import { HASHTAG_RE } from "../../utils/hashtags";
import styles from "../../styles/components/post/PostCommentBox.module.css";
import cx from "../../utils/cx";

const MIN_HEIGHT = 24;
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

  // Pre-warm the captcha human pass while the user is on the thread screen:
  // replies AND reactions here go out without waiting for the PoW.
  useEffect(() => {
    warmHumanPass();
  }, []);

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

    // On mobile the composer is a FIXED bottom bar that already rides above the
    // keyboard via CSS (bottom: var(--kb-inset-bottom), set by useKeyboardOpen),
    // so this in-flow scroll would only fight it with a spurious jump — skip it.
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 700px)").matches
    ) {
      return undefined;
    }

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
  // Threads-style: typing past the limit is ALLOWED; a countdown then shows the
  // negative remaining (e.g. "-394") and submit is blocked until back under.
  const remaining = MAX_CHARS - charCount;
  const overLimit = remaining < 0;

  // `submitting` spans the WHOLE submit (create + media confirmation), not just
  // the create request, so the spinner/disabled state stays until everything is
  // done — same as the main thread (the button doesn't re-enable mid-confirm).
  const submitting = isSubmitting || isFinalizing;

  // Anything to post (text or attached media). Drives the attach↔Reply swap.
  const hasContent = text.trim().length > 0 || media.count > 0;

  // Submit is gated while media is still being analyzed / compressed / uploaded
  // (media.pending) and while over the char limit.
  const isSubmittable =
    hasContent && !overLimit && !media.pending && !submitting;

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
    // Threads-style: the field just GROWS with the content — never a scrollbar.
    const newHeight = Math.max(scrollH, MIN_HEIGHT);
    ta.style.height = `${newHeight}px`;
    ta.style.overflowY = "hidden";
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

  // Threads-style: typing past MAX_CHARS is allowed (the counter goes negative
  // and submit is blocked) — no hard truncation.
  const handleTextChange = (e) => {
    setText(e.target.value);
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
    const next = text.slice(0, start) + clean + text.slice(end);
    setText(next);
    const caret = start + clean.length;
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

      {/* Threads-style: just the mask avatar (no "posting as" text) to the left
          of the rounded field, which holds the input AND the toolbar (icons +
          Reply) inside its border. */}
      <div className={styles.composeRow}>
        {currentUserMask && (
          <span className={styles.avatar}>
            <MaskAvatar seed={currentUserMask.id} size={36} />
          </span>
        )}
        <div className={styles.field}>
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
        <div className={styles.toolbar}>
          <span className={styles.spacer} />
          {tagsDetected > 0 && (
            <span className={styles.tagsDetected}>
              {t("common.tagsDetected", { count: tagsDetected })}
            </span>
          )}
          {/* Threads-style: the counter only appears once the limit is exceeded,
              counting DOWN into the negative (e.g. "-394"). */}
          {overLimit && <span className={styles.overLimit}>{remaining}</span>}

          {/* Bottom-right slot: attach when empty, Reply once there's content
              (Threads-style swap in the same place). */}
          {hasContent ? (
            <button
              type="button"
              className={cx(styles.submitButton, "springPress")}
              onClick={handleSubmit}
              disabled={!isSubmittable}
              aria-busy={submitting || undefined}
              aria-label={submitting ? t("post.replying") : undefined}
            >
              {/* Label always renders "Reply" to keep the button's exact width;
                  while submitting it's hidden (box kept) and a spinner is
                  centered over it — no resize. */}
              <span className={submitting ? styles.submitLabelHidden : undefined}>
                {t("post.reply")}
              </span>
              {submitting && (
                <span className={styles.spinner} aria-hidden="true" />
              )}
            </button>
          ) : (
            <button
              type="button"
              className={styles.attachButton}
              onClick={handleAttachClick}
              disabled={media.attachDisabled}
              aria-label={t("post.attachMedia")}
              title={t("post.attachMedia")}
            >
              {/* Threads' exact "Attach media" glyph (their 20×20 filled
                  icon), lifted verbatim. */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7 5.5C7.82843 5.5 8.5 6.17157 8.5 7C8.5 7.82843 7.82843 8.5 7 8.5C6.17157 8.5 5.5 7.82843 5.5 7C5.5 6.17157 6.17157 5.5 7 5.5Z" />
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M15.5879 1C16.6914 1 17.5797 0.999039 18.2969 1.05762C19.0255 1.11715 19.6657 1.24331 20.2578 1.54492C21.1986 2.02428 21.964 2.78969 22.4434 3.73047C22.745 4.32266 22.8711 4.96271 22.9307 5.69141C22.9893 6.40857 22.9883 7.29681 22.9883 8.40039V15.5996C22.9883 16.7032 22.9893 17.5914 22.9307 18.3086C22.8711 19.0373 22.745 19.6773 22.4434 20.2695C21.964 21.2103 21.1986 21.9757 20.2578 22.4551C19.6657 22.7567 19.0255 22.8829 18.2969 22.9424C17.5797 23.001 16.6914 23 15.5879 23H8.38867C7.28516 23 6.39682 23.001 5.67969 22.9424C4.95105 22.8828 4.3109 22.7567 3.71875 22.4551C2.778 21.9757 2.01255 21.2103 1.5332 20.2695C1.23157 19.6774 1.10543 19.0373 1.0459 18.3086C0.987309 17.5914 0.988282 16.7032 0.988282 15.5996V8.40039C0.988282 7.29682 0.987309 6.40857 1.0459 5.69141C1.10543 4.96273 1.23157 4.32265 1.5332 3.73047C2.01255 2.7897 2.778 2.02429 3.71875 1.54492C4.3109 1.24329 4.95105 1.11716 5.67969 1.05762C6.39682 0.999029 7.28516 1 8.38867 1H15.5879ZM18.3535 11C15.3973 11 12.8711 12.8367 11.8457 15.4355C11.7266 15.7374 11.4676 15.9629 11.1523 16.04C10.8766 16.1073 10.5876 16.0534 10.3555 15.8965L10.2598 15.8232L10.085 15.6777C9.19483 14.9691 8.07361 14.5459 6.85156 14.5459C5.31955 14.546 3.94482 15.2076 2.99121 16.2637C2.99303 17.0572 2.99913 17.6566 3.03906 18.1455C3.0885 18.7506 3.18126 19.099 3.31543 19.3623C3.60298 19.9265 4.06181 20.3853 4.62598 20.6729C4.88931 20.807 5.2377 20.8998 5.84277 20.9492C6.45955 20.9996 7.25232 21 8.38867 21H15.5879C16.7242 21 17.517 20.9996 18.1338 20.9492C18.7389 20.8998 19.0872 20.807 19.3506 20.6729C19.9148 20.3853 20.3736 19.9265 20.6611 19.3623C20.7953 19.099 20.8881 18.7507 20.9375 18.1455C20.9879 17.5287 20.9883 16.736 20.9883 15.5996V11.5156C20.1756 11.1848 19.2876 11 18.3535 11ZM8.38867 3C7.25232 3 6.45955 3.00041 5.84277 3.05078C5.2377 3.10023 4.88931 3.19297 4.62598 3.32715C4.06181 3.61473 3.60298 4.07351 3.31543 4.6377C3.18126 4.90104 3.0885 5.24937 3.03906 5.85449C2.98869 6.47129 2.98828 7.26397 2.98828 8.40039V13.6689C4.10409 12.9582 5.42945 12.5459 6.85156 12.5459C8.19776 12.5459 9.45559 12.918 10.5313 13.5605C12.0767 10.8404 14.9962 9 18.3535 9C19.2696 9.00003 20.1545 9.13661 20.9883 9.3916V8.40039C20.9883 7.26396 20.9879 6.47129 20.9375 5.85449C20.8881 5.24933 20.7953 4.90105 20.6611 4.6377C20.3736 4.0735 19.9148 3.61471 19.3506 3.32715C19.0872 3.193 18.7389 3.10022 18.1338 3.05078C17.517 3.00042 16.7242 3 15.5879 3H8.38867Z"
                />
              </svg>
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default PostCommentBox;
