import { createContext } from "react";

/**
 * Playback scope for inline videos (see services/media/playbackArbiter).
 *
 * `null` (the default) is the base page. An overlay that shows its own inline
 * videos while the page is still mounted behind it (the reply dialog's parent
 * preview) provides its scope id here AND activates the same id on the
 * arbiter: videos register their candidacy tagged with the scope they render
 * in, and only candidates of the ACTIVE scope are eligible to play — so the
 * page's videos pause while the overlay is up, and the overlay's own videos
 * can autoplay, without the two ever competing.
 */
const PlaybackScopeContext = createContext(null);

export default PlaybackScopeContext;
