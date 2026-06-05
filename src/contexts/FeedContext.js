import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { apiFetch } from "../api/client";
import { mapBackendPostToFrontend } from "../api/mappers/postMapper";
import { buildDraftJsContent } from "../utils/draftjs";
import { getTopTags, TOP_TAGS_COUNT } from "../utils/affinity";
import { getLanguage, getCountryCode } from "../utils/locale";
import { geohashForPosition } from "../utils/geohash";
import {
  queryGeolocationPermission,
  subscribeGeolocationPermission,
} from "../utils/geoPermission";

const FeedContext = createContext(null);

const POSTS_ENDPOINT = "/threads/";
// Los dos feeds del home — MISMO motor en el backend (umbral + momentum +
// gracia + paginación POST); cambian filtro y boost:
//   For You  → tags de afinidad + región (personal)
//   Close You → celdas geohash ~10km + proximidad (geográfico)
const FORYOU_ENDPOINT = "/threads/foryou/";
const CLOSEYOU_ENDPOINT = "/threads/closeyou/";

export function FeedProvider({ children }) {
  const [posts, setPosts] = useState([]);
  // Tab activa del home: For You (default) | Close You.
  const [feedTab, setFeedTab] = useState("foryou");
  // Estado del opt-in de ubicación del Close You:
  // idle | prompt (pedir permiso) | locating | ready | denied | unsupported
  const [closeYouStatus, setCloseYouStatus] = useState("idle");
  // Celda geohash del lector (precisión 5, fuzzeada) — EFÍMERA: vive
  // SOLO en memoria (ref), jamás en localStorage ni persistida: no se
  // construye ningún mapa de ubicaciones de personas. El backend genera
  // el grid del radio a partir de ella.
  const closeYouCellRef = useRef(null);
  // Radio del Close You (km). Se persiste SOLO el número (no es dato
  // sensible) para recordar la preferencia entre sesiones.
  const [closeYouRadius, setCloseYouRadiusState] = useState(() => {
    try {
      const saved = parseFloat(
        window.localStorage.getItem("thiup:closeyou-radius")
      );
      if (Number.isFinite(saved)) {
        return Math.min(100, Math.max(15, saved));
      }
    } catch (err) {
      /* sin storage */
    }
    return 15;
  });
  const closeYouRadiusRef = useRef(closeYouRadius);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);
  // Paginación POST: el body del feed (lang/region/tags) se fija en el
  // fetch inicial y loadMore re-POSTea el MISMO body a ?page=N+1 (el
  // ?page= es corto y no sensible; los tags van siempre en el body).
  const feedBodyRef = useRef({});
  const feedEndpointRef = useRef(FORYOU_ENDPOINT);
  const pageRef = useRef(1);
  const hasNextPageRef = useRef(false);
  // Counter incremental: cada request del initial fetch obtiene un ID único.
  // Solo el request con el ID más alto (el más reciente) actualiza state y
  // apaga isLoading. Reemplaza el patrón `let cancelled = false`, que podía
  // dejar isLoading stuck en true si el último fetch también se cancelaba.
  const requestIdRef = useRef(0);
  // Firma de los top tags usados en el ÚLTIMO fetch. Si el perfil de
  // afinidad cambió mientras el usuario navegaba (interactuó en un thread),
  // ensureLoaded dispara una recarga dim al volver al home — así la
  // personalización se ve en la misma sesión, sin esperar un reload.
  const lastTagsSignatureRef = useRef(null);

  // Fetch initial — solo corre cuando hasInitialized se vuelve true.
  // Evita un fetch al cargar la app si el usuario nunca visita /home-new.
  useEffect(() => {
    if (!hasInitialized) return undefined;
    // Close You sin celdas → no hay nada que pedir todavía (el área del
    // feed muestra el gate de opt-in / denied en HomeNew). CLAVE: apagar
    // isLoading aquí — en la entrada FRÍA por URL (?tab=cy), ensureLoaded
    // acababa de encenderla (anti-flash del For You) y este return
    // temprano la dejaba atascada en true para siempre, congelando las
    // tabs (HomeFilterBar ignora clicks mientras isLoading) y el spinner.
    if (feedTab === "closeyou" && !closeYouCellRef.current) {
      setIsLoading(false);
      return undefined;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    async function fetchInitial() {
      setIsLoading(true);
      setError(null);
      setLoadMoreError(null);
      try {
        // POST con los params del feed en el BODY — PRIVACIDAD: los tags
        // revelan intereses y en GET quedaban en los access logs de
        // nginx/proxies (la URL se loggea; el body no). Se envían SOLO
        // los nombres de los top tags del perfil de afinidad — efímeros;
        // el mapa completo y sus pesos NUNCA salen del dispositivo (ver
        // src/utils/affinity.js). Sin tags (usuario nuevo) → body sin
        // tags → top global (cold start). lang/region vienen de
        // navigator.language, sin GeoIP. Sin `_t`: POST no se cachea.
        let endpoint;
        let body;
        if (feedTab === "closeyou") {
          // Close You: SOLO la celda del lector (efímera, de memoria) +
          // el radio elegido — sin tags ni región: es geográfico, no
          // personal. El backend expande el grid adaptativo.
          endpoint = CLOSEYOU_ENDPOINT;
          body = {
            geohash: closeYouCellRef.current,
            radius_km: closeYouRadiusRef.current,
          };
        } else {
          endpoint = FORYOU_ENDPOINT;
          const topTags = getTopTags(TOP_TAGS_COUNT);
          lastTagsSignatureRef.current = topTags.join(",");
          body = { lang: getLanguage() };
          if (topTags.length) body.tags = topTags;
          const country = getCountryCode();
          if (country) body.region = country;
        }
        feedEndpointRef.current = endpoint;
        feedBodyRef.current = body;
        pageRef.current = 1;

        const data = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        setPosts((data.results || []).map(mapBackendPostToFrontend));
        hasNextPageRef.current = Boolean(data.next);
        setHasMore(Boolean(data.next));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err && err.name === "AbortError") return;
        setError(err);
        setPosts([]);
        setHasMore(false);
        hasNextPageRef.current = false;
      } finally {
        // Solo el request más reciente apaga isLoading.
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }

    fetchInitial();
    return () => {
      controller.abort();
    };
  }, [hasInitialized, refetchKey, feedTab]);

  // Lazy init trigger — HomeNew lo llama al montar.
  // Idempotente: en montajes posteriores hasInitialized ya es true → no
  // refetch... SALVO que el perfil de afinidad haya cambiado desde el
  // último fetch (el usuario reaccionó/comentó/leyó en un thread): en ese
  // caso recarga con los tags frescos. Es una recarga DIM (hay posts
  // visibles → feedItemsReloading), no skeletons, y solo si de verdad
  // cambió la firma — volver al home sin interacciones nuevas no refetchea
  // (la restauración de scroll del back-nav queda intacta).
  // setIsLoading(true) sincrónico evita el flash de empty-state entre el
  // setHasInitialized y el commit del fetch effect.
  const ensureLoaded = useCallback(() => {
    if (hasInitialized) {
      // La firma de afinidad solo aplica al For You (Close You no usa tags).
      if (feedTab === "foryou") {
        const signature = getTopTags(TOP_TAGS_COUNT).join(",");
        if (signature !== lastTagsSignatureRef.current) {
          setRefetchKey((k) => k + 1);
        }
      }
      return;
    }
    setHasInitialized(true);
    setIsLoading(true);
  }, [hasInitialized, feedTab]);

  // Opt-in del lector: pedir ubicación, fuzzear + codificar a celdas
  // geohash GRUESAS (precisión 5) y consultar. Las coords se descartan
  // al instante; las celdas viven solo en memoria (efímeras). El ÚNICO
  // recuerdo persistente es el booleano de que el usuario optó
  // (fallback para navegadores sin Permissions API) — jamás la zona.
  const enableCloseYou = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCloseYouStatus("unsupported");
      return;
    }
    setCloseYouStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        closeYouCellRef.current = geohashForPosition(
          position.coords.latitude,
          position.coords.longitude
        );
        try {
          window.localStorage.setItem("thiup:closeyou-optin", "true");
        } catch (err) {
          /* sin storage: el opt-in no se recuerda, nada se rompe */
        }
        setCloseYouStatus("ready");
        setRefetchKey((k) => k + 1);
      },
      (geoError) => {
        // code 1 = PERMISSION_DENIED (bloqueado a nivel navegador →
        // instrucciones de ajustes). code 2/3 (sin señal / timeout) son
        // TRANSITORIOS → estado "error" con retry: mostrar "blocked"
        // ahí era engañoso.
        setCloseYouStatus(
          geoError && geoError.code === 1 ? "denied" : "error"
        );
      },
      { maximumAge: 300000, timeout: 10000 }
    );
  }, []);

  // "Try again" del estado de error/bloqueado: re-verifica el estado
  // REAL del permiso y actúa según corresponda:
  //   prompt  → getCurrentPosition REABRE el diálogo nativo del navegador
  //   granted → reintento directo (recupera timeouts / falta de señal)
  //   denied  → el navegador NO permite reabrir el diálogo: se queda en
  //             el estado con las instrucciones de ajustes
  //   sin Permissions API → intento directo (abre el diálogo si está
  //             sin decidir; si está bloqueado, el error lo captura)
  const retryCloseYou = useCallback(async () => {
    setCloseYouStatus("locating");
    const state = await queryGeolocationPermission();
    if (state === "denied") {
      setCloseYouStatus("denied");
      return;
    }
    enableCloseYou();
  }, [enableCloseYou]);

  // Cambia el radio del Close You: clamp 15-100, persiste el número y
  // recarga el feed (dim, sin parpadeo) si la tab está activa.
  const setCloseYouRadius = useCallback((km) => {
    const clamped = Math.min(100, Math.max(15, Number(km) || 15));
    closeYouRadiusRef.current = clamped;
    setCloseYouRadiusState(clamped);
    try {
      window.localStorage.setItem("thiup:closeyou-radius", String(clamped));
    } catch (err) {
      /* sin storage: no persiste, no rompe */
    }
    setRefetchKey((k) => k + 1);
  }, []);

  // Decide qué mostrar al entrar a Close You SIN celdas, consultando el
  // estado REAL del permiso (Permissions API — es estado del navegador,
  // no ubicación: no toca la privacidad):
  //   granted → ubicación directa, SIN re-mostrar el prompt (el bug)
  //   prompt  → opt-in explicativo (el navegador preguntará al activar)
  //   denied  → estado "bloqueado, actívalo en ajustes" (re-pedir es
  //             imposible a nivel navegador)
  // Sin Permissions API (Safari viejo) → si el usuario ya optó antes
  // (flag), intentar directo (si el permiso sigue concedido no
  // re-pregunta); si no, prompt.
  const resolveCloseYouEntry = useCallback(async () => {
    const state = await queryGeolocationPermission();

    if (state === "granted") {
      enableCloseYou();
      return;
    }
    if (state === "denied") {
      setCloseYouStatus("denied");
      return;
    }
    if (state === "prompt") {
      setCloseYouStatus("prompt");
      return;
    }

    // Fallback sin Permissions API.
    let optedBefore = false;
    try {
      optedBefore =
        window.localStorage.getItem("thiup:closeyou-optin") === "true";
    } catch (err) {
      optedBefore = false;
    }
    if (optedBefore) {
      enableCloseYou();
    } else {
      setCloseYouStatus("prompt");
    }
  }, [enableCloseYou]);

  // Permiso EN VIVO: si el usuario lo cambia en los ajustes del
  // navegador, el estado del Close You no se queda stale — conceder
  // estando en el gate bloqueado carga el feed; bloquear invalida las
  // celdas y muestra el gate correcto en la próxima entrada.
  const feedTabRef = useRef(feedTab);
  useEffect(() => {
    feedTabRef.current = feedTab;
  }, [feedTab]);
  const closeYouStatusRef = useRef(closeYouStatus);
  useEffect(() => {
    closeYouStatusRef.current = closeYouStatus;
  }, [closeYouStatus]);

  useEffect(() => {
    const unsubscribe = subscribeGeolocationPermission((state) => {
      const status = closeYouStatusRef.current;
      if (state === "granted") {
        if (status === "denied" || status === "unsupported") {
          if (feedTabRef.current === "closeyou") {
            // Estaba mirando el gate bloqueado: cargar directo.
            enableCloseYou();
          } else {
            setCloseYouStatus("idle");
          }
        }
      } else if (state === "denied") {
        closeYouCellRef.current = null;
        if (feedTabRef.current === "closeyou" && status !== "idle") {
          setCloseYouStatus("denied");
        }
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio de tab del home. Close You sin celdas → resolver primero el
  // estado real del permiso (sin re-mostrar prompts innecesarios). La
  // recarga entre tabs es DIM (posts visibles), mismo patrón del resto.
  const selectFeedTab = useCallback((tab) => {
    if (tab === feedTab) return;
    if (tab === "closeyou" && !closeYouCellRef.current) {
      setFeedTab("closeyou");
      setCloseYouStatus("locating");
      resolveCloseYouEntry();
      return;
    }
    setFeedTab(tab);
    setRefetchKey((k) => k + 1);
  }, [feedTab, resolveCloseYouEntry]);

  const loadMore = useCallback(async () => {
    if (!hasNextPageRef.current || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      // Siguiente página: re-POST del MISMO body del feed (lang/region/
      // tags congelados en el fetch inicial — la página N debe ser
      // coherente con la 1) a ?page=N+1.
      const nextPage = pageRef.current + 1;
      const data = await apiFetch(
        `${feedEndpointRef.current}?page=${nextPage}`,
        {
          method: "POST",
          body: JSON.stringify(feedBodyRef.current),
        }
      );
      pageRef.current = nextPage;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const additions = (data.results || [])
          .map(mapBackendPostToFrontend)
          .filter((p) => !seen.has(p.id));
        return [...prev, ...additions];
      });
      hasNextPageRef.current = Boolean(data.next);
      setHasMore(!!data.next);
      setLoadMoreError(null);
    } catch (err) {
      setLoadMoreError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading]);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const createPost = useCallback(async (text, { geohash } = {}) => {
    const trimmed = (text || "").trim();
    if (!trimmed) {
      throw new Error("Text cannot be empty");
    }

    const payload = {
      text: trimmed,
      content: buildDraftJsContent(trimmed),
      // El hilo queda etiquetado con el idioma/región de quien lo crea
      // (navigator.language): language alimenta el filtro de idioma del
      // For You; region el boost regional. Sin GeoIP.
      language: getLanguage(),
      region: getCountryCode(),
    };
    // geohash: SOLO si el autor activó compartir ubicación (opt-in).
    // Llega ya grueso (precisión 5) y fuzzeado desde HomeCompose.
    if (geohash) payload.geohash = geohash;

    const created = await apiFetch(POSTS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const mapped = mapBackendPostToFrontend(created);
    setPosts((prev) =>
      prev.some((p) => p.id === mapped.id) ? prev : [mapped, ...prev]
    );
    return mapped;
  }, []);

  const value = {
    posts,
    feedTab,
    selectFeedTab,
    closeYouStatus,
    enableCloseYou,
    retryCloseYou,
    closeYouRadius,
    setCloseYouRadius,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasMore,
    ensureLoaded,
    loadMore,
    refetch,
    createPost,
  };

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeedContext() {
  const ctx = useContext(FeedContext);
  if (!ctx) {
    throw new Error("useFeedContext must be used within a FeedProvider");
  }
  return ctx;
}
