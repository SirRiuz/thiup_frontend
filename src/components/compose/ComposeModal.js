import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import MaskAvatar from "../MaskAvatar";
import { useFeedContext } from "../../contexts/FeedContext";
import { useCurrentUser } from "../../contexts/CurrentUserContext";
import { useToast } from "../../contexts/ToastContext";
import { geohashForPosition } from "../../utils/geohash";
import { ACCEPT_ATTR } from "../../services/media/allowedFormats";
import cx from "../../utils/cx";
import {
  queryGeolocationPermission,
  subscribeGeolocationPermission,
} from "../../utils/geoPermission";
import MediaScanList from "../media/MediaScanList";
import DropZoneOverlay from "../media/DropZoneOverlay";
import RateLimitNotice from "../RateLimitNotice";
import ErrorNotice from "../ErrorNotice";
import { isRateLimitError } from "../../utils/rateLimit";
import DiscardDialog from "./DiscardDialog";
import useMediaComposer from "../../hooks/useMediaComposer";
import useFileDrop from "../../hooks/useFileDrop";
import { useScrollLock } from "../../utils/scrollLock";
import { warmHumanPass } from "../../api/humanPass";
import { renderTextWithHashtags } from "../home/homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import { filesFromClipboard } from "../../utils/clipboardFiles";
import { HASHTAG_RE } from "../../utils/hashtags";
import styles from "../../styles/components/compose/ComposeModal.module.css";

const MIN_HEIGHT = 96;
// Threads' exact limit (500 for posts AND replies — a reply IS a post there
// too). Mirrored server-side by THREAD_TEXT_MAX_LENGTH; keep both in sync.
const MAX_CHARS = 500;
const ERROR_AUTO_DISMISS_MS = 8000;

