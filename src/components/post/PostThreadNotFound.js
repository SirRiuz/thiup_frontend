import { useNavigate } from "react-router-dom";
import styles from "../../styles/components/post/PostThreadNotFound.module.css";

/**
 * 404 state for /post/:id — the thread doesn't exist (deleted or bad link).
 * Distinct from the network error state: retrying a missing thread is pointless,
 * so the only action is "Back to feed". Shows the searched id in a mono chip.
 *
 * Props:
 *   - threadId: id that wasn't found (optional — chip is omitted if absent)
 */
function PostThreadNotFound({ threadId }) {
  const navigate = useNavigate();

  // maskIds across the project are short hex; long ids (UUIDs) get truncated
  // to the first 6 chars for visual coherence.
  const shortId =
    threadId && threadId.length > 8 ? threadId.slice(0, 6) : threadId;

  return (
    <div className={styles.container} role="alert">
      <svg
        width="132"
        height="96"
        viewBox="0 0 132 96"
        fill="none"
        aria-hidden="true"
        className={styles.illustration}
      >
        <rect x="3" y="6" width="126" height="28" rx="7" stroke="#d5cfc0" strokeWidth="1.2" strokeDasharray="5 5" />
        <circle cx="19" cy="20" r="7" stroke="#d5cfc0" strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="34" y1="16" x2="80" y2="16" stroke="#d5cfc0" strokeWidth="1.2" strokeDasharray="5 5" strokeLinecap="round" />
        <line x1="34" y1="24" x2="64" y2="24" stroke="#d5cfc0" strokeWidth="1.2" strokeDasharray="5 5" strokeLinecap="round" />
        <rect x="27" y="54" width="102" height="26" rx="7" stroke="#e0dacb" strokeWidth="1.2" strokeDasharray="5 5" />
        <circle cx="42" cy="67" r="6" stroke="#e0dacb" strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="55" y1="63" x2="92" y2="63" stroke="#e0dacb" strokeWidth="1.2" strokeDasharray="5 5" strokeLinecap="round" />
        <line x1="55" y1="71" x2="76" y2="71" stroke="#e0dacb" strokeWidth="1.2" strokeDasharray="5 5" strokeLinecap="round" />
      </svg>

      <p className={styles.title}>Thread not found</p>

      <p className={styles.subtitle}>
        {shortId ? (
          <>
            We couldn&apos;t find <span className={styles.chip}>{shortId}</span> —
            it may have been removed.
          </>
        ) : (
          "This thread may have been removed."
        )}
      </p>

      <button
        type="button"
        className={styles.button}
        onClick={() => navigate("/home")}
      >
        Back to home
      </button>
    </div>
  );
}

export default PostThreadNotFound;
