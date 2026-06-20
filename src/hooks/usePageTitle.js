import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Document title central y por ruta, vía i18n.
 *
 * Cada pantalla declara su título con UNA llamada:
 *
 *   usePageTitle("pageTitle.search")  → "Buscar · Thiup" / "Search · Thiup"
 *   usePageTitle()                    → "Thiup" (home: solo la marca)
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
 */

const BRAND = "Thiup";

export default function usePageTitle(titleKey) {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = titleKey ? `${t(titleKey)} · ${BRAND}` : BRAND;
  }, [titleKey, t]);
}
