import { useState, useRef, useEffect, useMemo } from "react";
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
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const fileInputRef = useRef(null);
  const intervalsRef = useRef(new Map());
  const boxRef = useRef(null);

  // Teclado virtual (móvil): con el textarea enfocado, el evento `resize` de
  // window.visualViewport detecta la APARICIÓN del teclado (el viewport
  // visible se reduce) — en el momento real, en cualquier dispositivo, sin
  // delays ni alturas de teclado hardcodeadas. Si la caja quedó tapada por
  // el teclado (su bottom cae fuera del área visible REAL: offsetTop +
  // height del visualViewport), auto-scroll para dejarla visible encima.
  // La caja es parte del flujo (no fixed), así que scrollIntoView basta y
  // todo se revierte solo al cerrar el teclado. Desktop: el visualViewport
  // no se reduce al enfocar → no-op.
  useEffect(() => {
    if (!isInputFocused) return undefined;

    // Aire entre el borde inferior de la caja y el teclado: el scroll se
    // calcula con un delta exacto (no scrollIntoView, que la dejaba al ras).
    const KEYBOARD_GAP = 24;

    // Scrollea lo justo para que el bottom de la caja quede KEYBOARD_GAP px
    // por encima del límite visible dado.
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
      // Fallback (navegadores sin visualViewport): mismo cálculo con
      // window.innerHeight, con un pequeño delay tras el focus.
      const timer = setTimeout(() => liftAbove(window.innerHeight), 300);
      return () => clearTimeout(timer);
    }

    let lastHeight = viewport.height;
    const ensureVisible = () => {
      // Solo cuando el viewport SE REDUCE (teclado abriéndose/creciendo);
      // al cerrarse (crece) no forzamos nada.
      const shrank = viewport.height < lastHeight - 1;
      lastHeight = viewport.height;
      if (!shrank) return;
      // Borde inferior del área realmente visible (descontando el teclado).
      liftAbove(viewport.offsetTop + viewport.height);
    };

    viewport.addEventListener("resize", ensureVisible);
    return () => viewport.removeEventListener("resize", ensureVisible);
  }, [isInputFocused]);

  const charCount = text.length;
  const atLimit = charCount >= MAX_CHARS;
  const isAnyUploading = attachments.some((a) => a.uploading);
  // Usado por el botón de attach (oculto temporalmente junto con él):
  // const isAttachDisabled = attachments.length >= MAX_FILES;
  const isSubmittable =
    text.trim().length > 0 && !isAnyUploading && !isSubmitting;

  // Contador de hashtags únicos detectados (case-insensitive)
  const tagsDetected = useMemo(() => {
    const matches = text.match(HASHTAG_RE) || [];
    return new Set(matches.map((m) => m.toLowerCase())).size;
  }, [text]);

  // Focus automático al activar un nuevo replyingTo
  useEffect(() => {
    if (!replyingTo) return;
    const timer = setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, [replyingTo]);

  // Autoresize del textarea + sync del overlay height
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

  // Auto-dismiss del error banner
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Cleanup al desmontar
  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      intervals.forEach(clearInterval);
      intervals.clear();
    };
  }, []);

  // Sync del scroll del overlay con el textarea
  const handleScroll = (e) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Hard limit: truncar al MAX_CHARS en cada cambio (cubre typing + paste)
  const handleTextChange = (e) => {
    setText(e.target.value.slice(0, MAX_CHARS));
  };

  // Paste: normaliza el texto externo (CRLF→LF, nbsp, zero-width) antes de
  // insertarlo en la posición del cursor. Reconstruye el value con React state
  // (sin execCommand deprecado) y reposiciona el cursor tras el re-render.
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
        if (!firstError) firstError = `${file.name} is too large (max 10MB)`;
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        if (!firstError)
          firstError = `${file.name} is not a supported file type`;
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
      firstError = `Only ${MAX_FILES} files allowed`;
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

  // Abre el file picker — oculto temporalmente junto con el botón de attach:
  // const handleAttachClick = () => {
  //   if (isAttachDisabled) return;
  //   if (fileInputRef.current) fileInputRef.current.click();
  // };

  const handleSubmit = async () => {
    if (!isSubmittable) return;
    // parentId: sub-comment a un reply (replyingTo.sourceId) o comment directo
    // al thread (thread.id). El padre invoca createReply del useThread.
    const parentId = replyingTo?.sourceId || thread?.id;
    try {
      await onSubmit?.({ parentId, text });
      // Solo limpiamos al éxito — el texto se preserva si el POST falla.
      attachments.forEach((a) => {
        if (a.thumbnail) URL.revokeObjectURL(a.thumbnail);
      });
      setText("");
      setAttachments([]);
      setErrorMessage(null);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      // El banner de error lo rendea submitError (lo controla el padre). No
      // limpiamos el textarea: el usuario puede reintentar con el mismo texto.
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
          <span className={styles.label}>posting as</span>
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
          <span className={styles.errorText}>
            Your reply couldn't be posted. Please try again.
          </span>
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
            aria-label="Close error"
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
            replyingTo ? "Type your reply..." : "Reply to this thread..."
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
        {/* Botón de subir imagen oculto temporalmente — la feature se añadirá
            más adelante (la lógica de attachments sigue intacta):
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
            {tagsDetected} {tagsDetected === 1 ? "tag" : "tags"} detected
          </span>
        )}
        <span
          className={`${styles.charCount} ${
            atLimit ? styles.charCountAtLimit : ""
          }`}
        >
          {charCount} / {MAX_CHARS}
        </span>
        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!isSubmittable}
        >
          {isSubmitting ? "replying…" : "reply"}
        </button>
      </div>
    </div>
  );
}

export default PostCommentBox;
