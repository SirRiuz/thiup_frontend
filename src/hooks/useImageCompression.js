// Compresses selected images SEQUENTIALLY (one at a time) in the browser,
// logging a before/after summary per image to the DevTools console and exposing
// the result (compressed WebP File + report) so the UI can show a before/after
// comparison. The compressed Files are metadata-stripped and ready to upload
// once a backend flow exists. Videos are ignored in this iteration.

import { useCallback, useRef, useState } from "react";
import { compressImage } from "../services/imageCompression/imageCompressor";

let idSeq = 0;

// result item: {
//   id, name, sourceFile (original File — used to pair with its row),
//   status: "queued" | "compressing" | "done" | "error",
//   file (compressed File, ready to upload) | null,
//   report | null,
// }
export default function useImageCompression() {
  const [results, setResults] = useState([]);
  const queueRef = useRef([]);
  const workingRef = useRef(false);

  const patch = useCallback((id, fields) => {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
  }, []);

  const pump = useCallback(async () => {
    if (workingRef.current) return;
    workingRef.current = true;
    try {
      while (queueRef.current.length) {
        const job = queueRef.current.shift();
        patch(job.id, { status: "compressing" });
        try {
          // eslint-disable-next-line no-await-in-loop
          const { outputFile, report } = await compressImage(job.file);
          // The combined per-file log (compression + NSFW) is emitted by the
          // consumer once BOTH finish — see PostCommentBox.
          patch(job.id, { status: "done", file: outputFile, report });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Image compression failed:", job.name, err);
          patch(job.id, { status: "error" });
        }
      }
    } finally {
      workingRef.current = false;
    }
  }, [patch]);

  // Accepts an array/FileList; only image/* files are compressed (videos are
  // skipped this iteration). Returns the count queued.
  const compress = useCallback(
    (files) => {
      const jobs = Array.from(files || [])
        .filter((f) => f && f.type && f.type.startsWith("image/"))
        .map((f) => ({ id: `cmp-${(idSeq += 1)}`, file: f, name: f.name }));
      if (!jobs.length) return 0;
      setResults((prev) => [
        ...prev,
        ...jobs.map((j) => ({
          id: j.id,
          name: j.name,
          sourceFile: j.file,
          status: "queued",
          file: null,
          report: null,
        })),
      ]);
      queueRef.current.push(...jobs);
      pump();
      return jobs.length;
    },
    [pump]
  );

  const clear = useCallback(() => {
    queueRef.current = [];
    setResults([]);
  }, []);

  return { results, compress, clear };
}
