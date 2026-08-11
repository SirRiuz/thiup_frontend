// Thin wrapper around useMediaComposer (untouched, still shared by both
// creation composers) that adds awareness of ALREADY-persisted remote media
// (the post's current attachments) for the edit form. useMediaComposer only
// knows about local File objects being uploaded; this hook layers a second,
// independent piece of state — existingItems — on top, so an edit can mix
// "remove one of the current images" with "attach a brand new one" in the
// same save without touching the base hook (still risk-free for create).

import { useCallback, useMemo, useRef, useState } from "react";

export default function useEditMediaComposer(initialMedia, base) {
  const [existingItems, setExistingItems] = useState(() =>
    (initialMedia || []).map((m) => ({ ...m, removed: false }))
  );

  // Snapshot of each file's PUBLISHED spoiler flag, captured once at mount —
  // the diff base for hasSpoilerChanges/spoilerChanges below. A ref (not
  // state): it must never change once the form opens, only existingItems
  // moves as the user toggles things.
  const initialSpoilerRef = useRef(
    new Map((initialMedia || []).map((m) => [m.id, m.isSpoiler ?? false]))
  );

  const removeExisting = useCallback((id) => {
    setExistingItems((items) =>
      items.map((i) => (i.id === id ? { ...i, removed: true } : i))
    );
  }, []);

  const restoreExisting = useCallback((id) => {
    setExistingItems((items) =>
      items.map((i) => (i.id === id ? { ...i, removed: false } : i))
    );
  }, []);

  // Local-only setter for the spoiler flag — SAME pattern as remove/restore:
  // a draft in existingItems, only persisted (via the dedicated
  // /thread-files/spoiler/ endpoint) when the form is actually saved. It
  // used to fire the API call live, independent of Save — but that meant
  // toggling spoiler alone never enabled the Save button (hasChanges never
  // saw it) and the change had no visible "pending" state of its own.
  const setExistingItemSpoiler = useCallback((id, isSpoiler) => {
    setExistingItems((items) =>
      items.map((i) => (i.id === id ? { ...i, isSpoiler } : i))
    );
  }, []);

  const removedExistingIds = useMemo(
    () => existingItems.filter((i) => i.removed).map((i) => i.id),
    [existingItems]
  );
  const hasRemovals = removedExistingIds.length > 0;
  const hasPendingUploads = base.items.length > 0;

  // Files whose CURRENT draft isSpoiler differs from what was published —
  // what handleSubmit actually sends to /thread-files/spoiler/, and what
  // feeds hasChanges so the Save button reacts to a spoiler-only edit.
  const spoilerChanges = useMemo(
    () =>
      existingItems
        .filter((i) => i.isSpoiler !== initialSpoilerRef.current.get(i.id))
        .map((i) => ({ id: i.id, isSpoiler: i.isSpoiler })),
    [existingItems]
  );
  const hasSpoilerChanges = spoilerChanges.length > 0;

  return {
    ...base, // items, addFiles, removeItem, retryUpload, uploadsById, pending, ...
    existingItems,
    removedExistingIds,
    hasRemovals,
    hasPendingUploads,
    removeExisting,
    restoreExisting,
    setExistingItemSpoiler,
    spoilerChanges,
    hasSpoilerChanges,
    // Alias for clarity at the edit-submit call site (confirms NEW uploads
    // only — existing media never goes through confirm again).
    confirmNewTo: base.confirmTo,
  };
}
