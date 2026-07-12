import { useId } from "react";
import styles from "../../styles/components/post/ReactionEmoji.module.css";
import cx from "../../utils/cx";

/**
 * ReactionEmoji — Thiup's OWN reaction set, drawn as inline SVG so it renders
 * identically on every device (native emoji vary wildly per platform and broke
 * the design). Facebook's reactions are the INSPIRATION (round expressive
 * faces, looping animations in the picker), but the design is original and on
 * brand: warm golden faces with hand-drawn brown features on the warm paper
 * palette, and a TERRACOTTA heart (the brand accent, not FB red).
 *
 * The set mirrors the 6 backend reactions (see PostReactionPicker.REACTIONS —
 * the `label`/name is the stable API value; the native emoji char remains the
 * in-app data identity). This component is PRESENTATION ONLY: give it a
 * reaction `name` (love/laugh/wow/sad/angry/applause) or the legacy `emoji`
 * char and it draws the matching face.
 *
 * `animated` runs the FB-style loop (used in the picker popover); everywhere
 * else the faces are static. Reduced motion disables all loops via CSS.
 * Unknown reactions fall back to the raw char so new backend reactions never
 * break the UI.
 */

// Legacy native-emoji chars → reaction name (the chars are the identity that
// travels through state/optimistic updates; normalize the variation selector).
const EMOJI_TO_NAME = {
  "❤️": "love",
  "❤": "love",
  "😂": "laugh",
  "😮": "wow",
  "😢": "sad",
  "😡": "angry",
  "👏": "applause",
};

// Shared palette (warm, on-brand — never platform yellow-on-blue).
const FACE_EDGE = "#f0a830"; // face rim
const INK = "#5b3a1d"; // features: deep warm brown, not black
const TEAR = "#7fb3e0"; // soft warm-sky blue
const HEART_HI = "#f7e6d8"; // cream highlight on the heart

function Face({ uid, children, from = "#ffe08a", to = "#f6b73c" }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-face`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </radialGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="14"
        fill={`url(#${uid}-face)`}
        stroke={FACE_EDGE}
        strokeWidth="1"
      />
      {children}
    </>
  );
}

function LoveGlyph({ uid }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-love`} cx="35%" cy="30%" r="90%">
          <stop offset="0%" stopColor="#e26a4a" />
          <stop offset="100%" stopColor="#b8432c" />
        </radialGradient>
      </defs>
      <g className={styles.heart}>
        <path
          d="M16 27.2 C 8.9 22.4 4.8 18 4.8 13.1 C 4.8 9.6 7.4 7 10.6 7 C 12.8 7 14.8 8.2 16 10 C 17.2 8.2 19.2 7 21.4 7 C 24.6 7 27.2 9.6 27.2 13.1 C 27.2 18 23.1 22.4 16 27.2 Z"
          fill={`url(#${uid}-love)`}
        />
        <ellipse
          cx="11.2"
          cy="11.6"
          rx="2.5"
          ry="1.5"
          fill={HEART_HI}
          opacity="0.55"
          transform="rotate(-28 11.2 11.6)"
        />
      </g>
    </>
  );
}

function LaughGlyph({ uid }) {
  return (
    <Face uid={uid}>
      <g className={styles.laughFace}>
        {/* Happy closed eyes — thick ∩ arches, clearly mid-laugh (no tears:
            they read as scared at small sizes). */}
        <path
          d="M8 13.6 Q 10.6 10 13.2 13.6"
          fill="none"
          stroke={INK}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M18.8 13.6 Q 21.4 10 24 13.6"
          fill="none"
          stroke={INK}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Big open laugh with a warm tongue. */}
        <path d="M8.2 17.6 Q 16 27.4 23.8 17.6 Z" fill={INK} />
        <path
          d="M11.2 21.4 Q 16 25.2 20.8 21.4 Q 16 27 11.2 21.4 Z"
          fill="#e0674f"
        />
      </g>
    </Face>
  );
}

