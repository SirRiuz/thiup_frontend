import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Document title central y por ruta, vía i18n.
 *
 * Cada pantalla declara su título con UNA llamada:
 *
 *   usePageTitle("pageTitle.search")              → "Search · Thiup"
 *   usePageTitle("pageTitle.thread", { noindex }) → título + <meta noindex>
 *   usePageTitle()                                → "Thiup" (home: solo marca)
 *
 * - Formato consistente "<página> · Thiup" (marca al final).
 * - Se re-traduce EN VIVO al cambiar el idioma (☰ → Languages): la `t` de
 *   react-i18next cambia de referencia con el idioma activo y el efecto
 *   re-corre.
 * - Sin cleanup que "restaure" el título anterior: cada ruta setea el suyo al
 *   montar, así el título nunca se queda pegado al navegar.
 *
 * PRIVACIDAD (app anónima, temas sensibles): el título de la pestaña queda en
 * el historial y favoritos del navegador, y se ve por encima del hombro. Por
 * eso las pantallas de contenido usan títulos GENÉRICOS: /post/:id es
 * "Hilo · Thiup" (jamás el contenido del hilo ni la máscara del autor) y
 * /search es "Buscar · Thiup" SIN la query (ponerla es posible pero
 * desaconsejado: quedaría registrada en el historial).
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

export default function usePageTitle(titleKey, { noindex = false } = {}) {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = titleKey ? `${t(titleKey)} · ${BRAND}` : BRAND;
  }, [titleKey, t]);

  useEffect(() => {
    setRouteRobots(noindex);
    return () => setRouteRobots(false);
  }, [noindex]);
}