// The backend may return validation messages (400) that are shown as-is;
// the rest of the error messages are from the UI and are translated.
// NOTE 429 is handled apart (RateLimitNotice owns the whole rate-limit
// surface); this message is only its text fallback.
function getErrorMessage(err, t) {
  if (!err || !err.status) {
    return t("errors.network");
  }
  if (err.status === 400) {
    const payload = err.payload;
    if (Array.isArray(payload?.text) && payload.text[0]) return payload.text[0];
    if (Array.isArray(payload?.content) && payload.content[0])
      return payload.content[0];
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

/**
 * ComposeModal — THE thread composer (Threads/Substack-style create dialog),
 * opened from the home compose row and the nav "+" on every screen.
 *
 * Anatomy: header (Cancel · "New thread" · spacer) → identity row (avatar +
 * mask @id) → borderless textarea with the hashtag highlight overlay → media
 * previews → notices → footer toolbar (labeled Media / Area buttons left,
 * char count + primary Post right — the labels exist because the old
 * icon-only 14px controls went unnoticed).
 *
 * Mounted permanently by ComposeProvider (renders null while closed). Every
 * close path funnels through requestClose: with a non-empty draft it shows
 * Threads' "Discard thread?" confirm (Discard clears, Cancel keeps editing).
 */
function ComposeModal({ open, onClose }) {
  const { t } = useTranslation();
  const { currentUserMask } = useCurrentUser();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Threads' "Discard thread?" confirm: closing with a non-empty draft asks
  // first — Discard clears everything, Cancel keeps editing.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // AUTHOR opt-in: share approximate area when publishing. The PREFERENCE
  // (boolean) is persisted — the location never: it is requested when
  // publishing, fuzzed, encoded to a ~5km cell and discarded.
  const [shareLocation, setShareLocation] = useState(() => {
    try {
      return window.localStorage.getItem("thiup:share-location") === "true";
    } catch (err) {
      return false;
    }
  });
  // Whether the user has EVER chosen (the stored preference exists). While
  // they haven't, the area defaults ON when the browser permission is already
  // granted (one-time smart default — no dialog is ever triggered by it);
  // the moment they toggle it themselves, their persisted choice wins.
  const hasStoredPrefRef = useRef(
    (() => {
      try {
        return window.localStorage.getItem("thiup:share-location") !== null;
      } catch (err) {
        // Storage unavailable: treat as decided so we never re-default.
        return true;
      }
    })()
  );
  // Non-blocking notice for the location flow (transient failures).
  // The post is NEVER blocked by this — it goes out without geohash.
  const [locationNotice, setLocationNotice] = useState(null);
  // REAL state of the geolocation permission — the toggle can't promise what
  // the browser isn't going to deliver:
  //   granted | prompt | denied | unsupported (no geo/insecure context)
  //   | unknown (no Permissions API → resolved when attempting)
  const [geoPermission, setGeoPermission] = useState("unknown");
  // The privacy note ONLY appears with location actually available:
  // permission granted + position obtained in this session.
  const [locationReady, setLocationReady] = useState(false);
  const noticeTimerRef = useRef(null);
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const errorTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  // Element focused before opening, to restore it on close.
  const previouslyFocusedRef = useRef(null);
  const { createPost, attachMediaToPost } = useFeedContext();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Shared media flow (images + videos): scan + compress + auto-upload, then
  // confirm against the thread once it's created. Same hook as the reply box.
  const media = useMediaComposer();

  // Threads-style limit: typing past MAX_CHARS is ALLOWED; a countdown then
  // shows the negative remaining (e.g. "-38") and submit is blocked until
  // back under — same behavior as the reply box.
  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;
  const isDisabled = isSubmitting;
  // Block submit while media is still processing/uploading (media.pending), so
  // the thread is never posted referencing an incomplete upload.
  const isSubmittable =
    text.trim().length > 0 && !overLimit && !isDisabled && !media.pending;
  const hasDraft = text.trim().length > 0 || media.count > 0;
  // A throttled post (429) is not a failure but a wait: it gets the warm
  // RateLimitNotice with its countdown instead of the red error banner.
  const rateLimited = isRateLimitError(submitError?.error);

  // Every close path (Cancel, backdrop, Escape) funnels here: a non-empty
  // draft gets Threads' discard confirm instead of silently closing.
  const requestClose = () => {
    if (isSubmitting) return;
    if (hasDraft) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };
  // Fresh closure for the document-level Escape listener (deps stay [open]).
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  const handleDiscard = () => {
    setText("");
    media.clear();
    setSubmitError(null);
    setConfirmingDiscard(false);
    onClose();
  };

  // Page scroll stays locked behind the dialog while it's open.
  useScrollLock(open);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const showTransientNotice = (notice, ms = 4000) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setLocationNotice(notice);
    noticeTimerRef.current = setTimeout(() => {
      setLocationNotice(null);
      noticeTimerRef.current = null;
    }, ms);
  };

  // Opening the dialog focuses the textarea on DESKTOP only (typing can start
  // immediately). On mobile there is NO autofocus — Threads' behavior: the
  // keyboard appears when the user taps the field, never popped by the dialog
  // itself. Also pre-warms the captcha human pass in the background, so the
  // PoW is already solved by the time the user hits Post (no perceived
  // latency). Focus is restored to the opener on close.
  useEffect(() => {
    if (!open) return undefined;
    previouslyFocusedRef.current = document.activeElement;
    if (!window.matchMedia("(max-width: 700px)").matches) {
      textareaRef.current?.focus();
    }
    warmHumanPass();
    return () => {
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open]);

  // Escape closes (draft kept — the component stays mounted) + a simple Tab
  // focus trap, the same pattern as the app's other dialogs.
  useEffect(() => {
    if (!open) return undefined;
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
  }, [open]);

  // Auto-size the textarea and keep the highlight overlay in sync. The field
  // just GROWS with the content — never an inner scrollbox (Threads' dialog:
  // the editor is free-height and the BODY scrolls; a capped textarea inside
  // the scrollable body double-scrolled and read clipped).
  useEffect(() => {
    if (!open) return;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.max(ta.scrollHeight, MIN_HEIGHT);
    ta.style.height = `${newHeight}px`;
    ta.style.overflowY = "hidden";
    if (overlayRef.current) {
      overlayRef.current.style.height = `${newHeight}px`;
    }
  }, [text, open]);

  // Rate limits are exempt: their notice lives as long as the countdown does
  // (it clears itself on expire) — a fixed 8s would hide the wait mid-way.
  useEffect(() => {
    if (!submitError || rateLimited) return undefined;
    errorTimerRef.current = setTimeout(() => {
      setSubmitError(null);
    }, ERROR_AUTO_DISMISS_MS);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [submitError, rateLimited]);

  const tagsDetected = useMemo(() => {
    const matches = text.match(HASHTAG_RE) || [];
    return new Set(matches.map((m) => m.toLowerCase())).size;
  }, [text]);

  const handleScroll = (e) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Typing past MAX_CHARS is allowed (the counter goes negative and submit
  // is blocked) — no hard truncation.
  const handleTextChange = (e) => {
    if (isDisabled) return;
    setText(e.target.value);
  };

  // Paste: a pasted FILE (e.g. a copied screenshot) attaches as media — the
  // same validate→compress→upload flow as the picker/drop, first so a
  // pasted image never falls through to the text branch below. Otherwise,
  // normalizes the external text (CRLF→LF, nbsp, zero-width) before
  // inserting it at the cursor position (same pattern as PostCommentBox).
  const handlePaste = (e) => {
    if (isDisabled) return;
    const pastedFiles = filesFromClipboard(e);
    if (pastedFiles.length > 0) {
      e.preventDefault();
      attachFiles(pastedFiles);
      return;
    }
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
      // FOLLOW the paste to the end of the dialog (Threads' behavior) — the
      // textarea grows free-height, so the body is the only scroller.
      const body = bodyRef.current;
      if (body) body.scrollTop = body.scrollHeight;
    });
  };

  const persistSharePref = (value) => {
    try {
      window.localStorage.setItem("thiup:share-location", String(value));
      // The user has now decided — the smart default steps aside for good.
      hasStoredPrefRef.current = true;
    } catch (err) {
      /* storage disabled: the preference does not persist */
    }
  };

  // Gets the position NOW (triggers the dialog if the permission is
  // 'prompt'). Success → toggle ON + real privacy note. Denied →
  // toggle OFF + blocked state. Other failure → transient notice.
  const requestPosition = ({ persistOnSuccess }) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoPermission("granted");
        setLocationReady(true);
        setShareLocation(true);
        if (persistOnSuccess) persistSharePref(true);
      },
      (geoError) => {
        setLocationReady(false);
        setShareLocation(false);
        if (geoError && geoError.code === 1) {
          setGeoPermission("denied");
        } else if (geoError && geoError.code === 2) {
          // POSITION_UNAVAILABLE (e.g. CoreLocation's kCLErrorLocationUnknown):
          // the DEVICE's location service is down — tell the user it's not us.
          setLocationNotice({
            primary: t("compose.providerDownTitle"),
            secondary: t("compose.providerDownBody"),
          });
        } else {
          setLocationNotice({
            primary: t("compose.cannotShareTitle"),
            secondary: t("compose.cannotShareBody"),
          });
        }
      },
      { maximumAge: 300000, timeout: 8000 }
    );
  };

  // Real permission state on mount + LIVE changes (the user
  // enables/blocks it in settings with the dialog open).
  useEffect(() => {
    let active = true;
    const blockedByEnvironment =
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      (typeof window !== "undefined" && window.isSecureContext === false);

    if (blockedByEnvironment) {
      setGeoPermission("unsupported");
      return undefined;
    }

    queryGeolocationPermission().then((state) => {
      if (active) setGeoPermission(state || "unknown");
    });
    const unsubscribe = subscribeGeolocationPermission((state) => {
      setGeoPermission(state);
      if (state !== "granted") {
        setLocationReady(false);
        setShareLocation(false);
      }
      if (state === "granted") setLocationNotice(null);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const permissionBlocked =
    geoPermission === "denied" || geoPermission === "unsupported";

  // ON preference from a previous session: verify silently when the
  // permission is known — the note only appears with a real position.
  useEffect(() => {
    if (geoPermission === "granted" && shareLocation && !locationReady) {
      requestPosition({ persistOnSuccess: false });
    }
    // Smart default (one-time): permission already granted + the user never
    // chose → area ON automatically. Not persisted, so it keeps defaulting ON
    // until the user toggles it themselves — from then on their choice rules.
    if (
      geoPermission === "granted" &&
      !shareLocation &&
      !hasStoredPrefRef.current
    ) {
      requestPosition({ persistOnSuccess: false });
    }
    if (permissionBlocked && shareLocation) {
      setShareLocation(false);
      setLocationReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoPermission]);

  const toggleShareLocation = () => {
    setLocationNotice(null);
    // Blocked: the toggle CANNOT be activated — the click/tap shows the
    // blocked notice for a few seconds and disappears on its own.
    if (permissionBlocked) {
      showTransientNotice(BLOCKED_NOTICE);
      return;
    }

    if (shareLocation) {
      setShareLocation(false);
      setLocationReady(false);
      persistSharePref(false);
      return;
    }
    // granted → direct position; prompt/unknown → getCurrentPosition
    // triggers the browser dialog and the result decides.
    requestPosition({ persistOnSuccess: true });
  };

  // Author's geohash ONLY if they enabled sharing location: coords →
  // fuzzing → coarse cell (precision 5) → discard coords. If the location
  // fails/expires, the post goes out WITHOUT geohash (never blocks).
  const getAuthorGeohash = () =>
    new Promise((resolve) => {
      if (!shareLocation || permissionBlocked) {
        return resolve({ geohash: null, failure: null });
      }
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        return resolve({ geohash: null, failure: "unsupported" });
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            geohash: geohashForPosition(
              position.coords.latitude,
              position.coords.longitude
            ),
            failure: null,
          }),
        (error) =>
          resolve({
            geohash: null,
            failure:
              error && error.code === 1
                ? "denied"
                : error && error.code === 2
                ? "providerDown"
                : "unavailable",
          }),
        { maximumAge: 300000, timeout: 8000 }
      );
    });

  // Copy for the blocked notice — shown TRANSIENTLY (a few seconds) only
  // when the user clicks the blocked toggle.
  const BLOCKED_NOTICE =
    geoPermission === "unsupported"
      ? {
          primary: t("compose.cannotShareTitle"),
          secondary: t("compose.unsupportedBody"),
        }
      : {
          primary: t("compose.blockedTitle"),
          secondary: t("compose.blockedBody"),
        };

  const LOCATION_FAILURE_NOTICES = {
    denied: {
      primary: t("compose.postedWithoutAreaTitle"),
      secondary: t("compose.postedWithoutAreaDenied"),
    },
    unavailable: {
      primary: t("compose.postedWithoutAreaTitle"),
      secondary: t("compose.postedWithoutAreaTimeout"),
    },
    // The device's location service itself failed (POSITION_UNAVAILABLE) —
    // honest framing: it's the system, not Thiup.
    providerDown: {
      primary: t("compose.postedWithoutAreaTitle"),
      secondary: t("compose.postedWithoutAreaProviderDown"),
    },
    unsupported: {
      primary: t("compose.postedWithoutAreaTitle"),
      secondary: t("compose.postedWithoutAreaUnsupported"),
    },
  };

  // Validate + start processing a batch of files (from the picker, a drop, or
  // a clipboard paste — same shape either way); shows the first error inline.
  // Async: addFiles sniffs each file's magic bytes before accepting it.
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

  const handleAttachClick = () => {
    if (isDisabled || media.attachDisabled) return;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Drag-and-drop onto the whole dialog. Rejections (too large/unsupported
  // format) surface through the SAME attachFiles → submitError path as the
  // picker, so the reason is never silent.
  const { isDragging, dropProps } = useFileDrop({
    onFiles: attachFiles,
    disabled: isDisabled,
  });

  const handleSubmit = async () => {
    if (!isSubmittable) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setLocationNotice(null);
    // Persistent "Publishing…" toast (spinner). Kept by id so the SAME toast
    // is morphed into the success state on completion — one recipient, same
    // size, no jump (Threads-style).
    const toastId = showToast({
      type: "loading",
      message: t("toast.publishing"),
      duration: 0,
    });
    try {
      // WAIT for the geolocation BEFORE the POST (no race): the payload
      // goes out with the geohash or, if it failed, without it.
      const { geohash, failure } = await getAuthorGeohash();
      const created = await createPost(text, { geohash });
      // Attach the already-uploaded media to the new thread (confirm), then
      // inject it into the just-inserted feed post so it renders immediately.
      if (created?.uid) {
        const mediaItems = await media.confirmTo(created.uid);
        attachMediaToPost(created.uid, mediaItems);
      }
      setText("");
      media.clear();
      // Posted: close the dialog. The location-failure notice (if any) would
      // be invisible in a closed modal, so it travels via the toast flow —
      // the success toast still confirms the post itself.
      onClose();
      if (shareLocation && !geohash && failure) {
        const notice = LOCATION_FAILURE_NOTICES[failure];
        showToast({
          type: "info",
          message: `${notice.primary} — ${notice.secondary}`,
          duration: 6000,
        });
      }
      // On home the new thread highlights at the top — bring it into view.
      if (location.pathname === "/home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      // Morph the SAME loading toast into the confirmation: "Thread posted"
      // + a "View" link to the new thread (public id only, no author data).
      if (created?.id) {
        const href = `/p/${created.id}`;
        showToast.update(toastId, {
          type: "success",
          message: t("toast.posted"),
          duration: 3000,
          action: {
            label: t("toast.viewPost"),
            href,
            onClick: () => navigate(href),
          },
        });
      } else {
        showToast.dismiss(toastId);
      }
    } catch (err) {
      // Never leave the spinner hanging: drop the loading toast; the inline
      // error banner carries the detail.
      showToast.dismiss(toastId);
      // The raw error travels too: the 429 case is rendered as its own warm
      // notice (with the backend's wait), not as the red banner.
      setSubmitError({
        title: t("compose.postErrorTitle"),
        message: getErrorMessage(err, t),
        timestamp: Date.now(),
        error: err,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissError = () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setSubmitError(null);
  };

  // Backdrop click funnels through requestClose (discard confirm when there
  // is a draft). Only the backdrop itself — clicks inside the dialog never
  // close it.
  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) requestClose();
  };

  if (!open) return null;

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-modal-title"
        {...dropProps}
      >
        {/* === Header: Cancel · centered title · balance spacer === */}
        <header className={styles.header}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={requestClose}
            disabled={isSubmitting}
          >
            {t("compose.cancel")}
          </button>
          <h2 id="compose-modal-title" className={styles.title}>
            {t("home.newThread")}
          </h2>
          <span className={styles.headerSpacer} aria-hidden="true" />
        </header>

        {/* === Body: identity row + textarea + media previews + notices === */}
        <div className={styles.body} ref={bodyRef}>
          <div className={styles.identityRow}>
            <span className={styles.avatarSlot} aria-hidden="true">
              {currentUserMask ? (
                <MaskAvatar seed={currentUserMask.id} size={36} />
              ) : (
                <span className={styles.avatarGhost} />
              )}
            </span>
            <div className={styles.contentCol}>
              <div className={styles.identityLine}>
                <span className={styles.maskId}>
                  {currentUserMask
                    ? currentUserMask.id
                    : t("compose.postingAsPlaceholder")}
                </span>
                {tagsDetected > 0 && (
                  <span className={styles.tagsDetected}>
                    {t("common.tagsDetected", { count: tagsDetected })}
                  </span>
                )}
              </div>
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
                  id="compose-textarea"
                  name="compose"
                  className={styles.input}
                  placeholder={t("compose.placeholder")}
                  value={text}
                  onChange={handleTextChange}
                  onPaste={handlePaste}
                  onScroll={handleScroll}
                  disabled={isDisabled}
                  rows={3}
                />
              </div>

              <MediaScanList media={media} />
            </div>
          </div>

          {shareLocation && locationReady && !locationNotice && (
            <aside className={styles.privacyNote}>
              {/* "The blurred cell": paper micro-map where the area is a
                  LITERALLY blurry blob (feGaussianBlur) — it shows the
                  concept (~5 km, blurred, no exact point). */}
              <svg
                className={styles.privacyMap}
                width="44"
                height="44"
                viewBox="0 0 44 44"
                aria-hidden="true"
              >
                <defs>
                  <filter
                    id="composeZoneBlur"
                    x="-60%"
                    y="-60%"
                    width="220%"
                    height="220%"
                  >
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                </defs>
                <g stroke="#e5e0d3" strokeWidth="1">
                  <line x1="15" y1="2" x2="15" y2="42" />
                  <line x1="29" y1="2" x2="29" y2="42" />
                  <line x1="2" y1="15" x2="42" y2="15" />
                  <line x1="2" y1="29" x2="42" y2="29" />
                </g>
                <path
                  d="M4 36 Q 18 28 24 18 T 40 6"
                  fill="none"
                  stroke="#ebe7dd"
                  strokeWidth="1.4"
                />
                {/* A second, fainter street crossing the first — just enough
                    cartography for the paper map to read as a map. */}
                <path
                  d="M6 10 Q 16 18 26 30 T 41 38"
                  fill="none"
                  stroke="#ebe7dd"
                  strokeWidth="1"
                />
                <rect
                  className={styles.privacyZone}
                  x="16"
                  y="16"
                  width="13"
                  height="13"
                  rx="3"
                  fill="#b8845f"
                  filter="url(#composeZoneBlur)"
                />
              </svg>
              <div className={styles.privacyText}>
                <p className={styles.privacyLine}>
                  {t("compose.privacyNoteLead")}{" "}
                  <span className={styles.privacyChip}>
                    {t("compose.privacyNoteChip")}
                  </span>
                </p>
                <p className={styles.privacyGuarantee}>
                  {t("compose.privacyGuarantee")}
                </p>
              </div>
              {/* Closing the note = TURNING OFF area sharing: note and opt-in
                  never desync. */}
              <button
                type="button"
                className={styles.privacyClose}
                onClick={toggleShareLocation}
                aria-label={t("compose.stopSharing")}
                title={t("compose.stopSharing")}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </aside>
          )}

          {locationNotice && (
            <aside
              className={cx(styles.privacyNote, styles.noteWarning)}
              role="status"
            >
              {/* WARNING variant: crossed-out pin, terracotta, tactful. */}
              <svg
                className={styles.privacyMap}
                width="44"
                height="44"
                viewBox="0 0 44 44"
                aria-hidden="true"
              >
                <g
                  fill="none"
                  stroke="#a85432"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M30 19c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="22" cy="19" r="3" />
                  <line x1="12" y1="33" x2="32" y2="9" />
                </g>
              </svg>
              <div className={styles.privacyText}>
                <p className={styles.warningPrimary}>{locationNotice.primary}</p>
                <p className={styles.privacyLine}>{locationNotice.secondary}</p>
              </div>
            </aside>
          )}

          {submitError && rateLimited && (
            <RateLimitNotice
              variant="post"
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
          id="compose-file-input"
          name="compose-files"
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          onChange={handleFileChange}
          className={styles.hiddenFileInput}
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* === Footer toolbar: labeled options left, count + Post right === */}
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
          <button
            type="button"
            className={cx(
              styles.toolButton,
              shareLocation ? styles.toolButtonActive : "",
              permissionBlocked ? styles.toolButtonBlocked : ""
            )}
            onClick={toggleShareLocation}
            disabled={isDisabled}
            aria-pressed={shareLocation}
            aria-disabled={permissionBlocked}
            title={
              permissionBlocked
                ? t("compose.locationBlocked")
                : shareLocation
                ? t("compose.locationActive")
                : t("compose.locationDefault")
            }
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
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className={styles.toolLabel}>{t("compose.areaLabel")}</span>
          </button>
          <span className={styles.footerSpacer} />
          {/* Threads-style: the counter only appears once the limit is
              exceeded, counting DOWN into the negative (e.g. "-38"). */}
          {overLimit && <span className={styles.overLimit}>{remaining}</span>}
          <button
            type="button"
            className={cx(styles.postButton, "springPress")}
            onClick={handleSubmit}
            disabled={!isSubmittable}
            aria-busy={isSubmitting || undefined}
            aria-label={isSubmitting ? t("compose.posting") : undefined}
          >
            {/* The label always renders "Post" so the button keeps its exact
                width; while submitting a spinner is centered over it. */}
            <span
              className={isSubmitting ? styles.postLabelHidden : undefined}
            >
              {t("compose.post")}
            </span>
            {isSubmitting && <span className={styles.spinner} aria-hidden="true" />}
          </button>
        </footer>

        <DropZoneOverlay active={isDragging} />
      </div>

      {confirmingDiscard && (
        <DiscardDialog
          title={t("compose.discardThreadTitle")}
          onDiscard={handleDiscard}
          onKeep={() => setConfirmingDiscard(false)}
        />
      )}
    </div>,
    document.body
  );
}

export default ComposeModal;
