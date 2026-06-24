import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import MaskAvatar from "../MaskAvatar";
import { useFeedContext } from "../../contexts/FeedContext";
import { useToast } from "../../contexts/ToastContext";
import { geohashForPosition } from "../../utils/geohash";
import { ACCEPT_ATTR } from "../../services/media/allowedFormats";
import {
  queryGeolocationPermission,
  subscribeGeolocationPermission,
} from "../../utils/geoPermission";
import MediaScanList from "../media/MediaScanList";
import useMediaComposer from "../../hooks/useMediaComposer";
import { renderTextWithHashtags } from "./homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import { HASHTAG_RE } from "../../utils/hashtags";
import styles from "../../styles/components/home/HomeCompose.module.css";

const MIN_HEIGHT = 60;
const MAX_HEIGHT = 200;
const MAX_CHARS = 1000;
const ERROR_AUTO_DISMISS_MS = 8000;

// The backend may return validation messages (400) that are shown as-is;
// the rest of the error messages are from the UI and are translated.
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

function HomeCompose({ currentUserMask, isLoading = false }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
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
  // Timer for the transient "blocked" notice (appears when clicking the
  // blocked toggle and goes away on its own — it doesn't live permanently
  // in the box).
  const noticeTimerRef = useRef(null);

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
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const errorTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const { createPost, attachMediaToPost } = useFeedContext();
  const showToast = useToast();
  const navigate = useNavigate();
  // Shared media flow (images + videos): scan + compress + auto-upload, then
  // confirm against the thread once it's created. Same hook as the reply box.
  const media = useMediaComposer();

  const charCount = text.length;
  const atLimit = charCount >= MAX_CHARS;
  const isDisabled = isLoading || isSubmitting;
  // Block submit while media is still processing/uploading (media.pending), so
  // the thread is never posted referencing an incomplete upload.
  const isSubmittable = text.trim().length > 0 && !isDisabled && !media.pending;

  const tagsDetected = useMemo(() => {
    const matches = text.match(HASHTAG_RE) || [];
    return new Set(matches.map((m) => m.toLowerCase())).size;
  }, [text]);

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

  useEffect(() => {
    if (!submitError) return;
    errorTimerRef.current = setTimeout(() => {
      setSubmitError(null);
    }, ERROR_AUTO_DISMISS_MS);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [submitError]);

  const handleScroll = (e) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleTextChange = (e) => {
    if (isDisabled) return;
    setText(e.target.value.slice(0, MAX_CHARS));
  };

  // Paste: normalizes the external text (CRLF→LF, nbsp, zero-width) before
  // inserting it at the cursor position. Rebuilds the value with React state
  // and repositions the cursor after the re-render (same pattern as
  // PostCommentBox).
  const handlePaste = (e) => {
    if (isDisabled) return;
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

  const persistSharePref = (value) => {
    try {
      window.localStorage.setItem("thiup:share-location", String(value));
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
          // Denied in the dialog (or already blocked): the persistent
          // blocked hint is shown by the computed below.
          setGeoPermission("denied");
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
  // enables/blocks it in settings with the box open).
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
    if (permissionBlocked && shareLocation) {
      setShareLocation(false);
      setLocationReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoPermission]);

  const toggleShareLocation = () => {
    setLocationNotice(null);
    // Blocked: the toggle CANNOT be activated — the click/tap shows the
    // blocked notice for a few seconds and disappears on its own (it doesn't
    // live permanently in the box; on mobile it covers the lack of hover).
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
  // fails/expires, the post goes out WITHOUT geohash (never blocks) and the
  // reason is reported to give honest feedback.
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
              error && error.code === 1 ? "denied" : "unavailable",
          }),
        { maximumAge: 300000, timeout: 8000 }
      );
    });

  // Notices with the SAME two-line structure as the privacy note (its
  // warning variant): the thread WAS published — measured tone, only the
  // area was missing.
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
    unsupported: {
      primary: t("compose.postedWithoutAreaTitle"),
      secondary: t("compose.postedWithoutAreaUnsupported"),
    },
  };

  // Validate + start processing the picked files; show the first error inline.
  const handleFileChange = (e) => {
    const { error } = media.addFiles(e.target.files);
    e.target.value = "";
    if (error) {
      setSubmitError({ message: t(error.key, error.params), timestamp: Date.now() });
    }
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

    setLocationNotice(null);
    // Persistent "Publishing…" toast (spinner). Kept by id so the SAME toast is
    // morphed into the success state on completion — one recipient, same size,
    // no jump (Threads-style). Shown before awaiting geolocation so it covers
    // the whole publish wait.
    const toastId = showToast({
      type: "loading",
      message: t("toast.publishing"),
      duration: 0,
    });
    try {
      // WAIT for the geolocation BEFORE the POST (no race): the payload
      // goes out with the geohash or, if it failed, without it — but never
      // half-done.
      const { geohash, failure } = await getAuthorGeohash();
      const created = await createPost(text, { geohash });
      // Attach the already-uploaded media to the new thread (confirm). The files
      // were uploaded as they finished processing; best-effort, the thread is
      // already posted. Inject the confirmed media into the just-inserted feed
      // post so it renders immediately (no reload).
      if (created?.uid) {
        const mediaItems = await media.confirmTo(created.uid);
        attachMediaToPost(created.uid, mediaItems);
      }
      if (shareLocation && !geohash && failure) {
        setLocationNotice(LOCATION_FAILURE_NOTICES[failure]);
      }
      setText("");
      media.clear();
      textareaRef.current?.blur();
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Morph the SAME loading toast into the confirmation: white check
      // (success default) + "Thread posted" + a "View" link to the new thread
      // (public id only, no author data). Now auto-dismisses (~3s).
      if (created?.id) {
        const href = `/post/${created.id}`;
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
      setSubmitError({
        message: getErrorMessage(err, t),
        timestamp: Date.now(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissError = () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setSubmitError(null);
  };

  return (
    <>
      <div
        className={`${styles.wrapper} ${isDisabled ? styles.disabled : ""} ${
          isSubmitting ? styles.submitting : ""
        }`}
      >
        <div className={styles.header}>
          {/* Discreet placeholder while /me/ loads (a single global
              request, via CurrentUserContext). */}
          {currentUserMask ? (
            <>
              <span className={styles.identiconWrap}>
                <MaskAvatar seed={currentUserMask.id} size={20} />
              </span>
              <span className={styles.label}>{t("compose.postingAs")}</span>
              <span className={styles.maskId}>{currentUserMask.id}</span>
            </>
          ) : (
            <span className={styles.label}>{t("compose.postingAsPlaceholder")}</span>
          )}
          <span className={styles.spacer} />
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

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.attachButton}
            onClick={handleAttachClick}
            disabled={isDisabled || media.attachDisabled}
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
          <button
            type="button"
            className={`${styles.locationButton} ${
              shareLocation ? styles.locationButtonActive : ""
            } ${permissionBlocked ? styles.locationButtonBlocked : ""}`}
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
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>
          <span className={styles.spacer} />
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
            aria-busy={isSubmitting || undefined}
            aria-label={isSubmitting ? t("compose.posting") : undefined}
          >
            {/* The label always renders "Post" so the button keeps its exact
                width; while submitting it's hidden (visibility, box kept) and a
                spinner is centered over it — no resize, no X-axis jump. */}
            <span className={isSubmitting ? styles.submitLabelHidden : undefined}>
              {t("compose.post")}
            </span>
            {isSubmitting && (
              <span className={styles.spinner} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {shareLocation && locationReady && !locationNotice && (
        <aside className={styles.privacyNote}>
          {/* "The blurred cell": paper micro-map where the area is a
              LITERALLY blurry blob (feGaussianBlur) — it shows the concept
              (~5 km, blurred, no exact point) instead of just describing
              it. */}
          <svg
            className={styles.privacyMap}
            width="44"
            height="44"
            viewBox="0 0 44 44"
            aria-hidden="true"
          >
            <defs>
              <filter id="zoneBlur" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>
            {/* map grid, faint like paper */}
            <g stroke="#e5e0d3" strokeWidth="1">
              <line x1="15" y1="2" x2="15" y2="42" />
              <line x1="29" y1="2" x2="29" y2="42" />
              <line x1="2" y1="15" x2="42" y2="15" />
              <line x1="2" y1="29" x2="42" y2="29" />
            </g>
            {/* a diagonal street, barely hinted */}
            <path
              d="M4 36 Q 18 28 24 18 T 40 6"
              fill="none"
              stroke="#ebe7dd"
              strokeWidth="1.4"
            />
            {/* THE AREA: warm blurred blob — an area, never a pin */}
            <rect
              className={styles.privacyZone}
              x="16"
              y="16"
              width="13"
              height="13"
              rx="3"
              fill="#b8845f"
              filter="url(#zoneBlur)"
            />
          </svg>
          <div className={styles.privacyText}>
            {/* CAREFUL with wording: the ~5 km is the BLUR where the
                author's location is stored (privacy) — not to be confused
                with the reader's search radius in Close You (15-100 km). */}
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
          {/* Closing the note = TURNING OFF area sharing (same OFF branch
              of the toggle): note and opt-in never desync — no orphan state
              of "sharing without notice". */}
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
          className={`${styles.privacyNote} ${styles.noteWarning}`}
          role="status"
        >
          {/* WARNING variant of the privacy note: same layout and
              typography; changes the icon (CROSSED-OUT pin = area not
              attached) and the warning color (terracotta, tactful). */}
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
              {/* pin */}
              <path d="M30 19c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="22" cy="19" r="3" />
              {/* crossed out */}
              <line x1="12" y1="33" x2="32" y2="9" />
            </g>
          </svg>
          <div className={styles.privacyText}>
            <p className={styles.warningPrimary}>{locationNotice.primary}</p>
            <p className={styles.privacyLine}>{locationNotice.secondary}</p>
          </div>
        </aside>
      )}
      {submitError && (
        <div className={styles.errorBanner} role="alert">
          <svg
            className={styles.errorIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" />
            <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
          </svg>
          <span className={styles.errorMessage}>{submitError.message}</span>
          <button
            type="button"
            className={styles.errorDismiss}
            onClick={handleDismissError}
            aria-label={t("common.dismissError")}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

export default HomeCompose;
