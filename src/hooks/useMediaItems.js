// Holds the list of media the user attached to a composer. Pure selection state
// — NO client-side analysis (the NSFW model was removed: it crashed iOS with
// heavy files and is being moved to a server-side service). Each item just
// carries its file + a local preview; images are compressed and everything is
// uploaded as-is. See useMediaComposer for the upload wiring.

import { useCallback, useEffect, useRef, useState } from "react";
import { isImageFile, isVideoFile } from "../services/media/allowedFormats";

let idSeq = 0;

// item: { id, file, name, size, kind: "image" | "video", thumbnail: string|null,
//         isSpoiler: boolean }
// (thumbnail is a local blob: URL for BOTH kinds — images render it in an
// <img>; videos paint their first frame from it via a muted <video>.
// isSpoiler is the deliberate, user-toggled flag from the tile's 3-dot menu —
// separate from any automatic NSFW detection — carried through to confirm.)
export default function useMediaItems() {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Accepts an array of File objects (already validated for size/count/type by
  // the caller). Returns the count actually added.
  const addFiles = useCallback((files) => {
    const added = [];
    Array.from(files || []).forEach((file) => {
      const image = isImageFile(file);
      const video = isVideoFile(file);
      if (!image && !video) return;
      added.push({
        id: `media-${(idSeq += 1)}`,
        file,
        name: file.name,
        size: file.size,
        kind: video ? "video" : "image",
        thumbnail: URL.createObjectURL(file),
        isSpoiler: false,
      });
    });
    if (added.length) setItems((prev) => [...prev, ...added]);
    return added.length;
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it && it.thumbnail && it.thumbnail.startsWith("blob:")) {
        URL.revokeObjectURL(it.thumbnail);
      }
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  // Flips the deliberate spoiler flag for a pending attachment — read at
  // confirm time (see useMediaComposer/useMediaUploads), so toggling it any
  // time before Send is reflected in the confirm payload.
  const toggleSpoiler = useCallback((id) => {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, isSpoiler: !x.isSpoiler } : x))
    );
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => {
        if (it.thumbnail && it.thumbnail.startsWith("blob:")) {
          URL.revokeObjectURL(it.thumbnail);
        }
      });
      return [];
    });
  }, []);

  // Revoke any leftover blob previews on unmount.
  useEffect(
    () => () => {
      itemsRef.current.forEach((it) => {
        if (it.thumbnail && it.thumbnail.startsWith("blob:")) {
          URL.revokeObjectURL(it.thumbnail);
        }
      });
    },
    []
  );

  return { items, addFiles, removeItem, toggleSpoiler, clear };
}
