import { useState, useRef, useEffect, useMemo } from "react";
import MaskAvatar from "../MaskAvatar";
import { useFeedContext } from "../../contexts/FeedContext";
import { geohashForPosition } from "../../utils/geohash";
import {
  queryGeolocationPermission,
  subscribeGeolocationPermission,
} from "../../utils/geoPermission";
import { renderTextWithHashtags } from "./homeHelpers";
import { normalizePastedText } from "../../utils/normalizeText";
import { HASHTAG_RE } from "../../utils/hashtags";
import styles from "../../styles/components/home/HomeCompose.module.css";

const MIN_HEIGHT = 60;
const MAX_HEIGHT = 200;
const MAX_CHARS = 1000;
const ERROR_AUTO_DISMISS_MS = 8000;

function getErrorMessage(err) {
  if (!err || !err.status) {
    return "Couldn't reach the server — check your connection";
  }
  if (err.status === 400) {
    const payload = err.payload;
    if (Array.isArray(payload?.text) && payload.text[0]) return payload.text[0];
    if (Array.isArray(payload?.content) && payload.content[0])
      return payload.content[0];
    if (payload?.detail) return payload.detail;
    if (Array.isArray(payload?.non_field_errors) && payload.non_field_errors[0])
      return payload.non_field_errors[0];
    return "The post couldn't be created — check your text and try again";
  }
  if (err.status === 401) return "Your session expired — refresh the page";
  if (err.status === 403) return "You don't have permission to post";
  if (err.status === 429) return "You're posting too fast — wait a moment";
  if (err.status >= 500)
    return "Something went wrong on our side — try again in a moment";
  return "Something went wrong — try again";
}