function WowGlyph({ uid }) {
  return (
    <Face uid={uid}>
      {/* Lifted round brows. */}
      <g className={styles.wowBrows}>
        <path
          d="M8.6 10.4 Q 10.8 8.2 13 10.1"
          fill="none"
          stroke={INK}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M19 10.1 Q 21.2 8.2 23.4 10.4"
          fill="none"
          stroke={INK}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </g>
      {/* Wide oval eyes. */}
      <ellipse cx="10.9" cy="14.4" rx="1.7" ry="2.4" fill={INK} />
      <ellipse cx="21.1" cy="14.4" rx="1.7" ry="2.4" fill={INK} />
      {/* The astonished "O". */}
      <ellipse className={styles.wowMouth} cx="16" cy="22.4" rx="3.4" ry="4.1" fill={INK} />
    </Face>
  );
}

function SadGlyph({ uid }) {
  return (
    <Face uid={uid}>
      <g className={styles.sadFace}>
        {/* WORRY brows: the INNER ends lift toward the center (the previous
            inward-falling slant read as anger). */}
        <path
          d="M8.6 12.9 Q 10.6 12.7 12.6 10.9"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M19.4 10.9 Q 21.4 12.7 23.4 12.9"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Soft downcast eyes, sitting a touch lower. */}
        <ellipse cx="11.2" cy="16.2" rx="1.4" ry="1.9" fill={INK} />
        <ellipse cx="20.8" cy="16.2" rx="1.4" ry="1.9" fill={INK} />
        {/* Gentle pout. */}
        <path
          d="M11.6 24 Q 16 20.8 20.4 24"
          fill="none"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      {/* The tear that rolls down (animated). */}
      <path
        className={styles.sadTear}
        d="M11.2 18.2 C 9.9 20.2 9.3 21.5 10.1 22.7 C 10.9 23.9 12.8 23.7 13.3 22.3 C 13.8 21 12.8 19.5 11.2 18.2 Z"
        fill={TEAR}
      />
    </Face>
  );
}

function AngryGlyph({ uid }) {
  return (
    <g className={styles.angryFace}>
      <Face uid={uid} from="#f6a13f" to="#dd5b33">
        {/* Rage flush: a deep-red wash that RISES from the chin while the face
            presses down (FB's boiling-anger loop), fading out on release. */}
        <defs>
          <linearGradient id={`${uid}-flush`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c9401f" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#c9401f" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c9401f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          className={styles.angryFlush}
          cx="16"
          cy="16"
          r="14"
          fill={`url(#${uid}-flush)`}
        />
        {/* Furrowed brows slamming inward. */}
        <path
          d="M8.4 12.6 L 13.2 14.2"
          stroke={INK}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M23.6 12.6 L 18.8 14.2"
          stroke={INK}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* Hard little eyes under the brows. */}
        <circle cx="11.4" cy="16.8" r="1.5" fill={INK} />
        <circle cx="20.6" cy="16.8" r="1.5" fill={INK} />
        {/* Pressed frown. */}
        <path
          d="M11.4 23.4 Q 16 21.2 20.6 23.4"
          fill="none"
          stroke={INK}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </Face>
    </g>
  );
}

