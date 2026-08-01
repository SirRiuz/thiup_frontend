import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DiscardDialog from "../compose/DiscardDialog";
import MaskAvatar from "../MaskAvatar";
import MediaScanList from "../media/MediaScanList";
import RateLimitNotice from "../RateLimitNotice";
import ErrorNotice from "../ErrorNotice";
import PostProfileTrigger from "./PostProfileTrigger";
import ThreadMedia from "../media/ThreadMedia";
import { useScrollLock } from "../../utils/scrollLock";
import { setAudioOwner } from "../../services/media/audioOwner";
import {
  setPlaybackScope,
  releasePlaybackScopeIf,
} from "../../services/media/playbackArbiter";
import PlaybackScopeContext from "../../contexts/PlaybackScopeContext";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import styles from "../../styles/components/post/PostReplyExpandModal.module.css";
import cx from "../../utils/cx";

/**
 * PostReplyExpandModal — Threads' exact "expand composer" reply dialog: the
 * inline reply box grows into a full dialog that shows WHAT you're replying
 * to (the parent thread or reply, with the threadline descending from its
 * avatar into your row) above your draft.
 *
 * Purely another VIEW of PostCommentBox's state: the draft text and media
 * live in the box (one source of truth), so expanding/collapsing never loses
 * anything and the inline box stays in sync. Same reason the box's notices —
 * a throttled reply (rateLimitError), a rejected file (mediaError) or a
 * failed submit (submitFailed) — are shown HERE while the dialog is open:
 * the box's own notice would be stranded behind the backdrop.
 */
// The dialog's playback scope (see playbackArbiter): while it's active only
// the dialog's own videos are eligible to play — the page's videos behind the
// backdrop pause reactively, and the parent preview can autoplay normally.
const REPLY_DIALOG_SCOPE = "__reply_dialog__";

