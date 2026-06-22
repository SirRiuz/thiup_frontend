import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Document title central y por ruta, vía i18n.
 *
 * Cada pantalla declara su título con UNA llamada:
 *
 *   usePageTitle("pageTitle.search")                              → "Search · Thiup"
 *   usePageTitle("pageTitle.search",
 *     { prefix: query, prefixSeparator: "-", separator: "/" })   → "<query> - Search / Thiup" (estilo X)
 *   usePageTitle(null, { prefix: text, noindex })                → "<text> · Thiup"          (estilo Threads)
 *   usePageTitle("pageTitle.thread", { noindex })                → título + <meta noindex>
 *   usePageTitle()                                               → "Thiup" (home: solo marca)
 *
 * - Formato "<prefix> <prefixSeparator> <página> <separator> Thiup" (marca
 *   siempre al final). `separator` ("·" por defecto) va antes de la marca;
 *   `prefixSeparator` (= `separator` si se omite) separa el prefix de la página.
 *   El `prefix` es contenido dinámico (texto del hilo, query buscada): se SANEA
 *   — se colapsa el whitespace y se trunca a MAX_PREFIX — antes de entrar al
 *   título. Sin `prefix` queda "<página> <separator> Thiup".
 * - Se re-traduce EN VIVO al cambiar el idioma (☰ → Languages): la `t` de
 *   react-i18next cambia de referencia con el idioma activo y el efecto
 *   re-corre.
 * - Sin cleanup que "restaure" el título anterior: cada ruta setea el suyo al
 *   montar, así el título nunca se queda pegado al navegar.
 *
 * PRIVACIDAD: por decisión de producto el título de pestaña SÍ refleja el
 * contenido — /post/:id muestra el texto del hilo (estilo Threads) y /search
 * muestra la query (estilo X). Queda registrado en el historial/favoritos del
 * navegador y visible en la lista de pestañas; es el comportamiento deseado.
 * El share (OG/Twitter) sigue siendo la tarjeta de marca estática y estas
 * rutas siguen `noindex` (no se filtra a buscadores).
 *
 * NOINDEX por ruta: las pantallas privadas (/post, /search, /me) pasan
 * `{ noindex: true }` → se inyecta <meta name="robots" content="noindex,
 * nofollow"> mientras están montadas y se RETIRA al salir (la home vuelve a
 * ser indexable). Esto es defensa-en-profundidad sobre robots.txt: cubre a los
 * crawlers que SÍ ejecutan JS (p. ej. Googlebot). Los crawlers sin JS solo ven
 * el index.html estático de marca, y robots.txt ya les prohíbe estas rutas.
 */

const BRAND = "Thiup";
const ROBOTS_META_ID = "route-robots";
// Tope de longitud del prefix dinámico: un título de pestaña no debe ser un
// muro de texto. Se colapsa el whitespace y se añade "…" si se recorta.
const MAX_PREFIX = 70;

function formatPrefix(prefix) {
  if (!prefix) return "";
  const clean = String(prefix).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > MAX_PREFIX ? `${clean.slice(0, MAX_PREFIX).trimEnd()}…` : clean;
}

function setRouteRobots(noindex) {
  const head = document.head;
  let tag = document.getElementById(ROBOTS_META_ID);
  if (noindex) {
    if (!tag) {
      tag = document.createElement("meta");
      tag.id = ROBOTS_META_ID;
      tag.name = "robots";
      head.appendChild(tag);
    }
    tag.content = "noindex, nofollow";
  } else if (tag) {
    // Ruta indexable (home): quitar cualquier noindex que dejara una ruta
    // privada previa.
    tag.remove();
  }
}

export default function usePageTitle(
  titleKey,
  { noindex = false, prefix = "", separator = "·", prefixSeparator } = {}
) {
  const { t } = useTranslation();

  useEffect(() => {
    // `prefixSeparator` separa el prefix dinámico de la página (p. ej. "-" en
    // "<query> - Search"); `separator` separa siempre de la marca ("/ Thiup").
    // Por defecto ambos son el mismo carácter.
    const beforeBrand = prefixSeparator ?? separator;
    const parts = [];
    const cleanPrefix = formatPrefix(prefix);
    if (cleanPrefix) parts.push(cleanPrefix);
    if (titleKey) parts.push(t(titleKey));
    const content = parts.join(` ${beforeBrand} `);
    document.title = content ? `${content} ${separator} ${BRAND}` : BRAND;
  }, [titleKey, t, prefix, separator, prefixSeparator]);

  useEffect(() => {
    setRouteRobots(noindex);
    return () => setRouteRobots(false);
  }, [noindex]);
}