function ApplauseGlyph({ uid }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-hand`} cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f0a830" />
        </radialGradient>
      </defs>
      {/* Impact sparks (pop on each clap). */}
      <g className={styles.sparks} stroke="#a85432" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16 6.2 v-2.4" />
        <path d="M10.6 8 l-1.7 -1.7" />
        <path d="M21.4 8 l1.7 -1.7" />
      </g>
      {/* Two REAL hands meeting at the center: a palm whose top edge is
          scalloped into three fingertips, finger separation grooves, and a
          thumb hugging the inner edge. Drawn upright, tilted toward each
          other via a nested static rotation (the outer group carries the clap
          animation, whose CSS transform would override an attribute one). */}
      <g className={styles.handLeft}>
        <g transform="rotate(14 10.5 18)">
          {/* Palm + fingers in ONE silhouette: up the outer edge, three
              fingertip bumps across the top, down the inner edge. */}
          <path
            d="M7.2 25.5 C 5.9 23.9 5.6 21.4 5.9 19 L 6.5 12.4 C 6.6 11.3 8.2 11.1 8.5 12.2 L 8.9 14.2 L 9.3 10.4 C 9.4 9.2 11.1 9.1 11.3 10.3 L 11.7 13.8 L 12.5 10.9 C 12.8 9.8 14.4 10 14.4 11.2 L 14.3 15.4 L 14.9 17 C 15.5 19.9 15.2 22.9 13.6 25.1 Z"
            fill={`url(#${uid}-hand)`}
            stroke={FACE_EDGE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Finger grooves. */}
          <path d="M8.9 14.6 L 9 17" fill="none" stroke={FACE_EDGE} strokeWidth="0.9" strokeLinecap="round" />
          <path d="M11.7 14.2 L 11.7 17" fill="none" stroke={FACE_EDGE} strokeWidth="0.9" strokeLinecap="round" />
          {/* Thumb across the inner edge. */}
          <path
            d="M14 24.4 C 15.9 23.3 16.7 21.2 16.2 18.6 C 16 17.5 14.6 17.5 14.3 18.6 Z"
            fill={`url(#${uid}-hand)`}
            stroke={FACE_EDGE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>
      </g>
      <g className={styles.handRight}>
        <g transform="rotate(-14 21.5 18)">
          <path
            d="M24.8 25.5 C 26.1 23.9 26.4 21.4 26.1 19 L 25.5 12.4 C 25.4 11.3 23.8 11.1 23.5 12.2 L 23.1 14.2 L 22.7 10.4 C 22.6 9.2 20.9 9.1 20.7 10.3 L 20.3 13.8 L 19.5 10.9 C 19.2 9.8 17.6 10 17.6 11.2 L 17.7 15.4 L 17.1 17 C 16.5 19.9 16.8 22.9 18.4 25.1 Z"
            fill={`url(#${uid}-hand)`}
            stroke={FACE_EDGE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d="M23.1 14.6 L 23 17" fill="none" stroke={FACE_EDGE} strokeWidth="0.9" strokeLinecap="round" />
          <path d="M20.3 14.2 L 20.3 17" fill="none" stroke={FACE_EDGE} strokeWidth="0.9" strokeLinecap="round" />
          <path
            d="M18 24.4 C 16.1 23.3 15.3 21.2 15.8 18.6 C 16 17.5 17.4 17.5 17.7 18.6 Z"
            fill={`url(#${uid}-hand)`}
            stroke={FACE_EDGE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </>
  );
}

const GLYPHS = {
  love: LoveGlyph,
  laugh: LaughGlyph,
  wow: WowGlyph,
  sad: SadGlyph,
  angry: AngryGlyph,
  applause: ApplauseGlyph,
};

export function reactionNameFromEmoji(emoji) {
  if (!emoji) return null;
  return EMOJI_TO_NAME[emoji] || EMOJI_TO_NAME[emoji.replace(/️/g, "")] || null;
}

function ReactionEmoji({ name, emoji, size = 20, animated = false, className = "" }) {
  // Sanitize useId for url(#...) references (colons break the CSS url syntax).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const resolved = name || reactionNameFromEmoji(emoji);
  const Glyph = resolved ? GLYPHS[resolved] : null;

  // Unknown reaction (e.g. a new backend one): fall back to the raw char so
  // nothing ever renders empty.
  if (!Glyph) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">
        {emoji || null}
      </span>
    );
  }

  return (
    <svg
      className={cx(styles.root, animated ? styles.animated : "", className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <Glyph uid={uid} />
    </svg>
  );
}

export default ReactionEmoji;
