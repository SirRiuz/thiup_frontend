import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import MaskAvatar from "../MaskAvatar";
import PostReplyContext from "./PostReplyContext";
import PostAttachmentChip from "./PostAttachmentChip";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import { HASHTAG_RE } from "../../utils/hashtags";
import styles from "../../styles/components/post/PostCommentBox.module.css";

const MIN_HEIGHT = 24;
const MAX_HEIGHT = 140;
const MAX_FILES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOAD_TICK_MS = 100;
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
  const [attachments, setAttachments] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const fileInputRef = useRef(null);
  const intervalsRef = useRef(new Map());
  const boxRef = useRef(null);

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
  const isAnyUploading = attachments.some((a) => a.uploading);
  // Used by the attach button (temporarily hidden along with it):
  // const isAttachDisabled = attachments.length >= MAX_FILES;
  const isSubmittable =
    text.trim().length > 0 && !isAnyUploading && !isSubmitting;

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

  // Cleanup on unmount
  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      intervals.forEach(clearInterval);
      intervals.clear();
    };
  }, []);

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
    if (isSubmitting) return;
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

  const startUpload = (id) => {
    const interval = setInterval(() => {
      setAttachments((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const increment = Math.random() * 8 + 4;
          const newProgress = a.progress + increment;
          if (newProgress >= 100) {
            const intv = intervalsRef.current.get(id);
            if (intv) {
              clearInterval(intv);
              intervalsRef.current.delete(id);
            }
            return { ...a, progress: 100, uploading: false };
          }
          return { ...a, progress: newProgress };
        })
      );
    }, UPLOAD_TICK_MS);
    intervalsRef.current.set(id, interval);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const availableSlots = MAX_FILES - attachments.length;
    const accepted = [];
    let firstError = null;
    for (const file of files.slice(0, availableSlots)) {
      if (file.size > MAX_FILE_SIZE) {
        if (!firstError)
          firstError = t("post.fileTooLarge", { name: file.name });
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        if (!firstError)
          firstError = t("post.fileUnsupported", { name: file.name });
        continue;
      }
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      accepted.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: isImage ? "image" : "video",
        progress: 0,
        uploading: true,
        thumbnail: isImage ? URL.createObjectURL(file) : null,
      });
    }
    if (files.length > availableSlots && !firstError) {
      firstError = t("post.maxFiles", { max: MAX_FILES });
    }
    if (firstError) setErrorMessage(firstError);
    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted]);
      accepted.forEach((a) => startUpload(a.id));
    }
    e.target.value = "";
  };

  const handleRemoveAttachment = (id) => {
    const intv = intervalsRef.current.get(id);
    if (intv) {
      clearInterval(intv);
      intervalsRef.current.delete(id);
    }
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed && removed.thumbnail) URL.revokeObjectURL(removed.thumbnail);
      return prev.filter((a) => a.id !== id);
    });
  };

  // Opens the file picker — temporarily hidden along with the attach button:
  // const handleAttachClick = () => {
  //   if (isAttachDisabled) return;
  //   if (fileInputRef.current) fileInputRef.current.click();
  // };

  const handleSubmit = async () => {
    if (!isSubmittable) return;
    // parentId: sub-comment on a reply (replyingTo.sourceId) or direct comment
    // on the thread (thread.id). The parent invokes createReply from useThread.
    const parentId = replyingTo?.sourceId || thread?.id;
    try {
      await onSubmit?.({ parentId, text });
      // We only clear on success — the text is preserved if the POST fails.
      attachments.forEach((a) => {
        if (a.thumbnail) URL.revokeObjectURL(a.thumbnail);
      });
      setText("");
      setAttachments([]);
      setErrorMessage(null);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      // The error banner is rendered by submitError (controlled by the
      // parent). We don't clear the textarea: the user can retry with the
      // same text.
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

      {attachments.length > 0 && (
        <div className={styles.attachmentsList}>
          {attachments.map((a) => (
            <PostAttachmentChip
              key={a.id}
              attachment={a}
              onRemove={() => handleRemoveAttachment(a.id)}
            />
          ))}
        </div>
      )}

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
          disabled={isSubmitting}
          style={isSubmitting ? { opacity: 0.6 } : undefined}
          rows={1}
        />
      </div>

      <input
        ref={fileInputRef}
        id="comment-file-input"
        name="comment-files"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileChange}
        className={styles.hiddenFileInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className={styles.toolbar}>
        {/* Image upload button temporarily hidden — the feature will be added
            later (the attachments logic remains intact):
        <button
          type="button"
          className={styles.attachButton}
          onClick={handleAttachClick}
          disabled={isAttachDisabled}
          aria-label="Attach image or video"
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
        </button> */}
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
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!isSubmittable}
        >
          {isSubmitting ? t("post.replying") : t("post.reply")}
        </button>
      </div>
    </div>
  );
}

export default PostCommentBox;
