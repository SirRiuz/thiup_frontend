import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { getLanguage } from "../utils/locale";
import en from "./locales/en.json";
import es from "./locales/es.json";

/**
 * UI i18n (interface texts only; thread content is NOT
 * translated and is independent of the For You language filter).
 *
 * Pattern: i18next + react-i18next with per-language resources in JSON. The
 * components consume `useTranslation()` → `t("nested.key")`.
 *
 *  - Default language = the OS's (navigator.language via getLanguage()),
 *    with a configurable FALLBACK if the OS language is not supported.
 *  - The user's choice PERSISTS in localStorage and applies live.
 *  - Extensible system: adding a language = adding its JSON to `resources` and
 *    its code to SUPPORTED_LANGUAGES.
 */

// Supported languages (order = order of appearance in the selector).
export const SUPPORTED_LANGUAGES = ["en", "es"];

// Fallback language when the OS's is not among the supported ones.
export const FALLBACK_LANGUAGE = "en";

// Persistence key for the user's preference.
export const LANGUAGE_STORAGE_KEY = "thiup:lang";

const resources = {
  en: { translation: en },
  es: { translation: es },
};

/** Normalizes a language code to a supported one, or null if it doesn't fit. */
function normalizeLanguage(lang) {
  const base = (lang || "").split("-")[0].trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(base) ? base : null;
}

/** Reads the stored preference (or null if there is none / it's invalid). */
function getStoredLanguage() {
  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Initial language: the stored preference if it exists; otherwise the OS's
 * (getLanguage()); if that doesn't fit either, the fallback.
 */
export function resolveInitialLanguage() {
  return getStoredLanguage() || normalizeLanguage(getLanguage()) || FALLBACK_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: {
    // React already escapes by default.
    escapeValue: false,
  },
  react: {
    // The resources are bundled (synchronous load): no Suspense is needed
    // and the app doesn't mount a <Suspense> around the tree.
    useSuspense: false,
  },
});

/** Changes the language LIVE and persists the choice. */
export function setLanguage(lang) {
  const normalized = normalizeLanguage(lang) || FALLBACK_LANGUAGE;
  i18n.changeLanguage(normalized);
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // localStorage unavailable (private mode, etc.): the live change
    // still applies, it just doesn't persist.
  }
}

export default i18n;