function PostReplyExpandModal({
  open,
  onClose,
  onDiscard,
  thread,
  replyingTo,
  currentUserMask,
  text,
  onTextChange,
  media,
  rateLimitError,
  onRateLimitExpire,
  mediaError,
  onMediaErrorDismiss,
  submitFailed,
  onAttach,
  onSubmit,
  submitting,
  isSubmittable,
  remaining,
  overLimit,
  tagsDetected,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  // Threads' "Discard reply?" confirm: closing with a non-empty draft asks
  // first — Discard clears the box's draft, Cancel keeps editing.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useScrollLock(open);

  // Opening the dialog claims the PLAYBACK SCOPE and silences audio: the
  // parent preview here renders the SAME media items as the thread behind the
  // backdrop, and IntersectionObserver can't see occlusion, so both kept
  // playing — sounding double once unmuted. With the scope active only the
  // dialog's own videos are eligible: the page's pause reactively, and the
  // preview autoplays muted like any visible video (its sound pill claims
  // audio as usual). Closing releases the scope and the arbiter re-promotes
  // the most visible page video (it resumes muted).
  useEffect(() => {
    if (!open) return undefined;
    setAudioOwner(null);
    setPlaybackScope(REPLY_DIALOG_SCOPE);
    return () => releasePlaybackScopeIf(REPLY_DIALOG_SCOPE);
  }, [open]);

  const hasDraft = text.trim().length > 0 || media.count > 0;

  // Every close path (Cancel, backdrop, Escape) funnels here.
  const requestClose = () => {
    if (submitting) return;
    if (hasDraft) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };
  // Fresh closure for the document-level Escape listener.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  const handleDiscard = () => {
    setConfirmingDiscard(false);
    onDiscard();
  };

  // Hashtags in the parent preview navigate to their search (same handler
  // shape as the thread screen's); the navigation unmounts the thread view,
  // which closes this dialog with it.
  const handleHashtagClick = (tag) => {
    const clean = String(tag).replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(`#${clean}`)}`);
  };

  // The reply target: a specific reply (replyingTo) or the thread's OP. The
  // FULL mask object (incl. fullHash) feeds the profile hover card.
  const target = replyingTo
    ? {
        mask: replyingTo.mask || { id: replyingTo.maskId },
        text: replyingTo.text,
        time: null,
        media: replyingTo.media,
      }
    : {
        mask: thread?.mask,
        text: thread?.text,
        time: thread?.time,
        media: thread?.media,
      };

  // Focus the textarea on open (caret at the end) — DESKTOP only. On mobile
  // there is NO autofocus (Threads' behavior): the keyboard appears when the
  // user taps the field, never popped by the dialog. Focus restored on close.
  useEffect(() => {
    if (!open) return undefined;
    previouslyFocusedRef.current = document.activeElement;
    const ta = textareaRef.current;
    if (ta && !window.matchMedia("(max-width: 700px)").matches) {
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    }
    return () => {
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open]);

  // Keep YOUR reply row in view. With a tall parent (media) the body opens
  // with the row below its fold, and every notice (rejected file / failed
  // submit / rate limit) SHRINKS the scrollable body — the slot lives outside
  // it — so an unscrolled body clips the row and the notice reads as painted
  // over the preview (the reported overlap). Pin the body to its end on open
  // and whenever a notice lands; pre-paint so there is no visible jump.
  //
  // The ON-OPEN pin is DESKTOP-ONLY: it fixes the small centered dialog. The
  // mobile sheet opens at the TOP (Threads' reply sheet) — and its 100dvh
  // body varies with the browser chrome, so a blanket pin left it slightly
  // scrolled whenever the collapsed/expanded URL bar made content overflow by
  // a few px (an offset that tracked the PAGE's scroll position). Notices
  // still pin on both breakpoints: their slot steals body height anywhere.
  useLayoutEffect(() => {
    if (!open) return;
    const hasNotice = !!(rateLimitError || mediaError || submitFailed);
    if (!hasNotice && window.matchMedia("(max-width: 700px)").matches) return;
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [open, rateLimitError, mediaError, submitFailed]);

  // Follow a fresh attachment the same way: the media tiles land at the END
  // of your row — below the body's fold on small screens — so a successful
  // attach was invisible without a manual scroll and read as "nothing
  // happened". Pin only when the count GROWS (removing a tile must not yank
  // the scroll). The ref keeps syncing while the dialog is closed so
  // reopening never misreads an old count as a fresh attach.
  const prevMediaCountRef = useRef(media.count);
  useLayoutEffect(() => {
    const grew = open && media.count > prevMediaCountRef.current;
    prevMediaCountRef.current = media.count;
    if (!grew) return;
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [open, media.count]);

  // Escape closes (draft kept — it lives in the inline box) + Tab focus trap.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        requestCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'
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
  }, [open]);

  // Auto-size the textarea and keep the highlight overlay in sync.
  useEffect(() => {
    if (!open) return;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.max(ta.scrollHeight, 84);
    ta.style.height = `${newHeight}px`;
    if (overlayRef.current) {
      overlayRef.current.style.height = `${newHeight}px`;
    }
  }, [text, open]);

  const handleScroll = (e) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Paste with the app's normalization (CRLF→LF, nbsp, zero-width), keeping
  // the caret in place — same pattern as the inline box, on this textarea.
  const handlePaste = (e) => {
    if (submitting) return;
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const clean = normalizePastedText(pasted);
    const el = textareaRef.current;
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    onTextChange(text.slice(0, start) + clean + text.slice(end));
    const caret = start + clean.length;
    requestAnimationFrame(() => {
      if (el) el.setSelectionRange(caret, caret);
      // Pasting a long text: FOLLOW it to the end (Threads' behavior) — the
      // caret lands there, so the dialog scrolls down to keep it in view.
      // rAF runs after the autosize effect resized the textarea, so
      // scrollHeight is already the post-paste one.
      const body = bodyRef.current;
      if (body) body.scrollTop = body.scrollHeight;
    });
  };

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) requestClose();
  };

  if (!open) return null;

  return createPortal(
    // Videos inside the dialog register their playback candidacy under the
    // dialog's scope — the pair to the setPlaybackScope effect above.
    <PlaybackScopeContext.Provider value={REPLY_DIALOG_SCOPE}>
    <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reply-expand-title"
      >
        {/* === Header: Cancel · centered "Reply" · balance spacer === */}
        <header className={styles.header}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={requestClose}
            disabled={submitting}
          >
            {t("compose.cancel")}
          </button>
          <h2 id="reply-expand-title" className={styles.title}>
            {t("post.reply")}
          </h2>
          <span className={styles.headerSpacer} aria-hidden="true" />
        </header>

        <div className={styles.body} ref={bodyRef}>
          {/* === What you're replying to (Threads' parent preview): its row
              plus the threadline descending from its avatar into yours. === */}
          <div className={styles.previewRow}>
            <div className={styles.previewLane}>
              {/* The PARENT's mask gets the profile hover card (avatar AND
                  name, two triggers like PostReply) — your own row below
                  deliberately doesn't: you know who you are. */}
              {target.mask?.id && (
                <PostProfileTrigger mask={target.mask}>
                  <MaskAvatar
                    seed={target.mask.id}
                    size={36}
                    online={target.mask.isOnline}
                  />
                </PostProfileTrigger>
              )}
              <span className={styles.trunk} aria-hidden="true" />
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewHeader}>
                <PostProfileTrigger mask={target.mask}>
                  <span className={styles.previewMaskId}>
                    {target.mask?.id}
                  </span>
                </PostProfileTrigger>
                {target.time && (
                  <span className={styles.previewTime}>{target.time}</span>
                )}
              </div>
              <p className={styles.previewText}>
                {renderTextWithHashtags(
                  target.text,
                  styles.previewHashtag,
                  handleHashtagClick
                )}
              </p>
              {/* The parent's photos/videos, Threads-style: the REAL media
                  component (carousel, video, NSFW blur), no bleed inside the
                  dialog — it stays aligned with the preview text. */}
              {target.media && target.media.length > 0 && (
                <div className={styles.previewMedia}>
                  <ThreadMedia items={target.media} />
                </div>
              )}
            </div>
          </div>

          {/* === Your reply row (same lane, the line arrives here) === */}
          <div className={styles.selfRow}>
            <div className={styles.selfLane}>
              {currentUserMask && (
                <MaskAvatar seed={currentUserMask.id} size={36} />
              )}
            </div>
            <div className={styles.selfContent}>
              {currentUserMask && (
                <div className={styles.selfMaskId}>{currentUserMask.id}</div>
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
                  id="reply-expand-textarea"
                  name="reply-expand"
                  className={styles.input}
                  placeholder={t("post.commentPlaceholderUser")}
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  onPaste={handlePaste}
                  onScroll={handleScroll}
                  disabled={submitting}
                  rows={3}
                />
              </div>

              <MediaScanList media={media} />
            </div>
          </div>
        </div>

        {/* Throttled (429): the wait sits just above the toolbar, where the
            Reply button that triggered it is — outside the scrollable body so
            it can't be scrolled out of sight. */}
        {rateLimitError && (
          <div className={styles.noticeSlot}>
            <RateLimitNotice
              variant="reply"
              error={rateLimitError}
              onExpire={onRateLimitExpire}
            />
          </div>
        )}

        {/* Failed submit: the dialog stays open (the draft is preserved for a
            retry), so the box's notice shows here for the same reason. */}
        {submitFailed && (
          <div className={styles.noticeSlot}>
            <ErrorNotice
              title={t("post.replyErrorTitle")}
              detail={t("post.replyErrorDetail")}
            />
          </div>
        )}

        {/* Rejected file (too large / unsupported / too many): same slot. */}
        {mediaError && (
          <div className={styles.noticeSlot}>
            <ErrorNotice
              title={t("post.attachErrorTitle")}
              detail={mediaError}
              onDismiss={onMediaErrorDismiss}
            />
          </div>
        )}

        {/* === Footer: labeled Media option left, counters + Reply right === */}
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.toolButton}
            onClick={onAttach}
            disabled={submitting || media.attachDisabled}
            aria-label={t("post.attachMedia")}
            title={t("post.attachMedia")}
          >
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
            <span className={styles.toolLabel}>{t("compose.mediaLabel")}</span>
          </button>
          <span className={styles.footerSpacer} />
          {tagsDetected > 0 && (
            <span className={styles.tagsDetected}>
              {t("common.tagsDetected", { count: tagsDetected })}
            </span>
          )}
          {overLimit && <span className={styles.overLimit}>{remaining}</span>}
          <button
            type="button"
            className={cx(styles.replyButton, "springPress")}
            onClick={onSubmit}
            disabled={!isSubmittable}
            aria-busy={submitting || undefined}
            aria-label={submitting ? t("post.replying") : undefined}
          >
            <span className={submitting ? styles.replyLabelHidden : undefined}>
              {t("post.reply")}
            </span>
            {submitting && <span className={styles.spinner} aria-hidden="true" />}
          </button>
        </footer>
      </div>

      {confirmingDiscard && (
        <DiscardDialog
          title={t("compose.discardReplyTitle")}
          onDiscard={handleDiscard}
          onKeep={() => setConfirmingDiscard(false)}
        />
      )}
    </div>
    </PlaybackScopeContext.Provider>,
    document.body
  );
}

export default PostReplyExpandModal;
