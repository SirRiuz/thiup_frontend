// Manages a queue of files analyzed SEQUENTIALLY by the client-side NSFW model
// (the model doesn't handle simultaneous classifications well). Each item
// carries its own status so the UI can show "queued → analyzing → done/error".

import { useCallback, useEffect, useRef, useState } from "react";
import { loadNsfwModel } from "../services/nsfw/nsfwModel";
import {
  analyzeImage,
  analyzeVideo,
  isImageFile,
  isVideoFile,
} from "../services/nsfw/nsfwAnalyzer";

let idSeq = 0;

// item: {
//   id, file, name, size, kind: "image" | "video",
//   status: "queued" | "analyzing" | "done" | "error",
//   frame: { current, total } | null,         // video progress
//   result: { verdict, score, explicit, sexy, categories, thumbnail } | null,
//   error: { code } | null,                    // "model" | "hevc" | "decode" | "analyze"
//   thumbnail: string | null,                  // local preview (blob:) for images
// }
export default function useNsfwScan() {
  const [items, setItems] = useState([]);
  const [modelLoading, setModelLoading] = useState(false);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const processingRef = useRef(false);
  const modelRef = useRef(null);

  const patchItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, ...(typeof patch === "function" ? patch(it) : patch) }
          : it
      )
    );
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      // Drain the queue one item at a time (re-read the ref each loop so files
      // added mid-run are picked up).
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const next = itemsRef.current.find((it) => it.status === "queued");
        if (!next) break;

        if (!modelRef.current) {
          setModelLoading(true);
          try {
            // eslint-disable-next-line no-await-in-loop
            modelRef.current = await loadNsfwModel();
          } catch (err) {
            setModelLoading(false);
            // Fail every queued item with a model error (retry on next add).
            setItems((prev) =>
              prev.map((it) =>
                it.status === "queued"
                  ? { ...it, status: "error", error: { code: "model" }, frame: null }
                  : it
              )
            );
            break;
          }
          setModelLoading(false);
        }

        const model = modelRef.current;
        patchItem(next.id, { status: "analyzing", frame: null });
        try {
          let result;
          if (next.kind === "video") {
            // eslint-disable-next-line no-await-in-loop
            result = await analyzeVideo(next.file, model, {
              onFrame: (current, frameTotal) =>
                patchItem(next.id, { frame: { current, total: frameTotal } }),
            });
          } else {
            // eslint-disable-next-line no-await-in-loop
            result = await analyzeImage(next.file, model);
          }
          patchItem(next.id, (it) => ({
            status: "done",
            result,
            frame: null,
            // Keep the image's blob preview; use the worst frame for videos.
            thumbnail:
              it.kind === "video" ? result.thumbnail || it.thumbnail : it.thumbnail,
          }));
        } catch (err) {
          patchItem(next.id, {
            status: "error",
            frame: null,
            error: { code: err && err.code ? err.code : "analyze" },
          });
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [patchItem]);

  // Kick the queue whenever something is waiting.
  useEffect(() => {
    if (items.some((it) => it.status === "queued")) processQueue();
  }, [items, processQueue]);

  // Accepts an array of File objects (already validated by the caller for size
  // and count). Returns the count actually queued.
  const addFiles = useCallback((files) => {
    const added = [];
    Array.from(files || []).forEach((file) => {
      const image = isImageFile(file);
      const video = isVideoFile(file);
      if (!image && !video) return;
      added.push({
        id: `scan-${(idSeq += 1)}`,
        file,
        name: file.name,
        size: file.size,
        kind: video ? "video" : "image",
        status: "queued",
        frame: null,
        result: null,
        error: null,
        thumbnail: image ? URL.createObjectURL(file) : null,
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

  const pending = items.filter(
    (it) => it.status === "queued" || it.status === "analyzing"
  ).length;

  return { items, addFiles, removeItem, clear, modelLoading, pending };
}
