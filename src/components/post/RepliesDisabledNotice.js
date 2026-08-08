import { useTranslation } from "react-i18next";
import styles from "../../styles/components/post/RepliesDisabledNotice.module.css";

/* The app's own Reply glyph (Post.js's opActions button, message-circle),
   crossed out — Feather's "-off" convention (e.g. mic-off): same base icon
   + a diagonal strike, so it reads instantly as "the reply action, off"
   instead of an unrelated shape. */
const ReplyOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <line x1="4" y1="20" x2="20" y2="4" />
  </svg>
);

/**
 * Replaces PostCommentBox in the composer dock when the thread owner has
 * turned replies off (post.repliesDisabled) — an informational "how this
 * thread is configured" note, NOT an error/wait, so it borrows the app's
 * "tactful note" anatomy (ErrorNotice/RateLimitNotice: 40px dial + title +
 * detail) but in the QUIET neutral palette instead of danger/warm — this is
 * not something that went wrong. Reuses PostCommentBox's own `.wrapper` (the
 * desktop-inline / mobile-fixed-band dock) so the notice sits in the EXACT
 * same slot the reply box would occupy — same divider, same bottom-nav-glued
 * placement on mobile — with no positioning code duplicated.
 */
function RepliesDisabledNotice() {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper}>
      <div className={styles.notice}>
        <span className={styles.dial} aria-hidden="true">
          <ReplyOffIcon />
        </span>
        <div className={styles.text}>
          <p className={styles.title}>{t("post.repliesDisabledTitle")}</p>
          <p className={styles.detail}>{t("post.repliesDisabledNotice")}</p>
        </div>
      </div>
    </div>
  );
}

export default RepliesDisabledNotice;