function HomeCompose({ currentUserMask, isLoading = false }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Opt-in del AUTOR: compartir zona aproximada al publicar. Se persiste
  // la PREFERENCIA (booleano) — la ubicación jamás: se pide al publicar,
  // se fuzzea, se codifica a celda ~5km y se descarta.
  const [shareLocation, setShareLocation] = useState(() => {
    try {
      return window.localStorage.getItem("thiup:share-location") === "true";
    } catch (err) {
      return false;
    }
  });
  // Aviso no-bloqueante del flujo de ubicación (fallos transitorios).
  // El post NUNCA se bloquea por esto — sale sin geohash.
  const [locationNotice, setLocationNotice] = useState(null);
  // Estado REAL del permiso de geolocalización — el toggle no puede
  // prometer lo que el navegador no va a cumplir:
  //   granted | prompt | denied | unsupported (sin geo/contexto inseguro)
  //   | unknown (sin Permissions API → se resuelve al intentar)
  const [geoPermission, setGeoPermission] = useState("unknown");
  // La nota de privacidad SOLO aparece con ubicación realmente
  // disponible: permiso concedido + posición obtenida en esta sesión.
  const [locationReady, setLocationReady] = useState(false);
  // Timer del aviso transitorio de "bloqueado" (aparece al clickear el
  // toggle bloqueado y se va solo — no vive permanente en la caja).
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
  const { createPost } = useFeedContext();

  const charCount = text.length;
  const atLimit = charCount >= MAX_CHARS;
  const isDisabled = isLoading || isSubmitting;
  const isSubmittable = text.trim().length > 0 && !isDisabled;

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

  // Paste: normaliza el texto externo (CRLF→LF, nbsp, zero-width) antes de
  // insertarlo en la posición del cursor. Reconstruye el value con React state
  // y reposiciona el cursor tras el re-render (mismo patrón que PostCommentBox).
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
      /* storage deshabilitado: la preferencia no persiste */
    }
  };

  // Obtiene la posición AHORA (dispara el diálogo si el permiso está
  // 'prompt'). Éxito → toggle ON + nota de privacidad real. Denegado →
  // toggle OFF + estado bloqueado. Otro fallo → aviso transitorio.
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
          // Denegado en el diálogo (o ya bloqueado): el hint persistente
          // de bloqueado lo muestra el computed de abajo.
          setGeoPermission("denied");
        } else {
          setLocationNotice({
            primary: "Can't share your area",
            secondary: "We couldn't get your location — try again.",
          });
        }
      },
      { maximumAge: 300000, timeout: 8000 }
    );
  };

  // Estado real del permiso al montar + cambios EN VIVO (el usuario lo
  // habilita/bloquea en ajustes con la caja abierta).
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

  // Preferencia ON de una sesión anterior: verificar en silencio cuando
  // el permiso sea conocido — la nota solo sale con posición real.
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
    // Bloqueado: el toggle NO se puede activar — el click/tap muestra el
    // aviso de bloqueado unos segundos y desaparece solo (no vive
    // permanente en la caja; en móvil cubre la falta de hover).
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
    // granted → posición directa; prompt/unknown → getCurrentPosition
    // dispara el diálogo del navegador y el resultado decide.
    requestPosition({ persistOnSuccess: true });
  };

  // Geohash del autor SOLO si activó compartir ubicación: coords →
  // fuzzing → celda gruesa (precisión 5) → descartar coords. Si la
  // ubicación falla/expira, el post sale SIN geohash (nunca bloquea) y
  // se reporta el motivo para dar feedback honesto.
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

  // Avisos con la MISMA estructura de dos líneas que la nota de
  // privacidad (su variante warning): el hilo SÍ se publicó — tono
  // mesurado, solo faltó la zona.
  // Copy del aviso de bloqueado — se muestra TRANSITORIO (unos segundos)
  // solo cuando el usuario clickea el toggle bloqueado.
  const BLOCKED_NOTICE =
    geoPermission === "unsupported"
      ? {
          primary: "Can't share your area",
          secondary:
            "Location needs a supported browser over https or localhost.",
        }
      : {
          primary: "Location is blocked",
          secondary:
            "Enable it in your browser settings to attach your area.",
        };

  const LOCATION_FAILURE_NOTICES = {
    denied: {
      primary: "Posted without your area",
      secondary: "Location is blocked — enable it in your browser settings.",
    },
    unavailable: {
      primary: "Posted without your area",
      secondary: "We couldn't get your location in time.",
    },
    unsupported: {
      primary: "Posted without your area",
      secondary: "Your browser doesn't support location.",
    },
  };

  const handleSubmit = async () => {
    if (!isSubmittable) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    setLocationNotice(null);
    try {
      // ESPERAR la geolocalización ANTES del POST (sin race): el payload
      // sale con el geohash o, si falló, sin él — pero nunca a medias.
      const { geohash, failure } = await getAuthorGeohash();
      await createPost(text, { geohash });
      if (shareLocation && !geohash && failure) {
        setLocationNotice(LOCATION_FAILURE_NOTICES[failure]);
      }
      setText("");
      textareaRef.current?.blur();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError({
        message: getErrorMessage(err),
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
        className={`${styles.wrapper} ${isDisabled ? styles.disabled : ""}`}
      >
        <div className={styles.header}>
          {/* Placeholder discreto mientras /me/ carga (un solo request
              global, vía CurrentUserContext). */}
          {currentUserMask ? (
            <>
              <span className={styles.identiconWrap}>
                <MaskAvatar seed={currentUserMask.id} size={20} />
              </span>
              <span className={styles.label}>posting as</span>
              <span className={styles.maskId}>{currentUserMask.id}</span>
            </>
          ) : (
            <span className={styles.label}>posting as …</span>
          )}
          <span className={styles.spacer} />
          {tagsDetected > 0 && (
            <span className={styles.tagsDetected}>
              {tagsDetected} {tagsDetected === 1 ? "tag" : "tags"} detected
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
            placeholder="Start a thread..."
            value={text}
            onChange={handleTextChange}
            onPaste={handlePaste}
            onScroll={handleScroll}
            disabled={isDisabled}
            rows={3}
          />
        </div>
        <div className={styles.toolbar}>
          {/* Botón de subir imagen oculto temporalmente — la feature se
              añadirá más adelante:
          <button
            type="button"
            className={styles.attachButton}
            aria-label="Attach image or video"
            disabled={isDisabled}
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
                ? "location is blocked — enable it in your browser settings"
                : shareLocation
                ? "sharing your approximate area (~5 km, blurred) — click to turn off"
                : "share your approximate area when posting (for Close You) — never your exact location"
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
            {charCount} / {MAX_CHARS}
          </span>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!isSubmittable}
          >
            {isSubmitting && (
              <span className={styles.spinner} aria-hidden="true" />
            )}
            <span>{isSubmitting ? "posting" : "post"}</span>
          </button>
        </div>
      </div>
      {shareLocation && locationReady && !locationNotice && (
        <aside className={styles.privacyNote}>
          {/* "La celda difuminada": micro-mapa de papel donde la zona es
              una mancha LITERALMENTE borrosa (feGaussianBlur) — muestra
              el concepto (~5 km, difuminada, sin punto exacto) en vez de
              solo describirlo. */}
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
            {/* retícula de mapa, tenue como papel */}
            <g stroke="#e5e0d3" strokeWidth="1">
              <line x1="15" y1="2" x2="15" y2="42" />
              <line x1="29" y1="2" x2="29" y2="42" />
              <line x1="2" y1="15" x2="42" y2="15" />
              <line x1="2" y1="29" x2="42" y2="29" />
            </g>
            {/* una calle diagonal, apenas insinuada */}
            <path
              d="M4 36 Q 18 28 24 18 T 40 6"
              fill="none"
              stroke="#ebe7dd"
              strokeWidth="1.4"
            />
            {/* LA ZONA: mancha cálida difuminada — un área, nunca un pin */}
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
            {/* OJO wording: el ~5 km es el BORRÓN donde se guarda la
                ubicación del autor (privacidad) — no confundir con el
                radio de búsqueda del lector en Close You (15-100 km). */}
            <p className={styles.privacyLine}>
              location blurred into a{" "}
              <span className={styles.privacyChip}>~5 km area</span>
            </p>
            <p className={styles.privacyGuarantee}>
              your exact spot is never stored
            </p>
          </div>
          {/* Cerrar la nota = APAGAR el compartir zona (misma rama OFF
              del toggle): nota y opt-in nunca se desincronizan — sin
              estado huérfano de "compartiendo sin aviso". */}
          <button
            type="button"
            className={styles.privacyClose}
            onClick={toggleShareLocation}
            aria-label="Stop sharing my area"
            title="stop sharing my area"
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
          {/* Variante WARNING de la nota de privacidad: mismo layout y
              tipografía; cambia el icono (pin TACHADO = zona no
              adjuntada) y el color de aviso (terracota, con tacto). */}
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
              {/* tachado */}
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
            aria-label="Dismiss error"
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
