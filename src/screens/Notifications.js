import { useTranslation } from "react-i18next";
import usePageTitle from "../hooks/usePageTitle";
import styles from "../styles/screens/Notifications.module.css";

/**
 * Notifications — destination of the sidebar heart (Threads' Notifications
 * slot). The backend has no activity feed yet, so this is an honest empty
 * state in the app's warm language; the screen exists so the nav item has a
 * real, routable home (active state, back/forward, deep links) from day one.
 * Private surface: noindex, like /search and /me.
 */
function Notifications() {
  const { t } = useTranslation();
  usePageTitle("pageTitle.notifications", { noindex: true });

  return (
    <div className={styles.main}>
      <h1 className={styles.srOnly}>{t("notifications.title")}</h1>
      <div className={styles.empty}>
        <span className={styles.iconWrap} aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </span>
        <p className={styles.title}>{t("notifications.emptyTitle")}</p>
        <p className={styles.subtitle}>{t("notifications.emptyBody")}</p>
      </div>
    </div>
  );
}

export default Notifications;
