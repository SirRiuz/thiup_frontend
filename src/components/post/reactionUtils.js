/**
 * Toggle / switch a user's reaction in a reactions array (immutable).
 *
 * Model: a user can have AT MOST one active reaction at a time
 * (Facebook / Twitter / LinkedIn style). The invariant is that no more than
 * one entry in the returned array has `userReacted === true`.
 *
 * Cases:
 *   1. User has no previous reaction + clicks X
 *      - if X exists: count + 1, userReacted = true.
 *      - if X is new: append { ...X, count: 1, userReacted: true }.
 *
 *   2. User already reacted with X + clicks X (same emoji)
 *      - count - 1, userReacted = false.
 *      - if count reaches 0, remove the entry entirely.
 *
 *   3. User already reacted with X + clicks Y (different emoji) — ATOMIC switch
 *      a) Decrement X: count - 1, userReacted = false. Remove if count hits 0.
 *      b) Apply Y on top of that intermediate state:
 *         - if Y exists: count + 1, userReacted = true.
 *         - if Y is new: append.
 *      The caller never observes a state where the user has zero reactions
 *      because both halves happen in a single returned array.
 *
 * @param {Array} reactions  Current reactions
 * @param {Object} clicked   { id, emoji, label } the user just clicked
 * @returns {Array}          A new array; the input is never mutated.
 */
export function toggleReaction(reactions, clicked) {
  const previousActive = reactions.find((r) => r.userReacted);
  const isSameAsPrevious =
    previousActive && previousActive.emoji === clicked.emoji;

  // CASE 2: clicking the same reaction already owned → toggle off.
  if (isSameAsPrevious) {
    return reactions
      .map((r) => {
        if (r.emoji !== clicked.emoji) return r;
        return { ...r, count: r.count - 1, userReacted: false };
      })
      .filter((r) => r.count > 0);
  }

  // CASE 3: switching from a previous reaction to a different one — atomic.
  if (previousActive) {
    const afterDecrement = reactions
      .map((r) => {
        if (r.emoji !== previousActive.emoji) return r;
        return { ...r, count: r.count - 1, userReacted: false };
      })
      .filter((r) => r.count > 0);

    const clickedExistsAfterDecrement = afterDecrement.some(
      (r) => r.emoji === clicked.emoji
    );

    if (clickedExistsAfterDecrement) {
      return afterDecrement.map((r) => {
        if (r.emoji !== clicked.emoji) return r;
        return { ...r, count: r.count + 1, userReacted: true };
      });
    }

    return [
      ...afterDecrement,
      {
        id: clicked.id,
        emoji: clicked.emoji,
        label: clicked.label,
        count: 1,
        userReacted: true,
      },
    ];
  }

  // CASE 1: no previous reaction → just add or increment the clicked one.
  const clickedExists = reactions.some((r) => r.emoji === clicked.emoji);

  if (clickedExists) {
    return reactions.map((r) => {
      if (r.emoji !== clicked.emoji) return r;
      return { ...r, count: r.count + 1, userReacted: true };
    });
  }

  return [
    ...reactions,
    {
      id: clicked.id,
      emoji: clicked.emoji,
      label: clicked.label,
      count: 1,
      userReacted: true,
    },
  ];
}
